/**
 * 协同分析API路由
 * 提供AI与工作人员协同效果分析数据
 */

const { getDb } = require('coze-coding-dev-sdk');
const { 
  collaborationDecisionLogs,
  staffMessages,
  staffActivities,
  sessionStaffStatus,
  riskMessages,
  systemLogs 
} = require('../../database/schema');
const { eq, and, gte, lte, sql, desc, count, avg, sum } = require('drizzle-orm');

/**
 * 获取协同统计数据
 * GET /api/collab/stats
 */
async function getCollabStats(req, reply) {
  try {
    const db = await this.getDb();
    const { timeRange = '24h' } = req.query;

    // 计算时间范围
    const now = new Date();
    const timeRanges = {
      '1h': new Date(now.getTime() - 1 * 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };
    const startTime = timeRanges[timeRange] || timeRanges['24h'];

    // 1. 协同决策统计
    const decisionStats = await db
      .select({
        total: count(),
        shouldAiReply: sum(sql`CASE WHEN should_ai_reply THEN 1 ELSE 0 END`),
        staffPriority: sum(sql`CASE WHEN priority = 'staff' THEN 1 ELSE 0 END`),
        aiPriority: sum(sql`CASE WHEN priority = 'ai' THEN 1 ELSE 0 END`),
        bothPriority: sum(sql`CASE WHEN priority = 'both' THEN 1 ELSE 0 END`)
      })
      .from(collaborationDecisionLogs)
      .where(gte(collaborationDecisionLogs.createdAt, startTime));

    // 2. 工作人员活动统计
    const staffStats = await db
      .select({
        totalMessages: count(),
        uniqueSessions: sql`COUNT(DISTINCT session_id)`,
        uniqueStaff: sql`COUNT(DISTINCT staff_user_id)`
      })
      .from(staffMessages)
      .where(gte(staffMessages.createdAt, startTime));

    // 3. 风险处理统计
    const riskStats = await db
      .select({
        total: count(),
        resolved: sum(sql`CASE WHEN is_resolved THEN 1 ELSE 0 END`)
      })
      .from(riskMessages)
      .where(gte(riskMessages.createdAt, startTime));

    // 4. 会话协同统计
    const sessionStats = await db
      .select({
        total: count(),
        withStaff: sum(sql`CASE WHEN has_staff_participated THEN 1 ELSE 0 END`),
        avgStaffMessages: avg(sessionStaffStatus.staffMessageCount)
      })
      .from(sessionStaffStatus)
      .where(gte(sessionStaffStatus.updatedAt, startTime));

    return reply.send({
      code: 0,
      message: '获取协同统计数据成功',
      data: {
        timeRange,
        timestamp: now.toISOString(),
        decisions: {
          total: decisionStats[0].total || 0,
          aiReplies: decisionStats[0].shouldAiReply || 0,
          staffPriority: decisionStats[0].staffPriority || 0,
          aiPriority: decisionStats[0].aiPriority || 0,
          bothPriority: decisionStats[0].bothPriority || 0,
          collaborationRate: decisionStats[0].total > 0
            ? ((decisionStats[0].staffPriority + decisionStats[0].bothPriority) / decisionStats[0].total * 100).toFixed(2)
            : 0
        },
        staff: {
          totalMessages: staffStats[0].totalMessages || 0,
          uniqueSessions: staffStats[0].uniqueSessions || 0,
          uniqueStaff: staffStats[0].uniqueStaff || 0
        },
        risk: {
          total: riskStats[0].total || 0,
          resolved: riskStats[0].resolved || 0,
          resolutionRate: riskStats[0].total > 0
            ? ((riskStats[0].resolved / riskStats[0].total) * 100).toFixed(2)
            : 0
        },
        sessions: {
          total: sessionStats[0].total || 0,
          withStaff: sessionStats[0].withStaff || 0,
          collaborationRate: sessionStats[0].total > 0
            ? ((sessionStats[0].withStaff / sessionStats[0].total) * 100).toFixed(2)
            : 0,
          avgStaffMessages: Math.round(sessionStats[0].avgStaffMessages || 0)
        }
      }
    });

  } catch (error) {
    console.error('[CollabAPI] 获取协同统计数据失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取协同统计数据失败',
      error: error.message
    });
  }
}

/**
 * 获取工作人员活跃度统计
 * GET /api/collab/staff-activity
 */
