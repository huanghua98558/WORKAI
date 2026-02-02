/**
 * 工具函数库
 */

/**
 * 日志工具
 */
const logger = {
  info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
  error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
  debug: (message, ...args) => console.log(`[DEBUG] ${message}`, ...args)
};

/**
 * 验证 WorkTool 回调签名
 */
function verifySignature(payload, signature, secret) {
  const crypto = require('crypto');
  
  if (!secret || !signature) {
    console.warn('⚠️  签名校验未配置，跳过验证');
    return true;
  }

  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return computedSignature === signature;
}

/**
 * 生成请求 ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 睡眠函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    onRetry = () => {}
  } = options;

  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay * (i + 1));
        onRetry(i + 1, error);
      }
    }
  }

  throw lastError;
}

/**
 * 格式化日期
 */
function formatDate(date = new Date()) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * 格式化时间
 */
function formatTime(date = new Date()) {
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').split('.')[0];
}

/**
 * 幂等性检查
 */
class IdempotencyChecker {
  constructor(redis) {
    this.redis = redis;
    this.ttl = 3600; // 1小时过期
  }

  async check(key) {
    const idempotencyKey = `idempotency:${key}`;
    const redisClient = await this.redis; // 确保 redis 已初始化
    const exists = await redisClient.exists(idempotencyKey);
    
    if (exists) {
      return false; // 已处理过，拒绝重复
    }

    await redisClient.setex(idempotencyKey, this.ttl, '1');
    return true; // 首次处理
  }

  async clear(key) {
    const idempotencyKey = `idempotency:${key}`;
    const redisClient = await this.redis; // 确保 redis 已初始化
    await redisClient.del(idempotencyKey);
  }
}

/**
 * 熔断器
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.state = 'closed'; // closed, open, half-open
    this.failures = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
    this.monitoringStartTime = Date.now();
  }

  async execute(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'half-open';
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }

  reset() {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
  }
}

/**
 * 审计日志
 */
class AuditLogger {
  constructor(redis) {
    this.redis = redis;
    this.keyPrefix = 'audit:';
    this.retentionDays = 30;
  }

  async log(action, actor, details = {}) {
    const logEntry = {
      id: generateRequestId(),
      timestamp: new Date().toISOString(),
      action,
      actor,
      details
    };

    const key = `${this.keyPrefix}${formatDate()}`;
    const redisClient = await this.redis; // 确保 redis 已初始化
    await redisClient.lpush(key, JSON.stringify(logEntry));
    await redisClient.expire(key, this.retentionDays * 24 * 3600);

    return logEntry;
  }

  async query(filters = {}, limit = 100) {
    const redisClient = await this.redis; // 确保 redis 已初始化
    const keys = await redisClient.keys(`${this.keyPrefix}*`);
    const logs = [];

    for (const key of keys.slice(0, 10)) { // 限制查询最近10天
      const entries = await redisClient.lrange(key, 0, limit);
      for (const entry of entries) {
        const log = JSON.parse(entry);
        if (this.matchFilters(log, filters)) {
          logs.push(log);
        }
      }
    }

    return logs.slice(0, limit);
  }

  matchFilters(log, filters) {
    if (filters.action && log.action !== filters.action) return false;
    if (filters.actor && log.actor !== filters.actor) return false;
    if (filters.startTime && new Date(log.timestamp) < new Date(filters.startTime)) return false;
    if (filters.endTime && new Date(log.timestamp) > new Date(filters.endTime)) return false;
    return true;
  }
}

module.exports = {
  logger,
  verifySignature,
  generateRequestId,
  sleep,
  retry,
  formatDate,
  formatTime,
  IdempotencyChecker,
  CircuitBreaker,
  AuditLogger
};
