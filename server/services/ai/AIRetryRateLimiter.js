/**
 * AI服务重试和限流管理器
 * 提供自动重试、限流保护、熔断机制等功能
 */

const { getLogger } = require('../../lib/logger');

const logger = getLogger('AI_RETRY_RATE_LIMITER');

class AIRetryRateLimiter {
  constructor() {
    // 限流存储：providerId -> { count, resetTime }
    this.rateLimitStore = new Map();
    
    // 熔断器状态：modelId -> { isOpen, failureCount, lastFailureTime, resetTime }
    this.circuitBreakerStore = new Map();
    
    // 默认配置
    this.config = {
      // 重试配置
      maxRetries: 3,
      retryDelay: 1000, // 1秒
      retryBackoffMultiplier: 2, // 指数退避倍数
      
      // 限流配置
      rateLimitWindow: 60000, // 1分钟
      defaultRateLimit: 60, // 每分钟60次
      
      // 熔断器配置
      circuitBreakerThreshold: 5, // 连续失败5次触发熔断
      circuitBreakerTimeout: 300000, // 熔断后5分钟尝试恢复
    };
  }

  /**
   * 检查限流
   * @param {string} providerId - 提供商ID
   * @param {number} limit - 限制次数（默认60次/分钟）
   * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
   */
  async checkRateLimit(providerId, limit = this.config.defaultRateLimit) {
    const now = Date.now();
    const key = providerId;

    let record = this.rateLimitStore.get(key);

    // 如果记录不存在或已过期，创建新记录
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.rateLimitWindow
      };
      this.rateLimitStore.set(key, record);
    }

    // 检查是否超过限制
    if (record.count >= limit) {
      logger.warn('限流触发', { providerId, count: record.count, limit });
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }

    // 增加计数
    record.count++;
    this.rateLimitStore.set(key, record);

    return {
      allowed: true,
      remaining: limit - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * 检查熔断器
   * @param {string} modelId - 模型ID
   * @returns {{isOpen: boolean, reason?: string}}
   */
  checkCircuitBreaker(modelId) {
    const now = Date.now();
    const breaker = this.circuitBreakerStore.get(modelId);

    if (!breaker) {
      return { isOpen: false };
    }

    // 如果熔断器打开，检查是否可以尝试恢复
    if (breaker.isOpen) {
      if (now > breaker.resetTime) {
        // 熔断器冷却时间结束，允许一次尝试
        logger.info('熔断器尝试恢复', { modelId });
        breaker.isOpen = false;
        breaker.failureCount = 0;
        this.circuitBreakerStore.set(modelId, breaker);
        return { isOpen: false };
      }
      return {
        isOpen: true,
        reason: `熔断器已打开，将在${Math.ceil((breaker.resetTime - now) / 1000)}秒后尝试恢复`
      };
    }

    return { isOpen: false };
  }

  /**
   * 记录成功
   * @param {string} modelId - 模型ID
   */
  recordSuccess(modelId) {
    const breaker = this.circuitBreakerStore.get(modelId);
    if (breaker && breaker.failureCount > 0) {
      breaker.failureCount = 0;
      breaker.isOpen = false;
      this.circuitBreakerStore.set(modelId, breaker);
      logger.info('熔断器重置', { modelId });
    }
  }

  /**
   * 记录失败
   * @param {string} modelId - 模型ID
   */
  recordFailure(modelId) {
    const now = Date.now();
    let breaker = this.circuitBreakerStore.get(modelId);

    if (!breaker) {
      breaker = {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        resetTime: 0
      };
    }

    breaker.failureCount++;
    breaker.lastFailureTime = now;

    // 检查是否达到熔断阈值
    if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
      breaker.isOpen = true;
      breaker.resetTime = now + this.config.circuitBreakerTimeout;
      logger.error('熔断器触发', {
        modelId,
        failureCount: breaker.failureCount,
        resetTime: new Date(breaker.resetTime)
      });
    }

    this.circuitBreakerStore.set(modelId, breaker);
  }

  /**
   * 带重试的函数执行
   * @param {Function} fn - 要执行的函数
   * @param {Object} options - 配置选项
   * @param {number} options.maxRetries - 最大重试次数
   * @param {number} options.retryDelay - 重试延迟（毫秒）
   * @param {Function} options.shouldRetry - 判断是否应该重试的函数
   * @returns {Promise<any>}
   */
  async executeWithRetry(fn, options = {}) {
    const {
      maxRetries = this.config.maxRetries,
      retryDelay = this.config.retryDelay,
      retryBackoffMultiplier = this.config.retryBackoffMultiplier,
      shouldRetry = (error) => true
    } = options;

    let lastError;
    let currentDelay = retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;

        // 检查是否应该重试
        if (attempt === maxRetries || !shouldRetry(error)) {
          logger.error('重试失败，放弃重试', {
            attempt,
            maxRetries,
            error: error.message
          });
          throw error;
        }

        logger.warn(`执行失败，${currentDelay}ms后重试`, {
          attempt,
          maxRetries,
          error: error.message
        });

        // 等待后重试
        await this.sleep(currentDelay);
        currentDelay *= retryBackoffMultiplier;
      }
    }

    throw lastError;
  }

  /**
   * 带限流和熔断的函数执行
   * @param {string} providerId - 提供商ID
   * @param {string} modelId - 模型ID
   * @param {Function} fn - 要执行的函数
   * @param {Object} options - 配置选项
   * @returns {Promise<any>}
   */
  async executeWithProtection(providerId, modelId, fn, options = {}) {
    // 检查限流
    const rateLimitResult = await this.checkRateLimit(
      providerId,
      options.rateLimit
    );

    if (!rateLimitResult.allowed) {
      const error = new Error(
        `限流保护：当前提供商已达到调用限制，请在${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)}秒后重试`
      );
      error.code = 'RATE_LIMIT_EXCEEDED';
      throw error;
    }

    // 检查熔断器
    const circuitBreakerResult = this.checkCircuitBreaker(modelId);

    if (circuitBreakerResult.isOpen) {
      const error = new Error(
        `熔断保护：${circuitBreakerResult.reason}`
      );
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }

    try {
      // 执行函数
      const result = await this.executeWithRetry(fn, options);
      this.recordSuccess(modelId);
      return result;
    } catch (error) {
      this.recordFailure(modelId);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    const stats = {
      rateLimit: {},
      circuitBreaker: {}
    };

    // 限流统计
    for (const [key, record] of this.rateLimitStore.entries()) {
      stats.rateLimit[key] = {
        count: record.count,
        remaining: Math.max(0, this.config.defaultRateLimit - record.count),
        resetTime: new Date(record.resetTime)
      };
    }

    // 熔断器统计
    for (const [key, breaker] of this.circuitBreakerStore.entries()) {
      stats.circuitBreaker[key] = {
        isOpen: breaker.isOpen,
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime ? new Date(breaker.lastFailureTime) : null,
        resetTime: breaker.resetTime ? new Date(breaker.resetTime) : null
      };
    }

    return stats;
  }

  /**
   * 清理过期记录
   */
  cleanup() {
    const now = Date.now();

    // 清理过期的限流记录
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }

    // 清理过期的熔断器记录
    for (const [key, breaker] of this.circuitBreakerStore.entries()) {
      if (!breaker.isOpen && now > breaker.lastFailureTime + this.config.circuitBreakerTimeout) {
        this.circuitBreakerStore.delete(key);
      }
    }

    logger.info('清理过期记录完成');
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
const retryRateLimiter = new AIRetryRateLimiter();

// 定期清理过期记录（每5分钟）
setInterval(() => {
  retryRateLimiter.cleanup();
}, 5 * 60 * 1000);

module.exports = retryRateLimiter;
