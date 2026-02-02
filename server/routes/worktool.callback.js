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

  // WorkTool 标准响应格式（按照 WorkTool 规范）
  const successResponse = (data = {}, message = 'success') => ({
    code: 0,
    message: message,
    data
  });

  const errorResponse = (code = -1, message = 'error', data = null) => ({
    code,
    message: message,
    data
  });

  const redis = await redisClient.getClient();
  const idempotencyChecker = new IdempotencyChecker(redis);
  const auditLogger = new AuditLogger(redis);

  // 签名校验中间件
  const verifySignatureMiddleware = async (request, reply) => {
    const signature = request.headers['x-signature'];
    const payload = request.body;

    const secret = config.get('callback.signatureSecret');
    
    if (!verifySignature(payload, signature, secret)) {
      return reply.status(403).send(errorResponse(403, '签名验证失败'));
    }
  };

  // 熔断器检查中间件
  const circuitBreakerMiddleware = async (request, reply) => {
    const alertService = require('../services/alert.service');
    const isOpen = await alertService.isCircuitBreakerOpen();

    if (isOpen) {
      return reply.status(503).send(errorResponse(503, '服务暂时不可用（熔断中）'));
    }
  };

  /**
   * 消息回调（WorkTool QA问答接口 - 高级能力）
   * 
   * 请求参数：
   * - spoken: 问题文本
   * - rawSpoken: 原始问题文本
   * - receivedName: 提问者名称
   * - groupName: QA所在群名
   * - groupRemark: QA所在群备注名
   * - roomType: 房间类型（1=外部群 2=外部联系人 3=内部群 4=内部联系人）
   * - atMe: 是否@机器人
   * - textType: 消息类型（0=未知 1=文本 2=图片 3=语音等）
   * - fileBase64: 图片base64（可选）
   * 
   * 响应格式：
   * - code: 0 表示成功，-1或其他值表示失败
   * - message: 对本次接口调用的信息描述
   */
  fastify.post('/message', {
    preHandler: [verifySignatureMiddleware, circuitBreakerMiddleware]
  }, async (request, reply) => {
    const requestId = generateRequestId();
    const callbackData = request.body;
    
    try {
      // 记录审计日志
      await auditLogger.log('message_callback', 'worktool', {
        requestId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'message'
      });

      // 立即返回响应，异步处理消息
      setImmediate(async () => {
        try {
          await handleMessageAsync(callbackData, requestId);
        } catch (error) {
          console.error('异步处理消息失败:', error);
          await monitorService.recordSystemMetric('callback_error', 1, {
            type: 'message',
            error: error.message
          });
        }
      });

      // 立即返回成功响应（确保3秒内响应）
      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理消息回调失败:', error);
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'message',
        error: error.message
      });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 异步处理消息
   */
  async function handleMessageAsync(callbackData, requestId) {
    // 幂等性检查
    const idempotencyKey = `callback:message:${callbackData.spoken}_${callbackData.receivedName}_${requestId}`;
    const isAllowed = await idempotencyChecker.check(idempotencyKey);
    
    if (!isAllowed) {
      console.log('重复回调，已处理:', callbackData);
      return;
    }

    // 映射 WorkTool 参数到内部格式
    const message = {
      messageId: requestId,
      spoken: callbackData.spoken,
      rawSpoken: callbackData.rawSpoken,
      fromName: callbackData.receivedName,
      groupName: callbackData.groupName,
      groupRemark: callbackData.groupRemark,
      roomType: callbackData.roomType,
      atMe: callbackData.atMe,
      textType: callbackData.textType,
      fileBase64: callbackData.fileBase64,
      timestamp: new Date().toISOString()
    };

    // 决策处理
    const decision = await decisionService.makeDecision(message, {
      userId: callbackData.receivedName,
      groupId: callbackData.groupName,
      userName: callbackData.receivedName,
      groupName: callbackData.groupName,
      roomType: callbackData.roomType,
      atMe: callbackData.atMe,
      message
    });

    // 记录决策结果
    await monitorService.recordSystemMetric('callback_processed', 1, {
      type: 'message',
      action: decision.action
    });

    // 记录数据
    await reportService.recordRecord({
      groupName: callbackData.groupName || '',
      userName: callbackData.receivedName,
      userId: callbackData.receivedName,
      groupId: callbackData.groupName,
      questionContent: callbackData.spoken,
      intent: decision.intent?.intent || '',
      aiReply: decision.reply || '',
      humanIntervention: decision.action === 'takeover_human' ? 1 : 0,
      action: decision.action,
      reason: decision.reason
    });

    // 记录群和用户指标
    await monitorService.recordGroupMetric(callbackData.groupName, 'messages', 1);
    await monitorService.recordUserMetric(callbackData.receivedName, callbackData.groupName, 'messages', 1);
    await monitorService.recordSystemMetric(`intent_${decision.intent?.intent || 'unknown'}`, 1);

    // 记录机器人指标
    const robotId = config.get('worktool.robotId', 'default');
    await monitorService.recordRobotMetric(robotId, 'messages', 1, {
      groupName: callbackData.groupName,
      userName: callbackData.receivedName,
      action: decision.action
    });

    // 如果需要回复，调用 WorkTool 发送消息接口
    if (decision.reply && decision.action === 'auto_reply') {
      await sendWorkToolMessage(callbackData.groupName, callbackData.receivedName, decision.reply, callbackData.roomType);
    }
  }

  /**
   * 发送 WorkTool 消息
   */
  async function sendWorkToolMessage(groupName, userName, content, roomType) {
    try {
      // 获取 WorkTool 配置
      const worktoolConfig = config.get('worktool');
      
      if (!worktoolConfig.apiBaseUrl || !worktoolConfig.apiKey) {
        console.warn('WorkTool 配置不完整，无法发送消息');
        return;
      }

      // 根据房间类型确定接收者
      let toId, toType;
      if (roomType == 1 || roomType == 3) {
        // 群聊
        toId = groupName;
        toType = 'group';
      } else {
        // 单聊
        toId = userName;
        toType = 'single';
      }

      // 调用 WorkTool 发送消息接口
      // 注意：这里需要根据实际的 WorkTool API 文档来实现
      console.log('发送消息到 WorkTool:', {
        toId,
        toType,
        content
      });

      // TODO: 实现实际的 WorkTool 发送消息接口调用
      // const response = await fetch(`${worktoolConfig.apiBaseUrl}/send/message`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${worktoolConfig.apiKey}`
      //   },
      //   body: JSON.stringify({
      //     to_id: toId,
      //     to_type: toType,
      //     content: content
      //   })
      // });

      await monitorService.recordSystemMetric('message_sent', 1, {
        toType
      });
    } catch (error) {
      console.error('发送 WorkTool 消息失败:', error);
      await monitorService.recordSystemMetric('message_error', 1, {
        error: error.message
      });
    }
  }

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
        return reply.send(successResponse({}, '重复回调，已处理'));
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

      reply.send(successResponse({
        requestId
      }, '指令执行结果处理成功'));

    } catch (error) {
      console.error('处理指令执行结果回调失败:', error);
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'action_result',
        error: error.message
      });

      reply.status(500).send(errorResponse(500, error.message));
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
        return reply.send(successResponse({}, '重复回调，已处理'));
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

      reply.send(successResponse({
        requestId
      }, '群二维码处理成功'));

    } catch (error) {
      console.error('处理群二维码回调失败:', error);
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'group_qrcode',
        error: error.message
      });

      reply.status(500).send(errorResponse(500, error.message));
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
        return reply.send(successResponse({}, '重复回调，已处理'));
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

      reply.send(successResponse({
        requestId
      }, '机器人状态更新成功'));

    } catch (error) {
      console.error('处理机器人状态回调失败:', error);
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'robot_status',
        error: error.message
      });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });
};

module.exports = worktoolCallbackRoutes;
