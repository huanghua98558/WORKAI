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
  const robotService = require('../services/robot.service');
  const worktoolService = require('../services/worktool.service');
  const { db } = require('../database');
  const { callbackHistory } = require('../database/schema');
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
   * 记录回调历史
   */
  async function recordCallbackHistory(robotId, type, messageId, errorCode = 0, errorMsg = '', extraData = {}) {
    try {
      await db.insert(callbackHistory).values({
        robotId,
        type: String(type),
        messageId,
        errorCode,
        errorMsg,
        responseTime: extraData.responseTime || 0,
        extraData: JSON.stringify(extraData),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('记录回调历史失败:', error);
    }
  }

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
    const startTime = Date.now();
    const requestId = generateRequestId();
    const callbackData = request.body;
    const { robotId } = request.query;

    try {
      // 验证 robotId
      if (!robotId) {
        console.error('缺少 robotId 参数');
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory('', '11', requestId, 400, '缺少 robotId 参数', { responseTime });
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 查询机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        console.error('机器人不存在:', robotId);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, '11', requestId, 404, `机器人不存在: ${robotId}`, { responseTime });
        return reply.status(404).send(errorResponse(404, `机器人不存在: ${robotId}`));
      }

      if (!robot.isActive) {
        console.error('机器人未启用:', robotId);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, '11', requestId, 403, `机器人未启用: ${robotId}`, { responseTime });
        return reply.status(403).send(errorResponse(403, `机器人未启用: ${robotId}`));
      }

      // 记录审计日志
      await auditLogger.log('message_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'message',
        robotId
      });

      // 立即返回响应，异步处理消息
      setImmediate(async () => {
        try {
          await handleMessageAsync(callbackData, requestId, robot);
        } catch (error) {
          console.error('异步处理消息失败:', error);
          await monitorService.recordSystemMetric('callback_error', 1, {
            type: 'message',
            robotId,
            error: error.message
          });
        }
      });

      // 记录成功
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '11', requestId, 0, '', { responseTime });

      // 立即返回成功响应（确保3秒内响应）
      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理消息回调失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '11', requestId, 500, error.message, { responseTime });
      
      await monitorService.recordSystemMetric('callback_error', 1, {
        type: 'message',
        robotId,
        error: error.message
      });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 异步处理消息
   */
  async function handleMessageAsync(callbackData, requestId, robot) {
    // 幂等性检查
    const idempotencyKey = `callback:message:${robot.robotId}_${callbackData.spoken}_${callbackData.receivedName}_${requestId}`;
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
      robotId: robot.robotId,
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
      confidence: decision.intent?.confidence || 0,
      action: decision.action,
      response: decision.response,
      createdAt: new Date()
    });

    // 更新会话上下文
    await sessionService.updateSession({
      sessionId: `${callbackData.groupName}_${callbackData.receivedName}`,
      groupName: callbackData.groupName,
      userName: callbackData.receivedName,
      lastIntent: decision.intent?.intent || '',
      lastQuestion: callbackData.spoken,
      lastResponse: decision.response,
      updatedAt: new Date()
    });

    // 执行决策结果（发送消息等）
    if (decision.action === 'reply' && decision.response) {
      await worktoolService.sendMessage({
        robotId: robot.robotId,
        toWxId: callbackData.receivedName,
        content: decision.response,
        atWxId: callbackData.atMe ? callbackData.receivedName : undefined
      });
    }
  }

  /**
   * 指令结果回调
   * 
   * 请求参数：
   * - messageId: 消息ID
   * - command: 指令内容
   * - status: 状态（success/fail）
   * - result: 执行结果
   */
  fastify.post('/result', {
    preHandler: [verifySignatureMiddleware]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const callbackData = request.body;
    const { robotId } = request.query;

    try {
      // 验证 robotId
      if (!robotId) {
        console.error('缺少 robotId 参数');
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory('', '1', requestId, 400, '缺少 robotId 参数', { responseTime });
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 查询机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        console.error('机器人不存在:', robotId);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, '1', requestId, 404, `机器人不存在: ${robotId}`, { responseTime });
        return reply.status(404).send(errorResponse(404, `机器人不存在: ${robotId}`));
      }

      // 记录审计日志
      await auditLogger.log('result_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'result',
        robotId
      });

      // 记录回调历史
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '1', callbackData.messageId || requestId, 0, '', { 
        responseTime,
        command: callbackData.command,
        status: callbackData.status,
        result: callbackData.result
      });

      // 处理指令结果（记录到数据库、触发后续流程等）
      // TODO: 根据业务需求处理指令结果

      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理指令结果回调失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '1', requestId, 500, error.message, { responseTime });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 群二维码回调
   * 
   * 请求参数：
   * - groupId: 群ID
   * - groupName: 群名称
   * - qrcodeUrl: 二维码URL
   */
  fastify.post('/group-qrcode', {
    preHandler: [verifySignatureMiddleware]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const callbackData = request.body;
    const { robotId } = request.query;

    try {
      // 验证 robotId
      if (!robotId) {
        console.error('缺少 robotId 参数');
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory('', '0', requestId, 400, '缺少 robotId 参数', { responseTime });
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 查询机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        console.error('机器人不存在:', robotId);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, '0', requestId, 404, `机器人不存在: ${robotId}`, { responseTime });
        return reply.status(404).send(errorResponse(404, `机器人不存在: ${robotId}`));
      }

      // 记录审计日志
      await auditLogger.log('group_qrcode_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'group_qrcode',
        robotId
      });

      // 记录回调历史
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '0', requestId, 0, '', { 
        responseTime,
        groupId: callbackData.groupId,
        groupName: callbackData.groupName,
        qrcodeUrl: callbackData.qrcodeUrl
      });

      // 处理群二维码（保存到数据库等）
      // TODO: 根据业务需求处理群二维码

      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理群二维码回调失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '0', requestId, 500, error.message, { responseTime });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 机器人状态回调（上线/下线）
   * 
   * 请求参数：
   * - status: 状态（5=上线 6=下线）
   * - timestamp: 时间戳
   */
  fastify.post('/robot-status', {
    preHandler: [verifySignatureMiddleware]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const callbackData = request.body;
    const { robotId } = request.query;

    try {
      // 验证 robotId
      if (!robotId) {
        console.error('缺少 robotId 参数');
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory('', callbackData.status || '5', requestId, 400, '缺少 robotId 参数', { responseTime });
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 查询机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        console.error('机器人不存在:', robotId);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, callbackData.status || '5', requestId, 404, `机器人不存在: ${robotId}`, { responseTime });
        return reply.status(404).send(errorResponse(404, `机器人不存在: ${robotId}`));
      }

      // 记录审计日志
      await auditLogger.log('robot_status_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'robot_status',
        robotId
      });

      // 记录回调历史
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, String(callbackData.status || '5'), requestId, 0, '', { 
        responseTime,
        status: callbackData.status,
        timestamp: callbackData.timestamp
      });

      // 更新机器人状态
      if (callbackData.status === '5' || callbackData.status === 5) {
        // 机器人上线
        await robotService.updateRobotStatus(robotId, true);
        console.log('机器人上线:', robotId);
      } else if (callbackData.status === '6' || callbackData.status === 6) {
        // 机器人下线
        await robotService.updateRobotStatus(robotId, false);
        console.log('机器人下线:', robotId);
      }

      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理机器人状态回调失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, String(callbackData.status || '5'), requestId, 500, error.message, { responseTime });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });
};

module.exports = worktoolCallbackRoutes;
