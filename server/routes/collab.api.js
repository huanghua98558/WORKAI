/**
 * 协同分析API路由
 * 提供AI与工作人员协同效果分析数据
 */

const { getDb } = require('coze-coding-dev-sdk');
const { getPool } = require('coze-coding-dev-sdk');
const {
  collaborationDecisionLogs,
  staffMessages,
  staffActivities,
  sessionStaffStatus,
  riskMessages,
  systemLogs
} = require('../database/schema');
const { eq, and, gte, lte, sql, desc, count, avg, sum } = require('drizzle-orm');
const { collaborationService } = require('../services/collaboration.service'); // 协同分析服务

/**
 * 获取协同统计数据
 * GET /api/collab/stats
 */
async function getCollabStats(req, reply) {
  try {
    const db = await getDb();
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
        resolved: sum(sql`CASE WHEN resolved_by IS NOT NULL THEN 1 ELSE 0 END`)
      })
      .from(riskMessages)
      .where(gte(riskMessages.createdAt, startTime));

    // 4. 会话协同统计
    const sessionStats = await db
      .select({
        total: count(),
        withStaff: sum(sql`CASE WHEN has_staff_participated THEN 1 ELSE 0 END`),
        avgStaffMessages: avg(sql`staff_message_count`)
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
    const db = await getDb();
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
    // 使用协同分析服务生成真实推荐
    const recommendations = await collaborationService.generateRecommendations();

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
    const db = await getDb();
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
 * 创建协同决策日志
 * POST /api/collab/decision-logs
 */
async function createDecisionLog(req, reply) {
  try {
    const {
      sessionId,
      robotId,
      shouldAiReply,
      aiAction = 'wait',
      staffAction = 'none',
      priority = 'none',
      reason = '',
      extraData = {}
    } = req.body;

    // 验证必需字段
    if (!sessionId || !robotId) {
      return reply.code(400).send({
        code: -1,
        message: '缺少必需字段: sessionId, robotId'
      });
    }

    // 调用协同分析服务创建决策日志
    const logId = await collaborationService.recordDecisionLog({
      sessionId,
      robotId,
      shouldAiReply,
      aiAction,
      staffAction,
      priority,
      reason,
      extraData
    });

    return reply.send({
      code: 0,
      message: '创建协同决策日志成功',
      data: {
        id: logId,
        sessionId,
        robotId,
        shouldAiReply,
        aiAction,
        staffAction,
        priority,
        reason
      }
    });

  } catch (error) {
    console.error('[CollabAPI] 创建协同决策日志失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '创建协同决策日志失败',
      error: error.message
    });
  }
}

/**
 * 更新协同决策日志
 * PUT /api/collab/decision-logs/:id
 */
async function updateDecisionLog(req, reply) {
  try {
    const { id } = req.params;
    const {
      shouldAiReply,
      aiAction,
      staffAction,
      priority,
      reason,
      extraData
    } = req.body;

    const db = await getDb();

    // 构建更新数据
    const updateData = {};
    if (shouldAiReply !== undefined) updateData.shouldAiReply = shouldAiReply;
    if (aiAction !== undefined) updateData.aiAction = aiAction;
    if (staffAction !== undefined) updateData.staffAction = staffAction;
    if (priority !== undefined) updateData.priority = priority;
    if (reason !== undefined) updateData.reason = reason;
    if (extraData !== undefined) updateData.extraData = JSON.stringify(extraData);
    updateData.updatedAt = new Date();

    // 更新决策日志
    const result = await db
      .update(collaborationDecisionLogs)
      .set(updateData)
      .where(eq(collaborationDecisionLogs.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        code: -1,
        message: '协同决策日志不存在'
      });
    }

    return reply.send({
      code: 0,
      message: '更新协同决策日志成功',
      data: result[0]
    });

  } catch (error) {
    console.error('[CollabAPI] 更新协同决策日志失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '更新协同决策日志失败',
      error: error.message
    });
  }
}

/**
 * 获取推荐统计（增强版）
 * GET /api/collab/recommendations/stats
 */
async function getRecommendationStats(req, reply) {
  try {
    const stats = await collaborationService.getRecommendationStats();

    return reply.send({
      code: 0,
      message: '获取推荐统计成功',
      data: stats
    });

  } catch (error) {
    console.error('[CollabAPI] 获取推荐统计失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取推荐统计失败',
      error: error.message
    });
  }
}

/**
 * 获取机器人满意度列表
 * GET /api/collab/robot-satisfaction
 */
async function getRobotSatisfactionList(req, reply) {
  try {
    const { timeRange = '24h', limit = 20 } = req.query;

    const satisfactionList = await collaborationService.getRobotSatisfactionList(timeRange, parseInt(limit));

    return reply.send({
      code: 0,
      message: '获取机器人满意度列表成功',
      data: satisfactionList
    });

  } catch (error) {
    console.error('[CollabAPI] 获取机器人满意度列表失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取机器人满意度列表失败',
      error: error.message
    });
  }
}

/**
 * 获取机器人满意度详情
 * GET /api/collab/robot-satisfaction/:robotId
 */
