/**
 * 执行结果追踪服务
 * 记录每个消息处理的完整流程和执行结果
 */

const redisClient = require('../lib/redis');

class ExecutionTrackerService {
  constructor() {
    this.redis = null;
    this.init();
  }

  async init() {
    this.redis = await redisClient.getClient();
  }

  /**
   * 开始处理追踪
   */
  startProcessing(context) {
    const processingId = `process:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
    
    const processingData = {
      processingId,
      robotId: context.robotId,
      messageData: context.messageData,
      startTime: context.startTime,
      status: 'processing',
      steps: {},
      completedAt: null,
      error: null
    };

    // 使用 Redis 存储处理数据，保留7天
    this.redis.setex(
      `execution:${processingId}`,
      7 * 24 * 3600,
      JSON.stringify(processingData)
    );

    // 添加到最近记录列表（保留最近100条）
    this.redis.lpush('execution:recent', processingId);
    this.redis.ltrim('execution:recent', 0, 99);

    // 更新统计
    this.redis.incr('execution:stats:total');

    return processingId;
  }

  /**
   * 更新处理步骤
   */
  updateStep(processingId, stepName, stepData) {
    this.redis.hget(`execution:${processingId}`, 'value', (err, data) => {
      if (err || !data) return;

      const processing = JSON.parse(data);
      processing.steps[stepName] = {
        ...stepData,
        timestamp: new Date().toISOString()
      };

      this.redis.setex(
        `execution:${processingId}`,
        7 * 24 * 3600,
        JSON.stringify(processing)
      );
    });
  }

  /**
   * 完成处理
   */
  completeProcessing(processingId, result) {
    this.redis.get(`execution:${processingId}`, (err, data) => {
      if (err || !data) return;

      const processing = JSON.parse(data);
      processing.status = result.status || 'completed';
      processing.completedAt = new Date().toISOString();
      processing.error = result.error || null;
      processing.decision = result.decision || null;
      processing.processingTime = result.processingTime || 0;

      // 更新统计
      if (result.status === 'success') {
        this.redis.incr('execution:stats:success');
        
        if (result.decision?.action === 'auto_reply') {
          this.redis.incr('execution:stats:auto_reply');
        } else if (result.decision?.action === 'none') {
          this.redis.incr('execution:stats:none');
        } else if (result.decision?.action === 'human_takeover') {
          this.redis.incr('execution:stats:human_takeover');
        }
      } else {
        this.redis.incr('execution:stats:error');
      }

      this.redis.setex(
        `execution:${processingId}`,
        7 * 24 * 3600,
        JSON.stringify(processing)
      );
    });
  }

  /**
   * 获取处理详情
   */
  async getProcessingDetail(processingId) {
    return new Promise((resolve, reject) => {
      this.redis.get(`execution:${processingId}`, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        if (!data) {
          resolve(null);
          return;
        }

        resolve(JSON.parse(data));
      });
    });
  }

  /**
   * 获取最近处理记录
   */
  async getRecentRecords(limit = 50) {
    return new Promise((resolve, reject) => {
      this.redis.lrange('execution:recent', 0, limit - 1, async (err, processingIds) => {
        if (err) {
          reject(err);
          return;
        }

        if (!processingIds || processingIds.length === 0) {
          resolve([]);
          return;
        }

        // 批量获取处理详情
        const promises = processingIds.map(id => this.getProcessingDetail(id));
        const results = await Promise.all(promises);

        // 过滤掉 null 并按时间排序
        const records = results
          .filter(r => r !== null)
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        resolve(records);
      });
    });
  }

  /**
   * 获取统计数据
   */
  async getStats(timeRange = '24h') {
    return new Promise((resolve, reject) => {
      this.redis.mget(
        [
          'execution:stats:total',
          'execution:stats:success',
          'execution:stats:error',
          'execution:stats:auto_reply',
          'execution:stats:none',
          'execution:stats:human_takeover'
        ],
        (err, values) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            total: parseInt(values[0]) || 0,
            success: parseInt(values[1]) || 0,
            error: parseInt(values[2]) || 0,
            autoReply: parseInt(values[3]) || 0,
            none: parseInt(values[4]) || 0,
            humanTakeover: parseInt(values[5]) || 0,
            successRate: values[0] ? ((parseInt(values[1]) / parseInt(values[0])) * 100).toFixed(2) : '0'
          });
        }
      );
    });
  }

  /**
   * 搜索处理记录
   */
  async searchRecords(query, limit = 20) {
    const records = await this.getRecentRecords(200); // 获取更多记录进行搜索

    const searchTerms = query.toLowerCase().split(/\s+/);

    return records
      .filter(record => {
        const content = JSON.stringify(record).toLowerCase();
        return searchTerms.every(term => content.includes(term));
      })
      .slice(0, limit);
  }

  /**
   * 清理过期数据
   */
  async cleanup(days = 7) {
    // Redis 会自动清理过期数据，这里只是占位
    console.log(`执行结果追踪数据保留 ${days} 天，自动清理`);
  }
}

module.exports = new ExecutionTrackerService();
