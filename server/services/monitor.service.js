/**
 * 监控服务
 * 负责系统、群、用户、AI 的监控指标
 */

const redisClient = require('../lib/redis');
const { formatDate } = require('../lib/utils');

class MonitorService {
  constructor() {
    // 不再在构造函数中获取客户端
  }

  /**
   * 获取 Redis 客户端
   */
  async getRedis() {
    return await redisClient.getClient();
  }

  /**
   * 记录系统指标
   */
  async recordSystemMetric(metric, value, tags = {}) {
    const redis = await this.getRedis();
    const key = `metrics:system:${metric}:${formatDate()}`;
    await redis.lpush(key, JSON.stringify({
      value,
      tags,
      timestamp: Date.now()
    }));
    await redis.expire(key, 30 * 24 * 3600); // 保留30天
  }

  /**
   * 记录群指标
   */
  async recordGroupMetric(groupId, metric, value) {
    const redis = await this.getRedis();
    const key = `metrics:group:${groupId}:${metric}:${formatDate()}`;
    await redis.lpush(key, JSON.stringify({
      value,
      timestamp: Date.now()
    }));
    await redis.expire(key, 30 * 24 * 3600);
  }

  /**
   * 记录用户指标
   */
  async recordUserMetric(userId, groupId, metric, value) {
    const redis = await this.getRedis();
    const key = `metrics:user:${userId}:${groupId}:${metric}:${formatDate()}`;
    await redis.lpush(key, JSON.stringify({
      value,
      timestamp: Date.now()
    }));
    await redis.expire(key, 30 * 24 * 3600);
  }

  /**
   * 记录 AI 指标
   */
  async recordAIMetric(aiProvider, metric, value, success = true) {
    const redis = await this.getRedis();
    const key = `metrics:ai:${aiProvider}:${metric}:${formatDate()}`;
    await redis.lpush(key, JSON.stringify({
      value,
      success,
      timestamp: Date.now()
    }));
    await redis.expire(key, 30 * 24 * 3600);
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(metric, date = formatDate()) {
    const redis = await this.getRedis();
    const key = `metrics:system:${metric}:${date}`;
    const records = await redis.lrange(key, 0, -1);
    
    return records.map(r => JSON.parse(r));
  }

  /**
   * 获取群指标
   */
  async getGroupMetrics(groupId, metric, date = formatDate()) {
    const redis = await this.getRedis();
    const key = `metrics:group:${groupId}:${metric}:${date}`;
    const records = await redis.lrange(key, 0, -1);
    
    return records.map(r => JSON.parse(r));
  }

  /**
   * 获取用户指标
   */
  async getUserMetrics(userId, groupId, metric, date = formatDate()) {
    const redis = await this.getRedis();
    const key = `metrics:user:${userId}:${groupId}:${metric}:${date}`;
    const records = await redis.lrange(key, 0, -1);
    
    return records.map(r => JSON.parse(r));
  }

  /**
   * 获取 AI 指标
   */
  async getAIMetrics(aiProvider, metric, date = formatDate()) {
    const redis = await this.getRedis();
    const key = `metrics:ai:${aiProvider}:${metric}:${date}`;
    const records = await redis.lrange(key, 0, -1);
    
    const parsed = records.map(r => JSON.parse(r));
    const total = parsed.length;
    const success = parsed.filter(r => r.success).length;
    const failure = total - success;
    
    return {
      total,
      success,
      failure,
      successRate: total > 0 ? (success / total * 100).toFixed(2) : 0,
      records: parsed
    };
  }

  /**
   * 获取今日监控摘要
   */
  async getTodaySummary() {
    const today = formatDate();

    // 系统指标
    const systemMetrics = {};
    const systemMetricNames = ['callback_received', 'callback_processed', 'callback_error', 'ai_requests', 'ai_errors'];
    
    for (const metric of systemMetricNames) {
      const records = await this.getSystemMetrics(metric, today);
      systemMetrics[metric] = records.length;
    }

    // AI 指标
    const aiProviders = ['intentRecognition', 'serviceReply', 'chat', 'report'];
    const aiMetrics = {};
    
    for (const provider of aiProviders) {
      aiMetrics[provider] = await this.getAIMetrics(provider, 'requests', today);
    }

    return {
      date: today,
      system: systemMetrics,
      ai: aiMetrics,
      summary: {
        totalCallbacks: systemMetrics.callback_received || 0,
        successRate: systemMetrics.callback_processed 
          ? ((systemMetrics.callback_processed / (systemMetrics.callback_received || 1)) * 100).toFixed(2)
          : 0,
        aiSuccessRate: aiMetrics.intentRecognition?.successRate || 0
      }
    };
  }

  /**
   * 获取群活跃度排行
   */
  async getTopActiveGroups(date = formatDate(), limit = 10) {
    const redis = await this.getRedis();
    const pattern = `metrics:group:*:messages:${date}`;
    const keys = await redis.keys(pattern);
    
    const groupStats = [];
    
    for (const key of keys) {
      const records = await redis.lrange(key, 0, -1);
      const groupId = key.split(':')[2];
      const totalMessages = records.length;
      
      if (totalMessages > 0) {
        groupStats.push({
          groupId,
          totalMessages,
          records: records.map(r => JSON.parse(r))
        });
      }
    }

    return groupStats
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, limit);
  }

