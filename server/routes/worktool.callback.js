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
  const { getDb } = require('coze-coding-dev-sdk');
  const redisClient = require('../lib/redis');
  const monitorService = require('../services/monitor.service');
  const reportService = require('../services/report.service');
  const sessionService = require('../services/session.service');
  const robotService = require('../services/robot.service');
  const worktoolService = require('../services/worktool.service');
  const messageProcessingService = require('../services/message-processing.service'); // 新的消息处理服务
  const { flowEngine, TriggerType } = require('../services/flow-engine.service'); // 流程引擎服务
  const { collaborationService, StaffIdentifier } = require('../services/collaboration.service'); // 协同分析服务
  const { callbackHistory, flowDefinitions } = require('../database/schema');
  const { eq } = require('drizzle-orm');
  const config = require('../lib/config');

  // 获取数据库连接
  const db = await getDb();

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
    preHandler: [circuitBreakerMiddleware]  // 移除签名验证，改为可选验证
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const callbackData = request.body;
    const { robotId } = request.query;

    // 详细的请求日志
    console.log('===== 消息回调请求 =====', {
      requestId,
      robotId,
      timestamp: new Date().toISOString(),
      headers: {
        'content-type': request.headers['content-type'],
        'x-signature': request.headers['x-signature'] ? '***' : 'missing',
        'user-agent': request.headers['user-agent']
      },
      callbackData: {
        spoken: callbackData.spoken,
        rawSpoken: callbackData.rawSpoken,
        receivedName: callbackData.receivedName,
        groupName: callbackData.groupName,
        roomType: callbackData.roomType,
        atMe: callbackData.atMe,
        textType: callbackData.textType,
        hasFileBase64: !!callbackData.fileBase64,
        fileBase64Length: callbackData.fileBase64 ? callbackData.fileBase64.length : 0
      }
    });

    try {
      // 验证 robotId
      if (!robotId) {
        console.error('❌ 缺少 robotId 参数');
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory('', '11', requestId, 400, '缺少 robotId 参数', { responseTime });
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 查询机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        console.error(`❌ 机器人不存在: ${robotId}`);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, '11', requestId, 404, `机器人不存在: ${robotId}`, { responseTime });
        return reply.status(404).send(errorResponse(404, `机器人不存在: ${robotId}`));
      }

      if (!robot.isActive) {
        console.error(`❌ 机器人未启用: ${robotId}`);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, '11', requestId, 403, `机器人未启用: ${robotId}`, { responseTime });
        return reply.status(403).send(errorResponse(403, `机器人未启用: ${robotId}`));
      }

      console.log(`✅ 机器人验证通过: ${robot.name} (${robotId})`);

      // 可选的签名验证（仅当配置了密钥时才验证）
      const secret = config.get('callback.signatureSecret');
      if (secret) {
        const signature = request.headers['x-signature'];
        const { verifySignature } = require('../lib/utils');
        
        if (!verifySignature(callbackData, signature, secret)) {
          console.error('❌ 签名验证失败');
          const responseTime = Date.now() - startTime;
          await recordCallbackHistory(robotId, '11', requestId, 403, '签名验证失败', { responseTime });
          return reply.status(403).send(errorResponse(403, '签名验证失败'));
        }
        console.log('✅ 签名验证通过');
      } else {
        console.log('⚠️  签名验证未配置，跳过验证');
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

      console.log('✅ 开始异步处理消息', {
        requestId,
        robotId,
        robotName: robot.name,
        messagePreview: {
          spoken: callbackData.spoken?.substring(0, 50),
          receivedName: callbackData.receivedName,
          groupName: callbackData.groupName
        }
      });

      // 立即返回响应，异步处理消息
      // 使用 async/await 包装 setImmediate 以确保 Promise 正确处理
      (async () => {
        try {
          console.log('✅ 异步处理回调被触发', {
            requestId,
            robotId,
            timestamp: new Date().toISOString()
          });
          
          console.log('📝 开始调用 handleMessageAsync', {
            requestId,
            robotId,
            callbackDataKeys: Object.keys(callbackData)
          });
          
          await handleMessageAsync(callbackData, requestId, robot);
          
          console.log('✅ handleMessageAsync 执行完成', {
            requestId,
            robotId
          });
        } catch (error) {
          console.error('❌ 异步处理消息失败:', {
            requestId,
            robotId,
            error: error.message,
            stack: error.stack,
            errorName: error.name,
            errorCode: error.code,
            errorType: error.constructor?.name
          });
          
          // 记录错误指标，但不抛出异常以防止进程崩溃
          try {
            await monitorService.recordSystemMetric('callback_error', 1, {
              type: 'message',
              robotId,
              error: error.message,
              errorStack: error.stack
            });
          } catch (monitorError) {
            console.error('❌ 记录监控指标失败:', {
              error: monitorError.message,
              originalError: error.message
            });
          }
        }
      })().catch(err => {
        // 最外层捕获，防止任何未处理的 Promise rejection
        console.error('❌ 未处理的异步错误（最外层捕获）:', {
          requestId,
          robotId,
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
      });

      // 记录成功
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '11', requestId, 0, '', { responseTime });

      console.log(`✅ 回调响应已发送 (耗时: ${responseTime}ms)`, {
        requestId,
        robotId
      });

      // 立即返回成功响应（确保3秒内响应）
      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('❌ 处理消息回调失败:', {
        requestId,
        robotId,
        error: error.message,
        stack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        errorType: error.constructor?.name
      });
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

  // 别名路由：/action-result -> /result（兼容 WorkTool 的指令结果回调）
  fastify.post('/action-result', {
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
      await auditLogger.log('action_result_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'action_result',
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
      // 根据 callbackData 中的关联信息查找对应的指令并更新状态
      console.log('[指令回调] 收到指令执行结果', {
        requestId,
        robotId,
        callbackData: {
          messageId: callbackData.messageId,
          command: callbackData.command,
          status: callbackData.status,
          result: callbackData.result
        }
      });

      // 尝试通过 messageId 查找对应的指令
      // 注意：目前 callbackData 中可能没有直接的字段关联到 commandId
      // 我们需要根据业务逻辑来确定如何关联
      // 这里假设 callbackData 中的 command 包含指令的相关信息
      const robotCommandService = require('../services/robot-command.service');

      // TODO: 根据实际的回调数据格式，找到对应的 commandId 并更新状态
      // 可能的方案：
      // 1. 在 commandData 中保存 correlationId，回调时通过这个 ID 查找
      // 2. 通过 messageId 和 commandType 查找最近的相关指令
      // 3. 在发送指令时，将 commandId 传递给机器人，回调时返回

      console.log('[指令回调] 指令结果回调处理完成', {
        requestId,
        robotId,
        message: '指令结果已接收（状态更新功能待完善）'
      });

      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理指令结果回调失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '1', requestId, 500, error.message, { responseTime });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  // 别名路由：/command -> /result（兼容性路由）
  fastify.post('/command', {
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
      await auditLogger.log('command_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'command',
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

      // 处理指令结果（通过回调更新指令状态）
      console.log('[指令回调] 收到指令执行结果', {
        requestId,
        robotId,
        callbackData: {
          messageId: callbackData.messageId,
          msgId: callbackData.msgId,
          command: callbackData.command,
          status: callbackData.status,
          result: callbackData.result,
          timestamp: callbackData.timestamp
        }
      });

      const robotCommandService = require('../services/robot-command.service');

      // 获取 messageId（可能是 messageId 或 msgId）
      const messageId = callbackData.messageId || callbackData.msgId;

      if (!messageId) {
        console.warn('[指令回调] 回调数据中没有 messageId，无法关联到指令', { callbackData });
        return reply.send(successResponse({}, 'success'));
      }

      // 通过 messageId 查找对应的指令
      try {
        const command = await robotCommandService.getCommandByMessageId(messageId);

        if (!command) {
          console.warn('[指令回调] 未找到对应的指令', { messageId, robotId });
          return reply.send(successResponse({}, 'success'));
        }

        console.log('[指令回调] 找到对应的指令', {
          messageId,
          commandId: command.id,
          robotId: command.robotId,
          commandType: command.commandType,
          currentStatus: command.status
        });

        // 根据回调结果更新指令状态
        const isSuccess = callbackData.status === 'success' || callbackData.status === 'completed' || callbackData.success === true;

        if (isSuccess) {
          await robotCommandService.updateCommandStatus(command.id, 'completed', {
            result: callbackData.result || { success: true, message: '执行成功' },
            errorMessage: null
          });

          console.log('[指令回调] 指令状态已更新为 completed', {
            commandId: command.id,
            messageId
          });
        } else {
          // 执行失败
          const errorMessage = callbackData.errorMessage || callbackData.message || '执行失败';

          await robotCommandService.updateCommandStatus(command.id, 'failed', {
            errorMessage,
            result: callbackData.result
          });

          console.log('[指令回调] 指令状态已更新为 failed', {
            commandId: command.id,
            messageId,
            errorMessage
          });
        }
      } catch (error) {
        console.error('[指令回调] 处理指令状态更新失败:', error);
        // 即使更新失败，也返回成功，避免重复回调
      }

      console.log('[指令回调] 指令结果回调处理完成', {
        requestId,
        robotId,
        messageId
      });

      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理指令结果回调失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '1', requestId, 500, error.message, { responseTime });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 异步处理消息
   */
  async function handleMessageAsync(callbackData, requestId, robot) {
    console.log('[回调处理] ===== handleMessageAsync 开始 =====', {
      requestId,
      robotId: robot?.robotId,
      robotName: robot?.name,
      callbackData: {
        spoken: callbackData.spoken,
        receivedName: callbackData.receivedName,
        groupName: callbackData.groupName,
        atMe: callbackData.atMe
      }
    });

    try {
      // 幂等性检查
      const idempotencyKey = `callback:message:${robot.robotId}_${callbackData.spoken}_${callbackData.receivedName}_${requestId}`;
      console.log('[回调处理] 幂等性检查', {
        idempotencyKey,
        spoken: callbackData.spoken,
        receivedName: callbackData.receivedName
      });
      
      const isAllowed = await idempotencyChecker.check(idempotencyKey);
      console.log('[回调处理] 幂等性检查结果', {
        isAllowed,
        idempotencyKey
      });

      if (!isAllowed) {
        console.log('[回调处理] 重复回调，已处理', {
          callbackData,
          idempotencyKey
        });
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

      console.log('[回调处理] 映射后的消息对象', {
        messageId: message.messageId,
        spoken: message.spoken,
        fromName: message.fromName,
        groupName: message.groupName,
        timestamp: message.timestamp
      });

      // 协同分析：信息检测
      try {
        const sessionId = message.groupName ? `session_${message.groupName}` : `session_${message.fromName}`;

        // 1. 检测群组信息
        if (message.groupName) {
          const groupInfo = await collaborationService.detectGroupInfo({
            groupId: message.groupName,
            groupName: message.groupName,
            groupRemark: message.groupRemark,
            robotId: robot.robotId,
            sessionId
          });

          console.log('[协同分析] 群组信息检测完成', {
            groupId: groupInfo.groupId,
            groupName: groupInfo.groupName,
            features: groupInfo.features
          });
        }

        // 2. 检测工作人员信息
        const staffDetection = await collaborationService.detectStaffInfo({
          userId: message.fromName,
          userName: message.fromName,
          remarkName: message.groupRemark,
          company: robot.company,
          robotId: robot.robotId,
          sessionId
        });

        console.log('[协同分析] 工作人员信息检测完成', {
          userId: staffDetection.userId,
          isStaff: staffDetection.isStaff,
          roles: staffDetection.roles
        });
      } catch (error) {
        console.error('[协同分析] 信息检测失败（不影响主流程）:', error);
        // 不抛出错误，继续执行主流程
      }

      // 协同分析：检测并记录工作人员消息
      try {
        const sessionId = message.groupName ? `session_${message.groupName}` : `session_${message.fromName}`;
        const staffResult = await collaborationService.handleStaffMessage({
          sessionId,
          robotId: robot.robotId,
          messageId: message.messageId,
          fromName: message.fromName,
          groupName: message.groupName,
          remarkName: message.groupRemark,
          company: robot.company, // 从机器人配置获取公司信息
          userId: message.fromName, // 使用 fromName 作为 userId
          messageContent: message.spoken,
          messageType: message.textType === 1 ? 'text' : 'unknown',
          isReply: true // 工作人员发送的消息通常视为回复
        });

        if (staffResult.isStaff) {
          console.log('[协同分析] 工作人员消息已记录', {
            staffUserId: staffResult.staffInfo.staffUserId,
            staffName: staffResult.staffInfo.staffName,
            recordResults: staffResult.recordResults
          });
        }
      } catch (error) {
        console.error('[协同分析] 处理工作人员消息失败（不影响主流程）:', error);
        // 不抛出错误，继续执行主流程
      }

      // 使用智能流程路由器选择流程
      console.log('[流程引擎] 开始流程路由', {
        robotId: robot.robotId,
        triggerType: TriggerType.WEBHOOK,
        message: {
          messageId: message.messageId,
          spoken: message.spoken?.substring(0, 50),
          fromName: message.fromName
        }
      });

      // 路由流程（使用默认策略：DEFAULT_FIRST，优先执行默认流程）
      const selectedFlows = await flowEngine.routeFlows({
        robotId: robot.robotId,
        triggerType: TriggerType.WEBHOOK,
        message,
        strategy: 'default_first' // 使用默认流程优先策略
      });

      console.log('[流程引擎] 路由结果', {
        flowCount: selectedFlows.length,
        flows: selectedFlows.map(f => ({
          id: f.id,
          name: f.name,
          isDefault: f.isDefault
        }))
      });

      // 执行路由后的流程
      if (selectedFlows.length > 0) {
        console.log('[流程引擎] 使用流程引擎处理消息', {
          flowCount: selectedFlows.length
        });

        const instances = await flowEngine.executeRoutedFlows(
          selectedFlows,
          {
            message,
            robot,
            requestId
          },
          {
            messageId: message.messageId,
            robotId: robot.robotId,
            groupName: message.groupName
          }
        );

        console.log('[流程引擎] 流程实例创建完成', {
          instanceCount: instances.length,
          instanceIds: instances.map(i => i.id)
        });

        // 记录决策结果（流程引擎模式）
        await monitorService.recordSystemMetric('callback_processed', 1, {
          type: 'message',
          robotId: robot.robotId,
          action: 'flow_engine',
          flowCount: selectedFlows.length,
          instanceCount: instances.length
        });

        console.log('[流程引擎] ===== handleMessageAsync 完成（流程引擎模式） =====', {
          requestId,
          robotId: robot.robotId,
          flowCount: selectedFlows.length,
          instanceCount: instances.length
        });
        return;
      }

      // 如果没有找到匹配的流程定义，使用原有的消息处理服务
      console.log('[回调处理] 未找到匹配的流程定义，使用原有消息处理服务', {
        robotId: robot.robotId
      });
      
      // 使用新的消息处理服务
      console.log('[回调处理] 准备调用 messageProcessingService.processMessage', {
        robotId: robot.robotId,
        messageId: message.messageId
      });
      
      const decision = await messageProcessingService.processMessage(message, robot);
      
      console.log('[回调处理] processMessage 执行完成', {
        decision,
        action: decision?.action,
        reply: decision?.reply ? decision.reply.substring(0, 100) : ''
      });

      // 记录决策结果
      await monitorService.recordSystemMetric('callback_processed', 1, {
        type: 'message',
        robotId: robot.robotId,
        action: decision.action
      });

      // 记录数据到报告服务
      await reportService.recordRecord({
        groupName: callbackData.groupName || '',
        userName: callbackData.receivedName,
        userId: callbackData.receivedName,
        groupId: callbackData.groupName,
        questionContent: callbackData.spoken,
        intent: decision.intent?.intent || '',
        confidence: decision.intent?.confidence || 0,
        action: decision.action,
        response: decision.reply,
        createdAt: new Date()
      });

      console.log('[回调处理] ===== handleMessageAsync 完成（原有模式） =====', {
        requestId,
        robotId: robot.robotId,
        action: decision.action
      });
    } catch (error) {
      console.error('[回调处理] ===== handleMessageAsync 失败 =====', {
        requestId,
        robotId: robot?.robotId,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        errorStack: error.stack,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      });
      
      // 记录错误指标，但不抛出异常以防止进程崩溃
      try {
        await monitorService.recordSystemMetric('callback_processing_error', 1, {
          type: 'message',
          robotId: robot?.robotId,
          error: error.message,
          errorStack: error.stack
        });
      } catch (monitorError) {
        console.error('❌ 记录监控指标失败:', {
          error: monitorError.message,
          originalError: error.message
        });
      }
      
      // 不抛出异常，只记录日志
      console.log('[回调处理] 错误已记录，继续处理其他消息');
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

      // 处理指令结果（通过回调更新指令状态）
      console.log('[指令回调] 收到指令执行结果', {
        requestId,
        robotId,
        callbackData: {
          messageId: callbackData.messageId,
          msgId: callbackData.msgId,
          command: callbackData.command,
          status: callbackData.status,
          result: callbackData.result,
          timestamp: callbackData.timestamp
        }
      });

      const robotCommandService = require('../services/robot-command.service');

      // 获取 messageId（可能是 messageId 或 msgId）
      const messageId = callbackData.messageId || callbackData.msgId;

      if (!messageId) {
        console.warn('[指令回调] 回调数据中没有 messageId，无法关联到指令', { callbackData });
        return reply.send(successResponse({}, 'success'));
      }

      // 通过 messageId 查找对应的指令
      try {
        const command = await robotCommandService.getCommandByMessageId(messageId);

        if (!command) {
          console.warn('[指令回调] 未找到对应的指令', { messageId, robotId });
          return reply.send(successResponse({}, 'success'));
        }

        console.log('[指令回调] 找到对应的指令', {
          messageId,
          commandId: command.id,
          robotId: command.robotId,
          commandType: command.commandType,
          currentStatus: command.status
        });

        // 根据回调结果更新指令状态
        const isSuccess = callbackData.status === 'success' || callbackData.status === 'completed' || callbackData.success === true;

        if (isSuccess) {
          await robotCommandService.updateCommandStatus(command.id, 'completed', {
            result: callbackData.result || { success: true, message: '执行成功' },
            errorMessage: null
          });

          console.log('[指令回调] 指令状态已更新为 completed', {
            commandId: command.id,
            messageId
          });
        } else {
          // 执行失败
          const errorMessage = callbackData.errorMessage || callbackData.message || '执行失败';

          await robotCommandService.updateCommandStatus(command.id, 'failed', {
            errorMessage,
            result: callbackData.result
          });

          console.log('[指令回调] 指令状态已更新为 failed', {
            commandId: command.id,
            messageId,
            errorMessage
          });
        }
      } catch (error) {
        console.error('[指令回调] 处理指令状态更新失败:', error);
        // 即使更新失败，也返回成功，避免重复回调
      }

      console.log('[指令回调] 指令结果回调处理完成', {
        requestId,
        robotId,
        messageId
      });

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

  // 别名路由：/qrcode -> /group-qrcode（兼容性路由）
  fastify.post('/qrcode', {
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
      await auditLogger.log('qrcode_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'qrcode',
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
   * 机器人上线回调
   * 
   * 请求参数：
   * - status: 状态（5=上线）
   * - timestamp: 时间戳
   */
  fastify.post('/robot-online', {
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
        await recordCallbackHistory('', '5', requestId, 400, '缺少 robotId 参数', { responseTime });
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 查询机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        console.error('机器人不存在:', robotId);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, '5', requestId, 404, `机器人不存在: ${robotId}`, { responseTime });
        return reply.status(404).send(errorResponse(404, `机器人不存在: ${robotId}`));
      }

      // 记录审计日志
      await auditLogger.log('robot_online_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'robot_online',
        robotId
      });

      // 记录回调历史
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '5', requestId, 0, '', { 
        responseTime,
        status: callbackData.status,
        timestamp: callbackData.timestamp
      });

      // 更新机器人状态为在线
      await robotService.updateRobotStatus(robotId, true);
      console.log('机器人上线:', robotId);

      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理机器人上线回调失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '5', requestId, 500, error.message, { responseTime });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 机器人下线回调
   * 
   * 请求参数：
   * - status: 状态（6=下线）
   * - timestamp: 时间戳
   */
  fastify.post('/robot-offline', {
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
        await recordCallbackHistory('', '6', requestId, 400, '缺少 robotId 参数', { responseTime });
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 查询机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        console.error('机器人不存在:', robotId);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, '6', requestId, 404, `机器人不存在: ${robotId}`, { responseTime });
        return reply.status(404).send(errorResponse(404, `机器人不存在: ${robotId}`));
      }

      // 记录审计日志
      await auditLogger.log('robot_offline_callback', 'worktool', {
        requestId,
        robotId,
        callbackData
      });

      // 记录监控指标
      await monitorService.recordSystemMetric('callback_received', 1, {
        type: 'robot_offline',
        robotId
      });

      // 记录回调历史
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '6', requestId, 0, '', { 
        responseTime,
        status: callbackData.status,
        timestamp: callbackData.timestamp
      });

      // 更新机器人状态为离线
      await robotService.updateRobotStatus(robotId, false);
      console.log('机器人下线:', robotId);

      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('处理机器人下线回调失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, '6', requestId, 500, error.message, { responseTime });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 机器人状态回调（上线/下线）- 兼容旧接口
   *
   * 请求参数：
   * - status: 状态（5=上线 6=下线）
   * - timestamp: 时间戳
   *
   * 注意：此端点已废弃，请使用 /status 端点
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

  /**
   * 机器人状态回调（上线/下线）- 标准 WorkTool 接口
   *
   * 请求参数：
   * - status: 状态（5=上线 6=下线）
   * - timestamp: 时间戳
   *
   * WorkTool 规范地址：/api/worktool/callback/status?robotId=xxx
   */
  fastify.post('/status', {
    preHandler: [verifySignatureMiddleware]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const callbackData = request.body;
    const { robotId } = request.query;

    try {
      // 验证 robotId
      if (!robotId) {
        console.error('[STATUS回调] 缺少 robotId 参数');
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory('', callbackData.status || '5', requestId, 400, '缺少 robotId 参数', { responseTime });
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 查询机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        console.error('[STATUS回调] 机器人不存在:', robotId);
        const responseTime = Date.now() - startTime;
        await recordCallbackHistory(robotId, callbackData.status || '5', requestId, 404, `机器人不存在: ${robotId}`, { responseTime });
        return reply.status(404).send(errorResponse(404, `机器人不存在: ${robotId}`));
      }

      console.log('[STATUS回调] 收到机器人状态变化', {
        requestId,
        robotId,
        status: callbackData.status,
        timestamp: callbackData.timestamp
      });

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
      const statusCode = parseInt(callbackData.status);

      if (statusCode === 5) {
        // 机器人上线
        await robotService.updateRobotStatus(robotId, true);
        console.log('[STATUS回调] ✅ 机器人上线:', robotId);
      } else if (statusCode === 6) {
        // 机器人下线
        await robotService.updateRobotStatus(robotId, false);
        console.log('[STATUS回调] ⚠️  机器人下线:', robotId);
      } else {
        console.warn('[STATUS回调] 未知的机器人状态:', {
          robotId,
          status: callbackData.status
        });
      }

      reply.send(successResponse({}, 'success'));

    } catch (error) {
      console.error('[STATUS回调] 处理失败:', error);
      const responseTime = Date.now() - startTime;
      await recordCallbackHistory(robotId, String(callbackData.status || '5'), requestId, 500, error.message, { responseTime });

      reply.status(500).send(errorResponse(500, error.message));
    }
  });
};

module.exports = worktoolCallbackRoutes;
