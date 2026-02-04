/**
 * 统一日志工具类
 * 提供结构化、可追踪、高性能的日志记录功能
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

// 敏感字段列表，自动过滤
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'apiSecret',
  'accessToken',
  'secret',
  'authorization',
  'cookie'
];

// 日志级别定义
const LOG_LEVELS = {
  DEBUG: { value: 0, color: '\x1b[36m' },    // 青色
  INFO: { value: 1, color: '\x1b[32m' },     // 绿色
  WARN: { value: 2, color: '\x1b[33m' },     // 黄色
  ERROR: { value: 3, color: '\x1b[31m' },    // 红色
  FATAL: { value: 4, color: '\x1b[35m' }     // 紫色
};

class Logger {
  constructor(module) {
    this.module = module;
    this.currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;
    this.requestContext = {};
  }

  /**
   * 设置请求上下文
   */
  setRequestContext(context) {
    this.requestContext = {
      requestId: context.requestId || this.generateRequestId(),
      userId: context.userId,
      sessionId: context.sessionId,
      robotId: context.robotId,
      ip: context.ip,
      userAgent: context.userAgent
    };
  }

  /**
   * 清除请求上下文
   */
  clearRequestContext() {
    this.requestContext = {};
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 过滤敏感信息
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }
    return sanitized;
  }

  /**
   * 记录日志
   */
  async log(level, message, data = null, meta = {}) {
    // 检查日志级别
    const levelConfig = LOG_LEVELS[level.toUpperCase()];
    if (levelConfig.value < this.currentLevel.value) {
      return;
    }

    const timestamp = new Date().toISOString();
    const sanitizedData = data ? this.sanitizeData(data) : null;

    // 构建结构化日志对象
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      module: this.module,
      message,
      data: sanitizedData,
      ...this.requestContext,
      ...meta,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid
    };

    // 输出到控制台
    this.outputToConsole(logEntry, levelConfig.color);

    // 异步保存到数据库
    this.saveToDatabase(logEntry).catch(err => {
      // 日志保存失败不应该影响系统运行，只输出到stderr
      console.error('日志保存失败:', err.message);
    });
  }

  /**
   * 输出到控制台
   */
  outputToConsole(logEntry, color) {
    const reset = '\x1b[0m';
    const { level, timestamp, module, message, requestId } = logEntry;

    // 构建简洁的控制台输出
    const requestIdStr = requestId ? ` [${requestId}]` : '';
    const output = `${color}[${level}]${reset} ${timestamp} [${module}]${requestIdStr} ${message}`;

    if (level === 'ERROR' || level === 'FATAL') {
      console.error(output, logEntry.data || '');
    } else {
      console.log(output, logEntry.data || '');
    }
  }

  /**
   * 保存到数据库
   */
  async saveToDatabase(logEntry) {
    try {
      const db = await getDb();

      // 检查表是否存在
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS system_logs (
          id VARCHAR(64) PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          level VARCHAR(10) NOT NULL,
          module VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          request_id VARCHAR(64),
          user_id VARCHAR(64),
          session_id VARCHAR(64),
          robot_id VARCHAR(64),
          environment VARCHAR(50) NOT NULL,
          pid INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        )
      `);

      // 创建索引
      await db.execute(sql`CREATE INDEX IF NOT EXISTS system_logs_level_idx ON system_logs(level)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS system_logs_module_idx ON system_logs(module)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS system_logs_timestamp_idx ON system_logs(timestamp)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS system_logs_request_id_idx ON system_logs(request_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS system_logs_session_id_idx ON system_logs(session_id)`);

      // 插入日志
      const logId = logEntry.requestId
        ? `${logEntry.requestId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        : `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      await db.execute(sql`
        INSERT INTO system_logs (
          id, timestamp, level, module, message, data,
          request_id, user_id, session_id, robot_id, environment, pid
        ) VALUES (
          ${logId},
          ${logEntry.timestamp},
          ${logEntry.level},
          ${logEntry.module},
          ${logEntry.message},
          ${JSON.stringify(logEntry.data)},
          ${logEntry.requestId || null},
          ${logEntry.userId || null},
          ${logEntry.sessionId || null},
          ${logEntry.robotId || null},
          ${logEntry.environment},
          ${logEntry.pid}
        )
        ON CONFLICT (id) DO NOTHING
      `);
    } catch (error) {
      // 静默失败，避免循环错误
      // console.error('保存日志到数据库失败:', error.message);
    }
  }

  /**
   * 记录性能日志
   */
  async performance(operation, duration, data = null) {
    if (this.currentLevel.value <= LOG_LEVELS.DEBUG.value) {
      await this.log('DEBUG', `${operation} 耗费 ${duration}ms`, data, {
        type: 'performance',
        duration
      });
    }
  }

  /**
   * 记录数据库操作日志
   */
  async database(query, params, duration, success = true, error = null) {
    if (this.currentLevel.value <= LOG_LEVELS.DEBUG.value) {
      await this.log('DEBUG', `数据库查询: ${query.substring(0, 100)}...`, {
        success,
        duration,
        error: error?.message,
        paramsCount: Array.isArray(params) ? params.length : 0
      }, {
        type: 'database',
        operation: query.split(' ')[0]?.toUpperCase()
      });
    }
  }

  /**
   * 记录API调用日志
   */
  async apiCall(method, url, statusCode, duration, success = true, error = null) {
    if (this.currentLevel.value <= LOG_LEVELS.INFO.value) {
      await this.log(success ? 'INFO' : 'WARN', `${method} ${url} - ${statusCode}`, {
        success,
        duration,
        statusCode,
        error: error?.message
      }, {
        type: 'api',
        method,
        url
      });
    }
  }

  // 便捷方法
  async debug(message, data, meta) {
    await this.log('DEBUG', message, data, meta);
  }

  async info(message, data, meta) {
    await this.log('INFO', message, data, meta);
  }

  async warn(message, data, meta) {
    await this.log('WARN', message, data, meta);
  }

  async error(message, data, meta) {
    await this.log('ERROR', message, data, meta);
  }

  async fatal(message, data, meta) {
    await this.log('FATAL', message, data, meta);
  }
}

// 模块日志实例缓存
const loggerInstances = new Map();

/**
 * 获取模块日志实例
 */
function getLogger(module) {
  if (!loggerInstances.has(module)) {
    loggerInstances.set(module, new Logger(module));
  }
  return loggerInstances.get(module);
}

/**
 * Fastify 请求日志中间件
 */
function fastifyRequestLogger(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    // 生成请求ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // 设置请求上下文
    request.logger = getLogger('HTTP');
    request.logger.setRequestContext({
      requestId,
      userId: request.user?.id,
      sessionId: request.sessionId,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    // 记录请求开始
    request.startTime = Date.now();
    request.requestId = requestId;

    request.logger.info(`${request.method} ${request.url}`, {
      query: request.query,
      body: request.body
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - request.startTime;
    const logger = getLogger('HTTP');

    logger.info(`${request.method} ${request.url} - ${reply.statusCode}`, {
      duration,
      success: reply.statusCode < 400
    }, {
      type: 'http',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode
    });

    // 清除请求上下文
    logger.clearRequestContext();
  });

  fastify.addHook('onError', async (request, reply, error) => {
    const duration = Date.now() - request.startTime;
    const logger = getLogger('HTTP');

    logger.error(`${request.method} ${request.url} - Error`, {
      duration,
      error: error.message,
      stack: error.stack
    }, {
      type: 'http',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode
    });
  });
}

/**
 * 数据库查询日志中间件
 */
function databaseQueryLogger(db, module) {
  const logger = getLogger(module);

  const originalQuery = db.query;
  db.query = async function (...args) {
    const startTime = Date.now();
    const query = args[0];

    try {
      const result = await originalQuery.apply(this, args);
      const duration = Date.now() - startTime;

      logger.database(
        typeof query === 'string' ? query : 'Unknown query',
        args[1],
        duration,
        true
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.database(
        typeof query === 'string' ? query : 'Unknown query',
        args[1],
        duration,
        false,
        error
      );

      throw error;
    }
  };
}

module.exports = {
  Logger,
  getLogger,
  fastifyRequestLogger,
  databaseQueryLogger
};
