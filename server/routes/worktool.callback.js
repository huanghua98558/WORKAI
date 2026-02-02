/**
 * WorkTool 回调路由
 * 统一处理所有 WorkTool 回调
 */

const worktoolCallbackRoutes = async function (fastify, options) {
  const {
    verifySignature,
    generateRequestId,
    IdempotencyChecker,
    AuditLogger
  } = require('../lib/utils');
  const redisClient = require('../lib/redis');
  const decisionService = require('../services/decision.service');
  const monitorService = require('../services/monitor.service');
  const reportService = require('../services/report.service');
  const sessionService = require('../services/session.service');
  const config = require('../lib/config');

  const redis = redisClient.getClient();
  const idempotencyChecker = new IdempotencyChecker(redis);
  const auditLogger = new AuditLogger(redis);

  // 签名校验中间件
  const verifySignatureMiddleware = async (request, reply) => {
    const signature = request.headers['x-signature'];
    const payload = request.body;

    const secret = config.get('callback.signatureSecret');
    
    if (!verifySignature(payload, signature, secret)) {
      return reply.status(403).send({
        success: false,
        error: '签名验证失败'
      });
    }
  };

  // 熔断器检查中间件
  const circuitBreakerMiddleware = async (request, reply) => {
    const alertService = require('../services/alert.service');
    const isOpen = await alertService.isCircuitBreakerOpen();

    if (isOpen) {
      return reply.status(503).send({
        success: false,
        error: '服务暂时不可用（熔断中）'
      });
    }
  };

  /**
   * 消息回调
   */
  fastify.post('/message', {
    preHandler: [verifySignatureMiddleware, circuitBreakerMiddleware]
  }, async (request, reply) => {
    const requestId = generateRequestId();
    const callbackData = request.body;
    
    try {
      // 幂等性检查
      const idempotencyKey = `callback:message:${callbackData.message_id || requestId}`;
      const isAllowed = await idempotencyChecker.check(idempotencyKey);
      
      if (!isAllowed) {
        return reply.send({ success: true, message: '重复回调，已处理' });
      }

      // 记录审计日志
      await auditLogger.log('message_callback', 'worktool', {
        requestId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'message'
      });

      // 提取消息信息
      const message = {
        messageId: callbackData.message_id,
        fromType: callbackData.from_type,
        fromId: callbackData.from_id,
        fromName: callbackData.from_name,
        toType: callbackData.to_type,
        toId: callbackData.to_id,
        content: callbackData.content,
        messageType: callbackData.message_type,
        timestamp: callbackData.timestamp || new Date().toISOString()
      };

      // 决策处理
      const decision = await decisionService.makeDecision(message, {
        userId: message.fromId,
        groupId: message.toId,
        userName: message.fromName,
        groupName: callbackData.to_name || '',
        toType: message.toType,
        message
      });

      // 记录决策结果
      await monitorService.recordSystemMetric('callback_processed', 1, {
        type: 'message',
        action: decision.action
      });

      // 记录数据
      await reportService.recordRecord({
        groupName: callbackData.to_name || '',
        userName: message.fromName,
        userId: message.fromId,
        groupId: message.toId,
        questionContent: message.content,
        intent: decision.intent?.intent || '',
        aiReply: decision.reply || '',
        humanIntervention: decision.action === 'takeover_human' ? 1 : 0,
        action: decision.action,
        reason: decision.reason
      });

      // 记录群和用户指标
      await monitorService.recordGroupMetric(message.toId, 'messages', 1);
      await monitorService.recordUserMetric(message.fromId, message.toId, 'messages', 1);
      await monitorService.recordSystemMetric(`intent_${decision.intent?.intent || 'unknown'}`, 1);

      reply.send({
        success: true,
        requestId,
        decision
      });

    } catch (error) {
      console.error('处理消息回调失败:', error);
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'message',
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 指令执行结果回调
   */
  fastify.post('/action-result', {
    preHandler: [verifySignatureMiddleware]
  }, async (request, reply) => {
    const requestId = generateRequestId();
    const callbackData = request.body;

    try {
      // 幂等性检查
      const idempotencyKey = `callback:action:${callbackData.action_id || requestId}`;
      const isAllowed = await idempotencyChecker.check(idempotencyKey);
      
      if (!isAllowed) {
        return reply.send({ success: true, message: '重复回调，已处理' });
      }

      // 记录审计日志
      await auditLogger.log('action_callback', 'worktool', {
        requestId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'action_result'
      });

      // 更新会话状态（如果有会话ID）
      if (callbackData.session_id) {
        const session = await sessionService.getSession(callbackData.session_id);
        if (session) {
          await sessionService.updateSession(callbackData.session_id, {
            lastActionResult: callbackData
          });
        }
      }

      // 如果执行失败，记录告警
      if (!callbackData.success) {
        const alertService = require('../services/alert.service');
        await alertService.triggerAlert('action_failed', {
          actionType: callbackData.action_type,
          error: callbackData.error,
          requestId
        });
      }

      await monitorService.recordSystemMetric('callback_processed', 1, {
        type: 'action_result',
        success: callbackData.success
      });

      reply.send({
        success: true,
        requestId
      });

    } catch (error) {
      console.error('处理指令执行结果回调失败:', error);
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'action_result',
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 群二维码回调
   */
  fastify.post('/group-qrcode', {
    preHandler: [verifySignatureMiddleware]
  }, async (request, reply) => {
    const requestId = generateRequestId();
    const callbackData = request.body;

    try {
      // 幂等性检查
      const idempotencyKey = `callback:qrcode:${callbackData.group_id}_${requestId}`;
      const isAllowed = await idempotencyChecker.check(idempotencyKey);
      
      if (!isAllowed) {
        return reply.send({ success: true, message: '重复回调，已处理' });
      }

      // 记录审计日志
      await auditLogger.log('qrcode_callback', 'worktool', {
        requestId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'group_qrcode'
      });

      // 更新群的二维码信息
      const qrcodeKey = `group:qrcode:${callbackData.group_id}`;
      await redis.setex(qrcodeKey, 86400 * 7, JSON.stringify({
        qrcodeUrl: callbackData.qrcode_url,
        expireTime: callbackData.expire_time,
        updateTime: new Date().toISOString()
      }));

      reply.send({
        success: true,
        requestId
      });

    } catch (error) {
      console.error('处理群二维码回调失败:', error);
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'group_qrcode',
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 机器人上下线回调
   */
  fastify.post('/robot-status', {
    preHandler: [verifySignatureMiddleware]
  }, async (request, reply) => {
    const requestId = generateRequestId();
    const callbackData = request.body;

    try {
      // 幂等性检查
      const idempotencyKey = `callback:robot:${callbackData.robot_id}_${callbackData.status}_${requestId}`;
      const isAllowed = await idempotencyChecker.check(idempotencyKey);
      
      if (!isAllowed) {
        return reply.send({ success: true, message: '重复回调，已处理' });
      }

      // 记录审计日志
      await auditLogger.log('robot_status_callback', 'worktool', {
        requestId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'robot_status'
      });

      // 更新机器人状态
      const statusKey = 'robot:status';
      await redis.setex(statusKey, 3600, JSON.stringify({
        robotId: callbackData.robot_id,
        status: callbackData.status,
        lastUpdate: new Date().toISOString()
      }));

      // 如果是掉线事件，触发告警
      if (callbackData.status === 'offline' || callbackData.status === 'heartbeat_error') {
        const alertService = require('../services/alert.service');
        await alertService.triggerAlert('robot_offline', {
          robotId: callbackData.robot_id,
          status: callbackData.status,
          requestId
        });
      }

      reply.send({
        success: true,
        requestId
      });

    } catch (error) {
      console.error('处理机器人状态回调失败:', error);
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'robot_status',
        error: error.message
      });

      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

module.exports = worktoolCallbackRoutes;
