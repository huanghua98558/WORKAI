/**
 * 实时监控系统 API
 * 提供消息处理流程追踪、AI 对话查看、错误追踪等功能
 */

const { getDb } = require('coze-coding-dev-sdk');
const { execution_tracking, sessions, ai_io_logs, session_messages, robots } = require('../database/schema');
const { eq, desc, and, gte, lte } = require('drizzle-orm');
const logger = require('../services/system-logger.service');

async function monitoringRoutes(fastify, options) {
  const logger = require('../services/system-logger.service');

  // 1. 获取实时消息处理列表（最新 100 条）
  fastify.get('/monitoring/executions', async (request, reply) => {
    try {
      const { limit = 100, status, robotId } = request.query;
      const db = await getDb();

      let whereConditions = [];
      if (status) {
        whereConditions.push(eq(execution_tracking.status, status));
      }
      if (robotId) {
        whereConditions.push(eq(execution_tracking.robotId, robotId));
      }

      const results = await db
        .select()
        .from(execution_tracking)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(execution_tracking.createdAt))
        .limit(parseInt(limit));

      return reply.send({
        code: 0,
        message: 'success',
        data: results
      });
    } catch (error) {
      console.error('获取执行列表失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取执行列表失败',
        error: error.message
      });
    }
  });

  // 2. 获取单个执行详情（包含所有步骤）
  fastify.get('/monitoring/executions/:processingId', async (request, reply) => {
    try {
      const { processingId } = request.params;
      const db = await getDb();

      const result = await db
        .select()
        .from(execution_tracking)
        .where(eq(execution_tracking.processingId, processingId))
        .limit(1);

      if (result.length === 0) {
        return reply.status(404).send({
          code: -1,
          message: '执行记录不存在'
        });
      }

      // 获取相关的 AI 日志
      const aiLogs = await db
        .select()
        .from(ai_io_logs)
        .where(eq(ai_io_logs.messageId, result[0].messageId))
        .orderBy(desc(ai_io_logs.createdAt))
        .limit(10);

      // 获取相关的会话消息
      const messages = await db
        .select()
        .from(session_messages)
        .where(eq(session_messages.session_id, result[0].session_id))
        .orderBy(desc(session_messages.created_at))
        .limit(10);

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          ...result[0],
          steps: JSON.parse(result[0].steps || '{}'),
          decision: JSON.parse(result[0].decision || '{}'),
          aiLogs,
          messages
        }
      });
    } catch (error) {
      console.error('获取执行详情失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取执行详情失败',
        error: error.message
      });
    }
  });

  // 3. 获取 AI 对话日志
  fastify.get('/monitoring/ai-logs', async (request, reply) => {
    try {
      const { limit = 50, operationType, sessionId, robotId } = request.query;
      const db = await getDb();

      let whereConditions = [];
      if (operationType) {
        whereConditions.push(eq(ai_io_logs.operationType, operationType));
      }
      if (sessionId) {
        whereConditions.push(eq(ai_io_logs.sessionId, sessionId));
      }
      if (robotId) {
        whereConditions.push(eq(ai_io_logs.robotId, robotId));
      }

      const results = await db
        .select()
        .from(ai_io_logs)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(ai_io_logs.createdAt))
        .limit(parseInt(limit));

      return reply.send({
        code: 0,
        message: 'success',
        data: results
      });
    } catch (error) {
      console.error('获取 AI 日志失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取 AI 日志失败',
        error: error.message
      });
    }
  });

  // 4. 获取会话列表
  fastify.get('/monitoring/sessions', async (request, reply) => {
    try {
      const { limit = 50, status, userId, groupId } = request.query;
      const db = await getDb();

      let whereConditions = [];
      if (status) {
        whereConditions.push(eq(sessions.status, status));
      }
      if (userId) {
        whereConditions.push(eq(sessions.user_id, userId));
      }
      if (groupId) {
        whereConditions.push(eq(sessions.group_id, groupId));
      }

      const results = await db
        .select()
        .from(sessions)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(sessions.last_processed_at))
        .limit(parseInt(limit));

      return reply.send({
        code: 0,
        message: 'success',
        data: results
      });
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取会话列表失败',
        error: error.message
      });
    }
  });

  // 5. 获取会话详情（包含所有消息）
  fastify.get('/monitoring/sessions/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = request.params;
      const db = await getDb();

      // 获取会话信息
      const sessionResult = await db
        .select()
        .from(sessions)
        .where(eq(sessions.session_id, sessionId))
        .limit(1);

      if (sessionResult.length === 0) {
        return reply.status(404).send({
          code: -1,
          message: '会话不存在'
        });
      }

      // 获取会话消息
      const messages = await db
        .select()
        .from(session_messages)
        .where(eq(session_messages.session_id, sessionId))
        .orderBy(session_messages.created_at)
        .limit(100);

      // 获取 AI 日志
      const aiLogs = await db
        .select()
        .from(ai_io_logs)
        .where(eq(ai_io_logs.session_id, sessionId))
        .orderBy(desc(ai_io_logs.created_at))
        .limit(20);

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          ...sessionResult[0],
          context: JSON.parse(sessionResult[0].context || '[]'),
          messages,
          aiLogs
        }
      });
    } catch (error) {
      console.error('获取会话详情失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取会话详情失败',
        error: error.message
      });
    }
  });

  // 6. 获取系统健康状态
  fastify.get('/monitoring/health', async (request, reply) => {
    try {
      const db = await getDb();

      // 统计最近1小时的执行情况
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentExecutions = await db
        .select()
        .from(execution_tracking)
        .where(gte(execution_tracking.createdAt, oneHourAgo));

      const successCount = recentExecutions.filter(e => e.status === 'success').length;
      const errorCount = recentExecutions.filter(e => e.status === 'error').length;
      const processingCount = recentExecutions.filter(e => e.status === 'processing').length;

      // 统计 AI 调用情况
      const recentAiCalls = await db
        .select()
        .from(ai_io_logs)
        .where(gte(ai_io_logs.createdAt, oneHourAgo));

      const aiSuccessCount = recentAiCalls.filter(a => a.status === 'success').length;
      const aiErrorCount = recentAiCalls.filter(a => a.status === 'error').length;

      // 统计活跃会话数
      const activeSessions = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.status, 'auto'),
          gte(sessions.lastMessageAt, oneHourAgo)
        ));

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          executions: {
            total: recentExecutions.length,
            success: successCount,
            error: errorCount,
            processing: processingCount,
            successRate: recentExecutions.length > 0
              ? (successCount / recentExecutions.length * 100).toFixed(2)
              : '0.00'
          },
          ai: {
            total: recentAiCalls.length,
            success: aiSuccessCount,
            error: aiErrorCount,
            successRate: recentAiCalls.length > 0
              ? (aiSuccessCount / recentAiCalls.length * 100).toFixed(2)
              : '0.00'
          },
          sessions: {
            active: activeSessions.length
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('获取系统健康状态失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取系统健康状态失败',
        error: error.message
      });
    }
  });

  // 7. 获取 Token 统计
  fastify.get('/monitoring/token-stats', async (request, reply) => {
    try {
      const db = await getDb();

      // 计算今天和昨天的日期范围（UTC+8）
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 查询今天的Token使用情况
      const todayLogs = await db
        .select()
        .from(ai_io_logs)
        .where(and(
          gte(ai_io_logs.createdAt, todayStart.toISOString()),
          lte(ai_io_logs.createdAt, todayEnd.toISOString())
        ));

      // 查询昨天的Token使用情况
      const yesterdayLogs = await db
        .select()
        .from(ai_io_logs)
        .where(and(
          gte(ai_io_logs.createdAt, yesterdayStart.toISOString()),
          lte(ai_io_logs.createdAt, yesterdayEnd.toISOString())
        ));

      // 统计今天的Token数据
      const todayTotal = todayLogs.reduce((sum, log) => sum + (log.totalTokens || 0), 0);
      const todayInput = todayLogs.reduce((sum, log) => sum + (log.inputTokens || 0), 0);
      const todayOutput = todayLogs.reduce((sum, log) => sum + (log.outputTokens || 0), 0);

      // 统计昨天的Token数据
      const yesterdayTotal = yesterdayLogs.reduce((sum, log) => sum + (log.totalTokens || 0), 0);

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          today_total: todayTotal,
          today_input: todayInput,
          today_output: todayOutput,
          yesterday_total: yesterdayTotal,
          record_count: todayLogs.length
        }
      });
    } catch (error) {
      console.error('获取 Token 统计失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取 Token 统计失败',
        error: error.message
      });
    }
  });
}

module.exports = monitoringRoutes;