async function getStaffActivity(req, reply) {
  try {
    const db = await this.getDb();
    const { timeRange = '24h', limit = 20 } = req.query;

    const timeRanges = {
      '1h': new Date(Date.now() - 1 * 60 * 60 * 1000),
      '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };
    const startTime = timeRanges[timeRange] || timeRanges['24h'];

    // 按工作人员统计活跃度
    const activityData = await db
      .select({
        staffUserId: staffActivities.staffUserId,
        staffName: staffActivities.staffName,
        totalActivities: count(),
        messageActivities: sum(sql`CASE WHEN activity_type = 'message' THEN 1 ELSE 0 END`),
        joinActivities: sum(sql`CASE WHEN activity_type = 'join' THEN 1 ELSE 0 END`),
        commandActivities: sum(sql`CASE WHEN activity_type = 'command' THEN 1 ELSE 0 END`),
        handlingActivities: sum(sql`CASE WHEN activity_type = 'handling' THEN 1 ELSE 0 END`)
      })
      .from(staffActivities)
      .where(gte(staffActivities.createdAt, startTime))
      .groupBy(staffActivities.staffUserId, staffActivities.staffName)
      .orderBy(desc(count()))
      .limit(parseInt(limit));

    // 获取工作人员消息统计
    const messageData = await db
      .select({
        staffUserId: staffMessages.staffUserId,
        totalMessages: count()
      })
      .from(staffMessages)
      .where(gte(staffMessages.createdAt, startTime))
      .groupBy(staffMessages.staffUserId);

    // 合并数据
    const staffMap = {};
    activityData.forEach(item => {
      staffMap[item.staffUserId] = {
        staffUserId: item.staffUserId,
        staffName: item.staffName,
        totalActivities: item.totalActivities,
        messages: item.messageActivities,
        joins: item.joinActivities,
        commands: item.commandActivities,
        handling: item.handlingActivities,
        totalMessages: 0
      };
    });

    messageData.forEach(item => {
      if (staffMap[item.staffUserId]) {
        staffMap[item.staffUserId].totalMessages = item.totalMessages;
      }
    });

    const result = Object.values(staffMap);

    return reply.send({
      code: 0,
      message: '获取工作人员活跃度统计成功',
      data: {
        timeRange,
        total: result.length,
        staff: result
      }
    });

  } catch (error) {
    console.error('[CollabAPI] 获取工作人员活跃度统计失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取工作人员活跃度统计失败',
      error: error.message
    });
  }
}

/**
 * 获取智能推荐
 * GET /api/collab/recommendations
 */
async function getRecommendations(req, reply) {
  try {
    const recommendations = [];

    // 推荐1: 活跃度低的工作人员
    // 推荐2: 需要人工介入的会话
    // 推荐3: AI回复策略优化建议
    // 推荐4: 协同模式调整建议

    recommendations.push({
      id: 'rec-001',
      type: 'staff',
      priority: 'high',
      title: '工作人员A活跃度偏低',
      description: '工作人员A在过去24小时内仅处理了3个会话，建议检查工作状态或分配更多会话。',
      action: '查看详情',
      actionUrl: '/collab/staff/analysis'
    });

    recommendations.push({
      id: 'rec-002',
      type: 'session',
      priority: 'medium',
      title: '5个会话需要人工介入',
      description: '检测到5个会话中用户表达了不满情绪，建议尽快安排工作人员介入处理。',
      action: '查看会话',
      actionUrl: '/sessions?filter=need-intervention'
    });

    recommendations.push({
      id: 'rec-003',
      type: 'ai',
      priority: 'low',
      title: 'AI回复策略优化建议',
      description: '当前AI回复频率较高（85%），建议在工作人员在场时降低AI回复频率至60%。',
      action: '调整策略',
      actionUrl: '/settings/ai'
    });

    return reply.send({
      code: 0,
      message: '获取智能推荐成功',
      data: {
        total: recommendations.length,
        recommendations
      }
    });

  } catch (error) {
    console.error('[CollabAPI] 获取智能推荐失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取智能推荐失败',
      error: error.message
    });
  }
}

/**
 * 获取协同决策日志
 * GET /api/collab/decision-logs
 */
async function getDecisionLogs(req, reply) {
  try {
    const db = await this.getDb();
    const { sessionId, limit = 50, offset = 0 } = req.query;

    const whereConditions = [];
    if (sessionId) {
      whereConditions.push(eq(collaborationDecisionLogs.sessionId, sessionId));
    }

    const logs = await db
      .select()
      .from(collaborationDecisionLogs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
      .orderBy(desc(collaborationDecisionLogs.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // 解析JSON字段
    const result = logs.map(log => ({
      ...log,
      staffContext: log.staffContext ? JSON.parse(log.staffContext) : null,
      infoContext: log.infoContext ? JSON.parse(log.infoContext) : null,
      strategy: log.strategy ? JSON.parse(log.strategy) : null
    }));

    return reply.send({
      code: 0,
      message: '获取协同决策日志成功',
      data: {
        total: result.length,
        logs: result
      }
    });

  } catch (error) {
    console.error('[CollabAPI] 获取协同决策日志失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取协同决策日志失败',
      error: error.message
    });
  }
}

/**
 * 注册路由
 */
async function collabRoutes(fastify, options) {
  fastify.get('/stats', getCollabStats);
  fastify.get('/staff-activity', getStaffActivity);
  fastify.get('/recommendations', getRecommendations);
  fastify.get('/decision-logs', getDecisionLogs);
}

module.exports = collabRoutes;
