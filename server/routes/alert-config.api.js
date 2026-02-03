/**
 * 告警配置管理 API
 */

const alertConfigService = require('../services/alert-config.service');
const alertTriggerService = require('../services/alert-trigger.service');
const alertNotificationService = require('../services/alert-notification.service');

/**
 * 注册告警配置管理路由
 * @param {FastifyInstance} fastify - Fastify 实例
 */
module.exports = async function (fastify) {
  // ==================== 意图配置管理 ====================

  // 获取所有意图配置
  fastify.get('/alerts/intents', async (request, reply) => {
    try {
      const intents = await alertConfigService.getAllIntentConfigs();
      return {
        success: true,
        data: intents,
      };
    } catch (error) {
      console.error('[API] 获取意图配置失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取启用的意图配置
  fastify.get('/alerts/intents/enabled', async (request, reply) => {
    try {
      const intents = await alertConfigService.getEnabledIntentConfigs();
      return {
        success: true,
        data: intents,
      };
    } catch (error) {
      console.error('[API] 获取启用意图配置失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取单个意图配置
  fastify.get('/alerts/intents/:intentType', async (request, reply) => {
    try {
      const { intentType } = request.params;
      const intent = await alertConfigService.getIntentConfigByType(intentType);

      if (!intent) {
        reply.code(404);
        return {
          success: false,
          error: '意图配置不存在',
        };
      }

      return {
        success: true,
        data: intent,
      };
    } catch (error) {
      console.error('[API] 获取意图配置失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 创建或更新意图配置
  fastify.post('/alerts/intents', async (request, reply) => {
    try {
      const config = request.body;
      const result = await alertConfigService.upsertIntentConfig(config);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 保存意图配置失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ==================== 告警规则管理 ====================

  // 获取所有告警规则
  fastify.get('/alerts/rules', async (request, reply) => {
    try {
      const rules = await alertConfigService.getAllAlertRules();
      return {
        success: true,
        data: rules,
      };
    } catch (error) {
      console.error('[API] 获取告警规则失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取意图类型对应的告警规则
  fastify.get('/alerts/rules/:intentType', async (request, reply) => {
    try {
      const { intentType } = request.params;
      const rule = await alertConfigService.getAlertRuleByIntent(intentType);

      if (!rule) {
        reply.code(404);
        return {
          success: false,
          error: '告警规则不存在',
        };
      }

      return {
        success: true,
        data: rule,
      };
    } catch (error) {
      console.error('[API] 获取告警规则失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 创建或更新告警规则
  fastify.post('/alerts/rules', async (request, reply) => {
    try {
      const rule = request.body;
      const result = await alertConfigService.upsertAlertRule(rule);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 保存告警规则失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ==================== 通知方式管理 ====================

  // 获取告警规则的通知方式
  fastify.get('/alerts/rules/:ruleId/notifications', async (request, reply) => {
    try {
      const { ruleId } = request.params;
      const methods = await alertConfigService.getNotificationMethods(ruleId);
      return {
        success: true,
        data: methods,
      };
    } catch (error) {
      console.error('[API] 获取通知方式失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 添加通知方式
  fastify.post('/alerts/notifications', async (request, reply) => {
    try {
      const method = request.body;
      const result = await alertConfigService.addNotificationMethod(method);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 添加通知方式失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 更新通知方式
  fastify.put('/alerts/notifications/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      const result = await alertConfigService.updateNotificationMethod(id, updates);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 更新通知方式失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 删除通知方式
  fastify.delete('/alerts/notifications/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await alertConfigService.deleteNotificationMethod(id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 删除通知方式失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ==================== 告警历史和统计 ====================

  // 获取最近的告警历史
  fastify.get('/alerts/history', async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 50;
      const alerts = await alertTriggerService.getRecentAlerts(limit);
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      console.error('[API] 获取告警历史失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 标记告警为已处理
  fastify.put('/alerts/history/:alertId/handle', async (request, reply) => {
    try {
      const { alertId } = request.params;
      const { handledBy } = request.body;
      const result = await alertTriggerService.markAlertAsHandled(alertId, handledBy);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 标记告警处理失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取告警统计
  fastify.get('/alerts/stats', async (request, reply) => {
    try {
      const timeRange = request.query.timeRange || '7d';
      const stats = await alertTriggerService.getAlertStats(timeRange);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('[API] 获取告警统计失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ==================== 测试通知 ====================

  // 测试通知方式
  fastify.post('/alerts/notifications/test', async (request, reply) => {
    try {
      const { methodType, recipientConfig } = request.body;
      const result = await alertNotificationService.testNotification(
        methodType,
        recipientConfig
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 测试通知失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });
};
