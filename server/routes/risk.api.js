/**
 * 风险处理API路由
 * /api/risk/*
 */

const { riskHandlerService } = require('../services/risk');
const { staffIdentifier } = require('../services/risk');
const { riskMonitorService } = require('../services/risk');

async function riskRoutes(fastify, options) {
  /**
   * 处理风险消息
   * POST /api/risk/handle
   */
  fastify.post('/api/risk/handle', async (request, reply) => {
    try {
      const { message, context, config } = request.body;

      // 验证参数
      if (!message || !context) {
        return reply.code(400).send({
          error: '缺少必要参数：message 或 context'
        });
      }

      // 调用风险处理服务
      const result = await riskHandlerService.handleRiskMessage(
        message,
        context,
        config
      );

      // 启动监控
      if (result.success && config.mode === 'auto_notify') {
        riskMonitorService.startMonitoring(result.riskId, context, config);
      }

      return reply.send(result);

    } catch (error) {
      fastify.log.error('[API] 处理风险消息失败:', error);
      return reply.code(500).send({
        error: '处理失败',
        message: error.message
      });
    }
  });

  /**
   * 获取风险消息详情
   * GET /api/risk/:id
   */
  fastify.get('/api/risk/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const risk = await riskHandlerService.getRiskById(id);

      if (!risk) {
        return reply.code(404).send({
          error: '风险消息不存在'
        });
      }

      return reply.send(risk);

    } catch (error) {
      fastify.log.error('[API] 获取风险消息失败:', error);
      return reply.code(500).send({
        error: '获取失败',
        message: error.message
      });
    }
  });

  /**
   * 更新风险消息状态
   * PUT /api/risk/:id
   */
  fastify.put('/api/risk/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      await riskHandlerService.updateRiskStatus(id, updates);

      return reply.send({
        success: true,
        message: '更新成功'
      });

    } catch (error) {
      fastify.log.error('[API] 更新风险消息失败:', error);
      return reply.code(500).send({
        error: '更新失败',
        message: error.message
      });
    }
  });

  /**
   * 标记风险消息为已解决
   * POST /api/risk/:id/resolve
   */
  fastify.post('/api/risk/:id/resolve', async (request, reply) => {
    try {
      const { id } = request.params;
      const { resolvedBy } = request.body;

      if (!resolvedBy) {
        return reply.code(400).send({
          error: '缺少必要参数：resolvedBy'
        });
      }

      // 停止监控
      riskMonitorService.stopMonitoring(id, 'manual_resolved');

      // 标记为已解决
      await riskHandlerService.markAsResolved(id, resolvedBy);

      return reply.send({
        success: true,
        message: '已标记为已解决'
      });

    } catch (error) {
      fastify.log.error('[API] 标记风险消息为已解决失败:', error);
      return reply.code(500).send({
        error: '操作失败',
        message: error.message
      });
    }
  });

  /**
   * 测试工作人员识别规则
   * POST /api/risk/test-staff-identifier
   */
  fastify.post('/api/risk/test-staff-identifier', async (request, reply) => {
    try {
      const { message, staffConfig } = request.body;

      if (!message) {
        return reply.code(400).send({
          error: '缺少必要参数：message'
        });
      }

      // 更新配置
      if (staffConfig) {
        staffIdentifier.updateConfig(staffConfig);
      }

      // 测试识别
      const isStaff = staffIdentifier.isStaffUser(message);
      const matchedRule = staffIdentifier.getMatchedRule(message);

      return reply.send({
        isStaff,
        matchedRule,
        message: {
          userId: message.userId,
          userName: message.receivedName,
          platform: message.platform
        }
      });

    } catch (error) {
      fastify.log.error('[API] 测试工作人员识别失败:', error);
      return reply.code(500).send({
        error: '测试失败',
        message: error.message
      });
    }
  });

  /**
   * 验证工作人员识别配置
   * POST /api/risk/validate-staff-config
   */
  fastify.post('/api/risk/validate-staff-config', async (request, reply) => {
    try {
      const { config } = request.body;

      if (!config) {
        return reply.code(400).send({
          error: '缺少必要参数：config'
        });
      }

      // 更新配置
      staffIdentifier.updateConfig(config);

      // 验证配置
      const validation = staffIdentifier.validateConfig();

      return reply.send(validation);

    } catch (error) {
      fastify.log.error('[API] 验证配置失败:', error);
      return reply.code(500).send({
        error: '验证失败',
        message: error.message
      });
    }
  });

  /**
   * 获取活跃的风险消息列表
   * GET /api/risk/active
   */
  fastify.get('/api/risk/active', async (request, reply) => {
    try {
      const { limit = 50 } = request.query;

      // 获取活跃的风险消息（状态为processing）
      const { db } = require('../database');
      const { riskMessages } = require('../../src/storage/database/shared/schema');
      const { eq } = require('drizzle-orm');

      const activeRisks = await db
        .select()
        .from(riskMessages)
        .where(eq(riskMessages.status, 'processing'))
        .limit(parseInt(limit))
        .orderBy(riskMessages.createdAt);

      return reply.send({
        count: activeRisks.length,
        data: activeRisks
      });

    } catch (error) {
      fastify.log.error('[API] 获取活跃风险消息失败:', error);
      return reply.code(500).send({
        error: '获取失败',
        message: error.message
      });
    }
  });

  /**
   * 获取风险处理日志
   * GET /api/risk/:id/logs
   */
  fastify.get('/api/risk/:id/logs', async (request, reply) => {
    try {
      const { id } = request.params;

      const { db } = require('../database');
      const { riskHandlingLogs } = require('../../src/storage/database/shared/schema');
      const { eq } = require('drizzle-orm');

      const logs = await db
        .select()
        .from(riskHandlingLogs)
        .where(eq(riskHandlingLogs.riskId, id))
        .orderBy(riskHandlingLogs.createdAt);

      return reply.send({
        count: logs.length,
        data: logs
      });

    } catch (error) {
      fastify.log.error('[API] 获取风险处理日志失败:', error);
      return reply.code(500).send({
        error: '获取失败',
        message: error.message
      });
    }
  });

  /**
   * 统计风险消息数据
   * GET /api/risk/stats
   */
  fastify.get('/api/risk/stats', async (request, reply) => {
    try {
      const { db } = require('../database');
      const { riskMessages } = require('../../src/storage/database/shared/schema');

      const { count: totalCount } = await db
        .select({ count: fastify.drizzle.fn.count() })
        .from(riskMessages);

      const { count: processingCount } = await db
        .select({ count: fastify.drizzle.fn.count() })
        .from(riskMessages)
        .where(eq(riskMessages.status, 'processing'));

      const { count: resolvedCount } = await db
        .select({ count: fastify.drizzle.fn.count() })
        .from(riskMessages)
        .where(eq(riskMessages.status, 'resolved'));

      const { count: escalatedCount } = await db
        .select({ count: fastify.drizzle.fn.count() })
        .from(riskMessages)
        .where(eq(riskMessages.status, 'escalated'));

      return reply.send({
        total: parseInt(totalCount),
        processing: parseInt(processingCount),
        resolved: parseInt(resolvedCount),
        escalated: parseInt(escalatedCount)
      });

    } catch (error) {
      fastify.log.error('[API] 获取风险统计数据失败:', error);
      return reply.code(500).send({
        error: '获取失败',
        message: error.message
      });
    }
  });
}

module.exports = riskRoutes;
