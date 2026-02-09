/**
 * 监控服务（简化版）
 * 专注于从数据库查询实际存在的数据
 */

const redisClient = require('../lib/redis');
const { formatDate } = require('../lib/utils');
const { getDb } = require('coze-coding-dev-sdk');
const {
  sessions,
  sessionMessages,
  robots,
  ai_io_logs,
  flowDefinitions
} = require('../database/schema');
const { desc, sql } = require('drizzle-orm');

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
   * 获取今日汇总数据（从数据库）
   */
  async getTodaySummary() {
    try {
      const db = await getDb();

      // 1. 获取会话统计
      const sessionsData = await db
        .select({
          total: sql`COUNT(*)`,
          auto: sql`COUNT(*) FILTER (WHERE status = 'auto')`,
          human: sql`COUNT(*) FILTER (WHERE status = 'human')`,
          pending: sql`COUNT(*) FILTER (WHERE status = 'pending')`
        })
        .from(sessions);

      const sessionStats = sessionsData[0] || { total: 0, auto: 0, human: 0, pending: 0 };

      // 2. 获取消息统计
      const messagesData = await db
        .select({
          total: sql`COUNT(*)`,
          user: sql`COUNT(*) FILTER (WHERE is_from_user = true)`,
          robot: sql`COUNT(*) FILTER (WHERE is_from_bot = true)`
        })
        .from(sessionMessages);

      const messageStats = messagesData[0] || { total: 0, user: 0, robot: 0 };

      // 3. 获取机器人统计
      const robotsData = await db
        .select({
          total: sql`COUNT(*)`,
          active: sql`COUNT(*) FILTER (WHERE is_active = true)`
        })
        .from(robots);

      const robotStats = robotsData[0] || { total: 0, active: 0 };

      // 4. 获取AI日志统计
      const aiData = await db
        .select({
          total: sql`COUNT(*)`,
          success: sql`COUNT(*) FILTER (WHERE status = 'success')`,
          error: sql`COUNT(*) FILTER (WHERE status = 'error')`
        })
        .from(ai_io_logs);

      const aiStats = aiData[0] || { total: 0, success: 0, error: 0 };

      // 5. 获取流程定义统计
      const flowData = await db
        .select({
          total: sql`COUNT(*)`,
          active: sql`COUNT(*) FILTER (WHERE is_active = true)`
        })
        .from(flowDefinitions);

      const flowStats = flowData[0] || { total: 0, active: 0 };

      // 6. 计算成功率
      const aiSuccessRate = aiStats.total > 0
        ? (aiStats.success / aiStats.total * 100).toFixed(2)
        : '0';

      // 7. 意图分布
      const intentStats = await db
        .select({
          intent: sessionMessages.intent,
          count: sql`COUNT(*)`
        })
        .from(sessionMessages)
        .groupBy(sessionMessages.intent);

      const intentDistribution = intentStats.reduce((acc, curr) => {
        acc[curr.intent] = curr.count;
        return acc;
      }, {});

      return {
        date: formatDate(),
        system: {
          sessions_total: sessionStats.total,
          sessions_active: sessionStats.auto,
          sessions_human: sessionStats.human,
          sessions_pending: sessionStats.pending,
          messages_total: messageStats.total,
          messages_user: messageStats.user,
          messages_robot: messageStats.robot,
          robots_total: robotStats.total,
          robots_active: robotStats.active,
          flows_total: flowStats.total,
          flows_active: flowStats.active
        },
        ai: {
          intentRecognition: { successRate: aiSuccessRate, total: aiStats.total },
          serviceReply: { successRate: aiSuccessRate, total: aiStats.total },
          chat: { successRate: aiSuccessRate, total: aiStats.total },
          total: aiStats.total,
          success: aiStats.success,
          error: aiStats.error,
          successRate: aiSuccessRate
        },
        summary: {
          totalSessions: sessionStats.total,
          totalMessages: messageStats.total,
          totalRobots: robotStats.total,
          aiSuccessRate: aiSuccessRate,
          activeRobots: robotStats.active,
          activeFlows: flowStats.active
        },
        details: {
          sessions: sessionStats,
          messages: messageStats,
          robots: robotStats,
          ai: aiStats,
          flows: flowStats,
          intentDistribution
        }
      };
    } catch (error) {
      console.error('获取今日汇总数据失败:', error);
      // 返回空数据，避免前端崩溃
      return {
        date: formatDate(),
        system: {
          sessions_total: 0,
          sessions_active: 0,
          sessions_human: 0,
          sessions_pending: 0,
          messages_total: 0,
          messages_user: 0,
          messages_robot: 0,
          robots_total: 0,
          robots_active: 0,
          flows_total: 0,
          flows_active: 0
        },
        ai: {
          intentRecognition: { successRate: '0', total: 0 },
          serviceReply: { successRate: '0', total: 0 },
          chat: { successRate: '0', total: 0 },
          total: 0,
          success: 0,
          error: 0,
          successRate: '0'
        },
        summary: {
          totalSessions: 0,
          totalMessages: 0,
          totalRobots: 0,
          aiSuccessRate: '0',
          activeRobots: 0,
          activeFlows: 0
        },
        details: {
          sessions: { total: 0, auto: 0, human: 0, pending: 0 },
          messages: { total: 0, user: 0, robot: 0 },
          robots: { total: 0, active: 0 },
          ai: { total: 0, success: 0, error: 0 },
          flows: { total: 0, active: 0 },
          intentDistribution: {}
        }
      };
    }
  }

  /**
   * 获取群活跃度排行（从数据库）
   */
  async getTopActiveGroups(date = formatDate(), limit = 10) {
    try {
      const db = await getDb();

      const groupStats = await db
        .select({
          groupId: sessions.groupId,
          groupName: sessions.groupName,
          messageCount: sql`COUNT(*)`
        })
        .from(sessionMessages)
        .innerJoin(sessions, eq(sessionMessages.sessionId, sessions.sessionId))
        .groupBy(sessions.groupId, sessions.groupName)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(limit);

      return groupStats;
    } catch (error) {
      console.error('获取群活跃度排行失败:', error);
      return [];
    }
  }

  /**
   * 获取用户活跃度排行（从数据库）
   */
  async getTopActiveUsers(date = formatDate(), limit = 10) {
    try {
      const db = await getDb();

      const userStats = await db
        .select({
          userId: sessions.userId,
          userName: sessions.userName,
          messageCount: sql`COUNT(*)`
        })
        .from(sessionMessages)
        .innerJoin(sessions, eq(sessionMessages.sessionId, sessions.sessionId))
        .groupBy(sessions.userId, sessions.userName)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(limit);

      return userStats;
    } catch (error) {
      console.error('获取用户活跃度排行失败:', error);
      return [];
    }
  }
}

// 创建单例
const monitorService = new MonitorService();

module.exports = monitorService;
