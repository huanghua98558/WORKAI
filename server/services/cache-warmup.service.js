/**
 * 缓存预热服务
 * 用于在系统启动时预加载热点数据到缓存
 */

const cacheService = require('../lib/cache');
const robotService = require('../services/robot.service');
const { userManager } = require('../database/userManager');
const { getLogger } = require('../lib/logger');

class CacheWarmupService {
  constructor() {
    this.logger = getLogger('CACHE_WARMUP');
    this.warmedUp = false;
  }

  /**
   * 预热机器人列表
   */
  async warmupRobots() {
    try {
      this.logger.info('[缓存预热] 开始预热机器人列表...');

      const robots = await robotService.getAllRobots();

      // 缓存机器人列表（使用与 getAllRobots 相同的缓存键）
      const cacheKey = 'robots:all';
      await cacheService.set(cacheKey, robots, 300);

      this.logger.info('[缓存预热] 机器人列表预热完成', { count: robots.length });

      return robots;
    } catch (error) {
      this.logger.error('[缓存预热] 机器人列表预热失败', { error: error.message });
      return [];
    }
  }

  /**
   * 预热用户列表
   */
  async warmupUsers() {
    try {
      this.logger.info('[缓存预热] 开始预热用户列表...');
      
      const users = await userManager.getUsers({ limit: 100 });
      
      // 批量缓存用户信息
      await Promise.all(
        users.map(user => cacheService.set(`user:${user.id}`, user, 1800))
      );
      
      this.logger.info('[缓存预热] 用户列表预热完成', { count: users.length });
      
      return users;
    } catch (error) {
      this.logger.error('[缓存预热] 用户列表预热失败', { error: error.message });
      return [];
    }
  }

  /**
   * 预热监控数据
   */
  async warmupMonitoringData() {
    try {
      this.logger.info('[缓存预热] 开始预热监控数据...');
      
      // 模拟监控数据（实际应从数据库查询）
      const healthData = {
        executions: {
          total: 0,
          success: 0,
          error: 0,
          processing: 0,
          successRate: '0.00'
        },
        ai: {
          total: 0,
          success: 0,
          error: 0,
          successRate: '0.00'
        },
        sessions: {
          active: 0
        },
        timestamp: new Date().toISOString()
      };
      
      const cacheKey = 'monitoring:health';
      await cacheService.set(cacheKey, healthData, 60);
      
      this.logger.info('[缓存预热] 监控数据预热完成');
      
      return healthData;
    } catch (error) {
      this.logger.error('[缓存预热] 监控数据预热失败', { error: error.message });
      return null;
    }
  }

  /**
   * 预热热门会话消息
   */
  async warmupPopularSessionMessages() {
    try {
      this.logger.info('[缓存预热] 开始预热热门会话消息...');
      
      // 获取最近的会话消息（从数据库查询最近 10 个活跃会话）
      const { getDb } = require('coze-coding-dev-sdk');
      const { sessionMessages } = require('../database/schema');
      const { sql, desc } = require('drizzle-orm');
      
      const db = await getDb();
      
      // 查询最近的 10 个会话
      const sessions = await db
        .select({
          sessionId: sessionMessages.sessionId,
        })
        .from(sessionMessages)
        .orderBy(desc(sessionMessages.timestamp))
        .limit(10);
      
      const uniqueSessions = [...new Set(sessions.map(s => s.sessionId))];
      
      // 预热每个会话的消息列表
      const sessionMessageService = require('./session-message.service');
      let totalMessages = 0;
      
      for (const sessionId of uniqueSessions) {
        const messages = await sessionMessageService.getSessionMessages(sessionId, 50);
        totalMessages += messages.length;
      }
      
      this.logger.info('[缓存预热] 热门会话消息预热完成', {
        sessions: uniqueSessions.length,
        totalMessages
      });
      
      return { sessions: uniqueSessions.length, totalMessages };
    } catch (error) {
      this.logger.error('[缓存预热] 热门会话消息预热失败', { error: error.message });
      return { sessions: 0, totalMessages: 0 };
    }
  }

  /**
   * 执行完整的缓存预热
   */
  async warmup() {
    if (this.warmedUp) {
      this.logger.warn('[缓存预热] 缓存已经预热过，跳过');
      return;
    }

    this.logger.info('[缓存预热] 开始缓存预热...');

    const startTime = Date.now();

    try {
      // 并行预热所有数据
      const results = await Promise.allSettled([
        this.warmupRobots(),
        this.warmupUsers(),
        this.warmupMonitoringData(),
        this.warmupPopularSessionMessages()
      ]);

      // 统计预热结果
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      const duration = Date.now() - startTime;

      this.logger.info('[缓存预热] 缓存预热完成', {
        duration: `${duration}ms`,
        successCount,
        failCount,
        totalTasks: results.length
      });

      this.warmedUp = true;

      return {
        duration,
        successCount,
        failCount,
        totalTasks: results.length,
        results
      };
    } catch (error) {
      this.logger.error('[缓存预热] 缓存预热失败', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * 重置预热状态
   */
  reset() {
    this.warmedUp = false;
    this.logger.info('[缓存预热] 预热状态已重置');
  }

  /**
   * 检查是否已预热
   */
  isWarmedUp() {
    return this.warmedUp;
  }
}

module.exports = new CacheWarmupService();
