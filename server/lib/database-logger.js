/**
 * 数据库日志中间件
 * 自动记录所有数据库查询的耗时和错误
 */

const { getLogger } = require('./logger');

/**
 * 为 Drizzle 数据库实例添加日志功能
 */
function setupDatabaseLogger(db, moduleName = 'DATABASE') {
  const logger = getLogger(moduleName);

  // 保存原始的 execute 方法
  const originalExecute = db.execute.bind(db);

  // 重写 execute 方法
  db.execute = async function (...args) {
    const startTime = Date.now();
    const query = args[0];

    try {
      const result = await originalExecute(...args);
      const duration = Date.now() - startTime;

      // 只记录耗时超过 100ms 的查询
      if (duration > 100) {
        logger.debug('数据库查询（慢查询）', {
          query: typeof query === 'string' ? query.substring(0, 200) : 'Unknown query',
          duration,
          rowsAffected: result?.rowCount || result?.rows?.length || 0
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('数据库查询失败', {
        query: typeof query === 'string' ? query.substring(0, 200) : 'Unknown query',
        duration,
        error: error.message,
        code: error.code
      });

      throw error;
    }
  };

  return db;
}

/**
 * 为数据库操作添加性能监控
 */
class DatabaseMonitor {
  constructor(moduleName = 'DATABASE') {
    this.logger = getLogger(moduleName);
    this.queryStats = new Map();
    this.slowQueryThreshold = 100; // 100ms
  }

  /**
   * 记录查询统计
   */
  recordQuery(queryType, duration, success = true) {
    if (!this.queryStats.has(queryType)) {
      this.queryStats.set(queryType, {
        count: 0,
        successCount: 0,
        failCount: 0,
        totalTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }

    const stats = this.queryStats.get(queryType);
    stats.count++;
    stats.totalTime += duration;

    if (success) {
      stats.successCount++;
    } else {
      stats.failCount++;
    }

    if (duration > stats.maxTime) {
      stats.maxTime = duration;
    }

    if (duration < stats.minTime) {
      stats.minTime = duration;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const result = {};

    for (const [queryType, stats] of this.queryStats.entries()) {
      result[queryType] = {
        ...stats,
        avgTime: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
        successRate: stats.count > 0 ? Math.round((stats.successCount / stats.count) * 100) : 0
      };
    }

    return result;
  }

  /**
   * 记录并监控数据库操作
   */
  async monitor(queryFn, queryType) {
    const startTime = Date.now();
    let success = false;
    let error = null;

    try {
      const result = await queryFn();
      success = true;

      const duration = Date.now() - startTime;

      // 记录统计
      this.recordQuery(queryType, duration, success);

      // 慢查询警告
      if (duration > this.slowQueryThreshold) {
        this.logger.warn('检测到慢查询', {
          queryType,
          duration,
          threshold: this.slowQueryThreshold
        });
      }

      return result;
    } catch (err) {
      success = false;
      error = err;
      const duration = Date.now() - startTime;

      // 记录统计
      this.recordQuery(queryType, duration, success);

      this.logger.error('数据库操作失败', {
        queryType,
        duration,
        error: err.message,
        code: err.code
      });

      throw err;
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.queryStats.clear();
    this.logger.info('数据库统计信息已重置');
  }

  /**
   * 打印统计信息
   */
  async logStats() {
    const stats = this.getStats();

    if (Object.keys(stats).length === 0) {
      this.logger.info('暂无数据库统计信息');
      return;
    }

    this.logger.info('数据库查询统计', { stats });
  }
}

module.exports = {
  setupDatabaseLogger,
  DatabaseMonitor
};