async function getRobotSatisfactionDetail(req, reply) {
  try {
    const { robotId } = req.params;
    const { timeRange = '24h' } = req.query;

    const satisfactionDetail = await collaborationService.getRobotSatisfactionDetail(robotId, timeRange);

    return reply.send({
      code: 0,
      message: '获取机器人满意度详情成功',
      data: satisfactionDetail
    });

  } catch (error) {
    console.error('[CollabAPI] 获取机器人满意度详情失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取机器人满意度详情失败',
      error: error.message
    });
  }
}

/**
 * 导出协同统计数据（CSV）
 * GET /api/collab/export/csv
 */
async function exportCollabStatsCSV(req, reply) {
  try {
    const { timeRange = '24h' } = req.query;

    // 获取统计数据
    const stats = await collaborationService.getSessionCollabStatsForExport(timeRange);

    // 生成CSV内容
    const csvHeader = ['指标', '数值', '时间范围'];
    const csvRows = [
      csvHeader.join(','),
      `协同决策总数,${stats.decisionCount || 0},${timeRange}`,
      `AI回复数,${stats.aiReplyCount || 0},${timeRange}`,
      `工作人员回复数,${stats.staffReplyCount || 0},${timeRange}`,
      `协同率,${stats.collaborationRate || 0}%,${timeRange}`,
      `工作人员消息总数,${stats.staffMessageCount || 0},${timeRange}`,
      `工作人员活动总数,${stats.staffActivityCount || 0},${timeRange}`,
      `总会话数,${stats.totalSessions || 0},${timeRange}`,
      `有工作人员的会话数,${stats.sessionsWithStaff || 0},${timeRange}`
    ];

    const csvContent = csvRows.join('\n');

    // 设置响应头
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename=collab-stats-${timeRange}-${Date.now()}.csv`);

    return reply.send(csvContent);

  } catch (error) {
    console.error('[CollabAPI] 导出协同统计数据失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '导出协同统计数据失败',
      error: error.message
    });
  }
}

/**
 * 导出工作人员活动列表（CSV）
 * GET /api/collab/export/staff-activity
 */
async function exportStaffActivityCSV(req, reply) {
  try {
    const { timeRange = '24h', limit = 1000 } = req.query;

    // 获取工作人员活动数据
    const activities = await collaborationService.getStaffActivitiesForExport(timeRange, parseInt(limit));

    if (activities.length === 0) {
      return reply.code(404).send({
        code: -1,
        message: '暂无工作人员活动数据'
      });
    }

    // 生成CSV内容
    const csvHeader = ['活动ID', '会话ID', '机器人ID', '工作人员ID', '工作人员名称', '活动类型', '活动时间'];
    const csvRows = [csvHeader.join(',')];

    activities.forEach(activity => {
      csvRows.push([
        activity.id,
        activity.sessionId,
        activity.robotId,
        activity.staffUserId,
        activity.staffName,
        activity.activityType,
        activity.createdAt
      ].join(','));
    });

    const csvContent = csvRows.join('\n');

    // 设置响应头
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename=staff-activity-${timeRange}-${Date.now()}.csv`);

    return reply.send(csvContent);

  } catch (error) {
    console.error('[CollabAPI] 导出工作人员活动列表失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '导出工作人员活动列表失败',
      error: error.message
    });
  }
}

/**
 * 导出决策日志（CSV）
 * GET /api/collab/export/decision-logs
 */
