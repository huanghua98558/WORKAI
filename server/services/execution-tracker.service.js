/**
 * 执行结果追踪服务
 * 记录每个消息处理的完整流程和执行结果
 */

const redisClient = require('../lib/redis');
const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

class ExecutionTrackerService {
  constructor() {
    this.redis = null;
    this.init();
  }

  async init() {
    this.redis = await redisClient.getClient();
  }

  /**
   * 获取数据库实例
   */
  async getDb() {
    return await getDb();
  }

  /**
   * 开始处理追踪
   */
  async startProcessing(context) {
    await this.init(); // 确保 Redis 已初始化

    const processingId = `process:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;

    // 确保 startTime 是 ISO 字符串格式
    const startTimeIso = context.startTime
      ? (typeof context.startTime === 'number' ? new Date(context.startTime).toISOString() : context.startTime)
      : new Date().toISOString();

    const processingData = {
      processingId,
      robotId: context.robotId,
      messageData: context.messageData,
      startTime: startTimeIso,
      status: 'processing',
      steps: {},
      completedAt: null,
      error: null
    };

    // 使用 Redis 存储处理数据，保留7天
    await this.redis.setex(
      `execution:${processingId}`,
      7 * 24 * 3600,
      JSON.stringify(processingData)
    );

    // 添加到最近记录列表（保留最近100条）
    await this.redis.lpush('execution:recent', processingId);
    await this.redis.ltrim('execution:recent', 0, 99);

    // 更新统计
    await this.redis.incr('execution:stats:total');

    // 【新增】同步写入数据库
    try {
      const db = await this.getDb();

      await db.execute(sql`
        INSERT INTO execution_tracking
        (id, processing_id, robot_id, session_id, message_id, user_id, group_id, status, steps, start_time, created_at)
        VALUES (${processingId}, ${processingId}, ${context.robotId || null}, ${context.sessionId || (context.messageData?.FromUserName) || 'unknown'}, ${context.messageData?.MsgId || null}, ${context.messageData?.FromUserName || null}, ${context.messageData?.ToUserName || null}, 'processing', '{}'::jsonb, ${startTimeIso}, ${startTimeIso})
      `);

      console.log(`[执行追踪] 数据库记录已创建: ${processingId}`);
    } catch (error) {
      console.error(`[执行追踪] 数据库写入失败:`, error);
      // 不抛出错误，以免影响主流程
    }

    return processingId;
  }

  /**
   * 更新处理步骤
   */
  async updateStep(processingId, stepName, stepData) {
    const data = await this.redis.get(`execution:${processingId}`);
    if (!data) return;

    const processing = JSON.parse(data);
    processing.steps[stepName] = {
      ...stepData,
      timestamp: new Date().toISOString()
    };

    await this.redis.setex(
      `execution:${processingId}`,
      7 * 24 * 3600,
      JSON.stringify(processing)
    );
  }

  /**
   * 完成处理
   */
  async completeProcessing(processingId, result) {
    const data = await this.redis.get(`execution:${processingId}`);
    if (!data) return;

    const processing = JSON.parse(data);
    processing.status = result.status || 'completed';
    processing.completedAt = new Date().toISOString();
    processing.error = result.error || null;
    processing.decision = result.decision || null;
    processing.processingTime = result.processingTime || 0;

    console.log(`[执行追踪] 完成处理: ${processingId}, processingTime: ${processing.processingTime}ms, status: ${processing.status}`);

    // 更新统计
    if (result.status === 'success') {
      await this.redis.incr('execution:stats:success');

      if (result.decision?.action === 'auto_reply') {
        await this.redis.incr('execution:stats:auto_reply');
      } else if (result.decision?.action === 'none') {
        await this.redis.incr('execution:stats:none');
      } else if (result.decision?.action === 'human_takeover') {
        await this.redis.incr('execution:stats:human_takeover');
      }
    } else {
      await this.redis.incr('execution:stats:error');
    }

    await this.redis.setex(
      `execution:${processingId}`,
      7 * 24 * 3600,
      JSON.stringify(processing)
    );

    // 【新增】同步更新数据库
    try {
      const db = await this.getDb();

      // 确定最终状态
      const finalStatus = result.status === 'success' ? 'completed' :
                          result.status === 'error' ? 'failed' :
                          'processing';

      await db.execute(sql`
        UPDATE execution_tracking
        SET
          status = ${finalStatus},
          steps = ${JSON.stringify(processing.steps || {})}::jsonb,
          end_time = ${processing.completedAt},
          processing_time = ${processing.processingTime || 0},
          decision = ${JSON.stringify(processing.decision || {})}::jsonb,
          error_message = ${processing.error || null},
          error_stack = null
        WHERE processing_id = ${processingId}
      `);

      console.log(`[执行追踪] 数据库记录已更新: ${processingId}, status: ${finalStatus}`);
    } catch (error) {
      console.error(`[执行追踪] 数据库更新失败:`, error);
      // 不抛出错误，以免影响主流程
    }
  }

  /**
   * 获取处理详情
   */
  async getProcessingDetail(processingId) {
    const data = await this.redis.get(`execution:${processingId}`);
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  }

  /**
   * 获取最近处理记录
   */
  async getRecentRecords(limit = 50) {
    const processingIds = await this.redis.lrange('execution:recent', 0, limit - 1);
    
    if (!processingIds || processingIds.length === 0) {
      return [];
    }

    // 批量获取处理详情
    const promises = processingIds.map(id => this.getProcessingDetail(id));
    const results = await Promise.all(promises);

    // 过滤掉 null 并按时间排序
    const records = results
      .filter(r => r !== null)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return records;
  }

  /**
   * 获取统计数据
   */
  async getStats(timeRange = '24h') {
    const values = await this.redis.mget(
      [
        'execution:stats:total',
        'execution:stats:success',
        'execution:stats:error',
        'execution:stats:auto_reply',
        'execution:stats:none',
        'execution:stats:human_takeover'
      ]
    );

    return {
      total: parseInt(values[0]) || 0,
      success: parseInt(values[1]) || 0,
      error: parseInt(values[2]) || 0,
      autoReply: parseInt(values[3]) || 0,
      none: parseInt(values[4]) || 0,
      humanTakeover: parseInt(values[5]) || 0,
      successRate: values[0] ? ((parseInt(values[1]) / parseInt(values[0])) * 100).toFixed(2) : '0'
    };
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
