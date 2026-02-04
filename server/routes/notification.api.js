/**
 * 通知管理 API
 * 管理通知渠道配置、发送通知
 */

const notificationService = require('../services/notification.service');
const { getDb } = require('coze-coding-dev-sdk');
const { notificationMethods, alertRules } = require('../database/schema');
const { eq, and, desc, isNull } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('NOTIFICATION_API');

/**
 * 注册通知管理路由
 */
module.exports = async function (fastify) {
  console.log('[notification.api.js] 通知管理 API 路由已加载');

  // ==================== 通知方式管理 ====================

  /**
   * 获取告警规则的通知方式列表
   */
  fastify.get('/notifications/methods/:alertRuleId', async (request, reply) => {
    try {
      const { alertRuleId } = request.params;

      const methods = await notificationService.getNotificationMethods(alertRuleId);

      return reply.send({
        code: 0,
        message: 'success',
        data: methods
      });
    } catch (error) {
      logger.error('获取通知方式列表失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取通知方式列表失败',
        error: error.message
      });
    }
  });

  /**
   * 创建通知方式
   */
  fastify.post('/notifications/methods', async (request, reply) => {
    try {
      const data = request.body;
      const db = getDb();

      // 验证告警规则是否存在
      const rule = await db
        .select()
        .from(alertRules)
        .where(eq(alertRules.id, data.alertRuleId))
        .limit(1);

      if (!rule || rule.length === 0) {
        return reply.status(404).send({
          code: -1,
          message: '告警规则不存在'
        });
      }

      // 创建通知方式
      const method = {
        id: crypto.randomUUID(),
        alertRuleId: data.alertRuleId,
        methodType: data.methodType, // sound, desktop, wechat, robot
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        recipientConfig: data.recipientConfig || {},
        messageTemplate: data.messageTemplate || null,
        priority: data.priority || 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.insert(notificationMethods).values(method);

      // 清除缓存
      notificationService.clearCache(data.alertRuleId);

      logger.info('创建通知方式成功:', method);

      return reply.send({
        code: 0,
        message: 'success',
        data: method
      });
    } catch (error) {
      logger.error('创建通知方式失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '创建通知方式失败',
        error: error.message
      });
    }
  });

  /**
   * 更新通知方式
   */
  fastify.put('/notifications/methods/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const db = getDb();

      // 检查通知方式是否存在
      const existing = await db
        .select()
        .from(notificationMethods)
        .where(eq(notificationMethods.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return reply.status(404).send({
          code: -1,
          message: '通知方式不存在'
        });
      }

      // 更新字段
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      await db
        .update(notificationMethods)
        .set(updateData)
        .where(eq(notificationMethods.id, id));

      // 清除缓存
      notificationService.clearCache(existing[0].alertRuleId);

      logger.info('更新通知方式成功:', id);

      return reply.send({
        code: 0,
        message: 'success',
        data: { id, ...updateData }
      });
    } catch (error) {
      logger.error('更新通知方式失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '更新通知方式失败',
        error: error.message
      });
    }
  });

  /**
   * 删除通知方式
   */
  fastify.delete('/notifications/methods/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = getDb();

      // 获取通知方式信息（用于清除缓存）
      const existing = await db
        .select()
        .from(notificationMethods)
        .where(eq(notificationMethods.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return reply.status(404).send({
          code: -1,
          message: '通知方式不存在'
        });
      }

      // 删除
      await db
        .delete(notificationMethods)
        .where(eq(notificationMethods.id, id));

      // 清除缓存
      notificationService.clearCache(existing[0].alertRuleId);

      logger.info('删除通知方式成功:', id);

      return reply.send({
        code: 0,
        message: 'success',
        data: { id }
      });
    } catch (error) {
      logger.error('删除通知方式失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '删除通知方式失败',
        error: error.message
      });
    }
  });

  /**
   * 切换通知方式启用状态
   */
  fastify.patch('/notifications/methods/:id/toggle', async (request, reply) => {
    try {
      const { id } = request.params;
      const { enabled } = request.body;
      const db = getDb();

      const existing = await db
        .select()
        .from(notificationMethods)
        .where(eq(notificationMethods.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return reply.status(404).send({
          code: -1,
          message: '通知方式不存在'
        });
      }

      await db
        .update(notificationMethods)
        .set({
          isEnabled: enabled,
          updatedAt: new Date()
        })
        .where(eq(notificationMethods.id, id));

      // 清除缓存
      notificationService.clearCache(existing[0].alertRuleId);

      return reply.send({
        code: 0,
        message: 'success',
        data: { id, isEnabled: enabled }
      });
    } catch (error) {
      logger.error('切换通知方式状态失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '切换通知方式状态失败',
        error: error.message
      });
    }
  });

  // ==================== 通知发送 ====================

  /**
   * 发送通知（指定告警规则）
   */
  fastify.post('/notifications/send', async (request, reply) => {
    try {
      const { alertId, alertRuleId, alertData } = request.body;

      if (!alertRuleId || !alertData) {
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数'
        });
      }

      const result = await notificationService.sendAlertNotification(
        alertId,
        alertRuleId,
        alertData
      );

      return reply.send({
        code: 0,
        message: 'success',
        data: result
      });
    } catch (error) {
      logger.error('发送通知失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '发送通知失败',
        error: error.message
      });
    }
  });

  /**
   * 测试通知
   */
  fastify.post('/notifications/test', async (request, reply) => {
    try {
      const { methodType, config } = request.body;

      if (!methodType) {
        return reply.status(400).send({
          code: -1,
          message: '缺少通知方式类型'
        });
      }

      const result = await notificationService.testNotification(methodType, config || {});

      return reply.send({
        code: 0,
        message: 'success',
        data: result
      });
    } catch (error) {
      logger.error('测试通知失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '测试通知失败',
        error: error.message
      });
    }
  });

  // ==================== 获取通知模板 ====================

  /**
   * 获取默认通知模板
   */
  fastify.get('/notifications/templates/default/:methodType', async (request, reply) => {
    try {
      const { methodType } = request.params;

      const template = notificationService.getDefaultTemplate(methodType);

      return reply.send({
        code: 0,
        message: 'success',
        data: { methodType, template }
      });
    } catch (error) {
      logger.error('获取默认模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取默认模板失败',
        error: error.message
      });
    }
  });
};
