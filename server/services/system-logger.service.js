/**
 * 系统日志服务
 * 记录所有系统操作和错误，用于诊断和追踪
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

class SystemLogger {
  constructor() {
    this.logs = [];
    this.maxMemoryLogs = 1000; // 内存中最多保留1000条日志
  }

  /**
   * 记录日志
   * @param {string} level - 日志级别: info, warn, error, debug
   * @param {string} module - 模块名称
   * @param {string} message - 日志消息
   * @param {object} data - 附加数据（可选）
   */
  async log(level, module, message, data = null) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      level,
      module,
      message,
      data,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // 保存到内存
    this.logs.push(logEntry);
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs.shift(); // 删除最早的日志
    }

    // 输出到控制台
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';

    // 对于复杂对象，使用 JSON.stringify 一次性输出，避免逐行输出每个属性
    if (data && typeof data === 'object') {
      console[consoleMethod](`[${level.toUpperCase()}] [${module}] ${message}`, JSON.stringify(data));
    } else if (data) {
      console[consoleMethod](`[${level.toUpperCase()}] [${module}] ${message}`, data);
    } else {
      console[consoleMethod](`[${level.toUpperCase()}] [${module}] ${message}`);
    }

    // 异步保存到数据库
    this.saveToDatabase(logEntry).catch(err => {
      console.error('保存日志到数据库失败:', err);
    });
  }

  /**
   * 保存日志到数据库
   */
  async saveToDatabase(logEntry) {
    try {
      const db = await getDb();

      // 检查是否存在 system_logs 表，如果不存在则创建
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS system_logs (
          id VARCHAR(255) PRIMARY KEY,
          level VARCHAR(20) NOT NULL,
          module VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          environment VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        )
      `);

      // 创建索引
      await db.execute(sql`CREATE INDEX IF NOT EXISTS system_logs_level_idx ON system_logs(level)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS system_logs_module_idx ON system_logs(module)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS system_logs_timestamp_idx ON system_logs(timestamp)`);

      // 插入日志
      await db.execute(sql`
        INSERT INTO system_logs (id, level, module, message, data, timestamp, environment)
        VALUES (${logEntry.id}, ${logEntry.level}, ${logEntry.module}, ${logEntry.message}, ${JSON.stringify(logEntry.data)}, ${logEntry.timestamp}, ${logEntry.environment})
        ON CONFLICT (id) DO NOTHING
      `);
    } catch (error) {
      // 数据库保存失败不应该影响系统运行
      console.error('系统日志服务错误:', error);
    }
  }

  /**
   * 便捷方法：记录信息日志
   */
  info(module, message, data) {
    this.log('info', module, message, data);
  }

  /**
   * 便捷方法：记录警告日志
   */
  warn(module, message, data) {
    this.log('warn', module, message, data);
  }

  /**
   * 便捷方法：记录错误日志
   */
  error(module, message, data) {
    this.log('error', module, message, data);
  }

  /**
   * 便捷方法：记录调试日志
   */
  debug(module, message, data) {
    this.log('debug', module, message, data);
  }

  /**
   * 获取内存中的日志
   */
  getMemoryLogs(limit = 100) {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * 从数据库获取日志
   */
  async getDatabaseLogs(options = {}) {
    try {
      const db = await getDb();

      const {
        level,
        module,
        limit = 100,
        offset = 0,
        startTime,
        endTime
      } = options;

      let query = sql`SELECT * FROM system_logs WHERE 1=1`;
      const params = [];

      if (level) {
        query = sql`${query} AND level = ${level}`;
      }
      if (module) {
        query = sql`${query} AND module = ${module}`;
      }
      if (startTime) {
        query = sql`${query} AND timestamp >= ${startTime}`;
      }
      if (endTime) {
        query = sql`${query} AND timestamp <= ${endTime}`;
      }

      query = sql`${query} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;

      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      console.error('从数据库获取日志失败:', error);
      return [];
    }
  }

  /**
   * 清理旧日志（保留最近30天）
   */
  async cleanup(days = 30) {
    try {
      const db = await getDb();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await db.execute(sql`
        DELETE FROM system_logs
        WHERE timestamp < ${cutoffDate.toISOString()}
      `);

      console.log(`系统日志清理完成，删除 ${result.rowCount || 0} 条记录`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('清理日志失败:', error);
      return 0;
    }
  }

  /**
   * 获取日志统计
   */
  async getStats(days = 7) {
    try {
      const db = await getDb();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.execute(sql`
        SELECT
          level,
          COUNT(*) as count
        FROM system_logs
        WHERE timestamp >= ${startDate.toISOString()}
        GROUP BY level
      `);

      const stats = {
        total: 0,
        info: 0,
        warn: 0,
        error: 0,
        debug: 0
      };

      (result.rows || []).forEach(row => {
        stats[row.level.toLowerCase()] = row.count;
        stats.total += row.count;
      });

      return stats;
    } catch (error) {
      console.error('获取日志统计失败:', error);
      return {
        total: 0,
        info: 0,
        warn: 0,
        error: 0,
        debug: 0
      };
    }
  }
}

module.exports = new SystemLogger();