  /**
   * 获取用户活跃度排行
   */
  async getTopActiveUsers(date = formatDate(), limit = 10) {
    const redis = await this.getRedis();
    const pattern = `metrics:user:*:*:messages:${date}`;
    const keys = await redis.keys(pattern);
    
    const userStats = new Map();
    
    for (const key of keys) {
      const parts = key.split(':');
      const userId = parts[2];
      const groupId = parts[3];
      const records = await redis.lrange(key, 0, -1);
      
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userId,
          groups: new Set(),
          totalMessages: 0
        });
      }
      
      const stat = userStats.get(userId);
      stat.groups.add(groupId);
      stat.totalMessages += records.length;
    }

    return Array.from(userStats.values())
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, limit)
      .map(stat => ({
        ...stat,
        groups: Array.from(stat.groups)
      }));
  }

  /**
   * 记录机器人指标
   */
  async recordRobotMetric(robotId, metric, value, tags = {}) {
    const redis = await this.getRedis();
    const key = `metrics:robot:${robotId}:${metric}:${formatDate()}`;
    await redis.lpush(key, JSON.stringify({
      value,
      tags,
      timestamp: Date.now()
    }));
    await redis.expire(key, 30 * 24 * 3600); // 保留30天
  }

  /**
   * 获取机器人指标
   */
  async getRobotMetrics(robotId, metric, date = formatDate()) {
    const redis = await this.getRedis();
    const key = `metrics:robot:${robotId}:${metric}:${date}`;
    const records = await redis.lrange(key, 0, -1);
    
    return records.map(r => JSON.parse(r));
  }

  /**
   * 获取所有机器人状态摘要
   */
  async getRobotsSummary() {
    const redis = await this.getRedis();
    const today = formatDate();
    
    // 获取所有机器人的消息处理统计
    const pattern = `metrics:robot:*:messages:${today}`;
    const keys = await redis.keys(pattern);
    
    const robotsStats = [];
    
    for (const key of keys) {
      const robotId = key.split(':')[2];
      const records = await redis.lrange(key, 0, -1);
      
      // 统计各种指标
      const messagesProcessed = records.length;
      const errors = records.filter(r => r.tags?.error).length;
      
      robotsStats.push({
        robotId,
        messagesProcessed,
        errors,
        successRate: messagesProcessed > 0 ? ((messagesProcessed - errors) / messagesProcessed * 100).toFixed(2) : 100
      });
    }
    
    return robotsStats;
  }

  /**
   * 清理过期指标
   */
  async cleanupOldMetrics(daysToKeep = 30) {
    const redis = await this.getRedis();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = formatDate(cutoffDate);

    const patterns = [
      'metrics:system:*',
      'metrics:group:*',
      'metrics:user:*',
      'metrics:ai:*',
      'metrics:robot:*'
    ];

    let deletedCount = 0;

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      
      for (const key of keys) {
        const keyParts = key.split(':');
        const keyDate = keyParts[keyParts.length - 1];
        
        if (keyDate < cutoff) {
          await redis.del(key);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }
}

module.exports = new MonitorService();