async function exportDecisionLogsCSV(req, reply) {
  try {
    const { timeRange = '24h', limit = 1000 } = req.query;

    // 获取决策日志数据
    const logs = await collaborationService.getDecisionLogsForExport(timeRange, parseInt(limit));

    if (logs.length === 0) {
      return reply.code(404).send({
        code: -1,
        message: '暂无决策日志数据'
      });
    }

    // 生成CSV内容
    const csvHeader = ['日志ID', '会话ID', '机器人ID', '是否AI回复', 'AI动作', '工作人员动作', '优先级', '原因', '创建时间'];
    const csvRows = [csvHeader.join(',')];

    logs.forEach(log => {
      csvRows.push([
        log.id,
        log.sessionId,
        log.robotId,
        log.shouldAiReply,
        log.aiAction,
        log.staffAction,
        log.priority,
        log.reason,
        log.createdAt
      ].join(','));
    });

    const csvContent = csvRows.join('\n');

    // 设置响应头
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename=decision-logs-${timeRange}-${Date.now()}.csv`);

    return reply.send(csvContent);

  } catch (error) {
    console.error('[CollabAPI] 导出决策日志失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '导出决策日志失败',
      error: error.message
    });
  }
}

/**
 * 分析用户满意度
 * GET /api/collab/satisfaction/analyze
 */
async function analyzeUserSatisfaction(req, reply) {
  try {
    const { timeRange = '24h', robotId, staffUserId } = req.query;

    const satisfactionData = await collaborationService.analyzeUserSatisfaction({
      timeRange,
      robotId,
      staffUserId
    });

    return reply.send({
      code: 0,
      message: '分析用户满意度成功',
      data: satisfactionData
    });
  } catch (error) {
    console.error('[CollabAPI] 分析用户满意度失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '分析用户满意度失败',
      error: error.message
    });
  }
}

/**
 * 获取工作人员活动统计（详细）
 * GET /api/collab/staff-activity-stats
 */
async function getStaffActivityStats(req, reply) {
  try {
    const { timeRange = '24h', robotId } = req.query;

    const stats = await collaborationService.getStaffActivityStats({
      timeRange,
      robotId
    });

    return reply.send({
      code: 0,
      message: '获取工作人员活动统计成功',
      data: stats
    });
  } catch (error) {
    console.error('[CollabAPI] 获取工作人员活动统计失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取工作人员活动统计失败',
      error: error.message
    });
  }
}

/**
 * 获取工作人员详细信息
 * GET /api/collab/staff-detail/:staffUserId
 */
async function getStaffDetail(req, reply) {
  try {
    const { staffUserId } = req.params;
    const { timeRange = '24h' } = req.query;

    const staffDetail = await collaborationService.getStaffDetail(staffUserId, timeRange);

    return reply.send({
      code: 0,
      message: '获取工作人员详细信息成功',
      data: staffDetail
    });
  } catch (error) {
    console.error('[CollabAPI] 获取工作人员详细信息失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取工作人员详细信息失败',
      error: error.message
    });
  }
}

/**
 * 发送SSE通知
 * @param {string} type - 通知类型
 * @param {object} data - 通知数据
 */
async function sendSSENotification(type, data) {
  try {
    const pool = await getPool();
    const payload = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    // 发送到全局售后通知通道
    await pool.query(`NOTIFY "after_sales_notifications", '${payload.replace(/'/g, "''")}'`);
    console.log('[SSE通知] 已发送:', { type, data });
  } catch (error) {
    console.error('[SSE通知] 发送失败:', error);
  }
}

/**
 * 创建售后任务
 * POST /api/collab/after-sales-tasks
 */
async function createAfterSalesTask(req, reply) {
  try {
    const task = await collaborationService.createAfterSalesTask(req.body);

    // 发送SSE通知
    await sendSSENotification('task_created', {
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignedStaffUserId: task.assignedStaffUserId,
      createdAt: task.createdAt
    });

    return reply.send({
      code: 0,
      message: '创建售后任务成功',
      data: task
    });
  } catch (error) {
    console.error('[CollabAPI] 创建售后任务失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '创建售后任务失败',
      error: error.message
    });
  }
}

/**
 * 更新售后任务
 * PUT /api/collab/after-sales-tasks/:taskId
 */
async function updateAfterSalesTask(req, reply) {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await collaborationService.updateAfterSalesTask(taskId, updates);

    // 发送SSE通知
    await sendSSENotification('task_updated', {
      taskId: task.id,
      status: task.status,
      priority: task.priority,
      assignedStaffUserId: task.assignedStaffUserId,
      updatedAt: task.updatedAt,
      changes: updates
    });

    return reply.send({
      code: 0,
      message: '更新售后任务成功',
      data: task
    });
  } catch (error) {
    console.error('[CollabAPI] 更新售后任务失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '更新售后任务失败',
      error: error.message
    });
  }
}

/**
 * 获取售后任务列表
 * GET /api/collab/after-sales-tasks
 */
async function getAfterSalesTasks(req, reply) {
  try {
    const { status, priority, assignedStaffUserId, limit = 50 } = req.query;

    const tasks = await collaborationService.getAfterSalesTasks({
      status,
      priority,
      assignedStaffUserId,
      limit: parseInt(limit)
    });

    return reply.send({
      code: 0,
      message: '获取售后任务列表成功',
      data: tasks
    });
  } catch (error) {
    console.error('[CollabAPI] 获取售后任务列表失败:', error);
    return reply.code(500).send({
      code: -1,
      message: '获取售后任务列表失败',
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
  fastify.get('/recommendations/stats', getRecommendationStats);
  fastify.get('/decision-logs', getDecisionLogs);
  fastify.post('/decision-logs', createDecisionLog);
  fastify.put('/decision-logs/:id', updateDecisionLog);
  fastify.get('/robot-satisfaction', getRobotSatisfactionList);
  fastify.get('/robot-satisfaction/:robotId', getRobotSatisfactionDetail);

  // 新增：用户满意度分析
  fastify.get('/satisfaction/analyze', analyzeUserSatisfaction);

  // 新增：工作人员活动统计（详细）
  fastify.get('/staff-activity-stats', getStaffActivityStats);

  // 新增：工作人员详细信息
  fastify.get('/staff-detail/:staffUserId', getStaffDetail);

  // 新增：售后任务管理
  fastify.post('/after-sales-tasks', createAfterSalesTask);
  fastify.put('/after-sales-tasks/:taskId', updateAfterSalesTask);
  fastify.get('/after-sales-tasks', getAfterSalesTasks);

  fastify.get('/export/csv', exportCollabStatsCSV);
  fastify.get('/export/staff-activity', exportStaffActivityCSV);
  fastify.get('/export/decision-logs', exportDecisionLogsCSV);
}

module.exports = collabRoutes;
