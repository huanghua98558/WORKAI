/**
 * 消息处理服务
 * 统一消息处理流程：意图识别 → 告警触发（如需要）→ 决策是否回复 → 生成回复 → 发送回复
 */

const aiService = require('./ai.service');
const sessionService = require('./session.service');
const worktoolService = require('./worktool.service');
const executionTrackerService = require('./execution-tracker.service');
const sessionMessageService = require('./session-message.service');
const alertTriggerService = require('./alert-trigger.service');
const config = require('../lib/config');
const logger = require('./system-logger.service');

class MessageProcessingService {
  /**
   * 处理消息的主入口
   * @param {Object} messageData - WorkTool 消息数据
   * @param {Object} robot - 机器人配置
   */
  async processMessage(messageData, robot) {
    const startTime = Date.now();
    const messageContent = messageData.spoken || messageData.content || '';

    logger.info('MessageProcessing', '===== 开始处理消息 =====', {
      robotId: robot.robotId,
      robotName: robot.name,
      userId: messageData.fromName,
      groupId: messageData.groupName,
      content: messageContent.substring(0, 100),
      timestamp: new Date(startTime).toISOString()
    });

    console.log(`[消息处理] 开始处理消息，startTime: ${startTime}, ISO: ${new Date(startTime).toISOString()}`);

    const processingId = executionTrackerService.startProcessing({
      robotId: robot.robotId,
      messageData,
      startTime
    });

    logger.debug('MessageProcessing', '步骤1: 开始执行', { processingId });

    try {
      // 步骤1: 解析消息内容
      logger.info('MessageProcessing', '步骤1: 解析消息内容', { processingId });
      const messageContext = this.parseMessage(messageData);

      logger.debug('MessageProcessing', '步骤1完成: 消息上下文解析成功', {
        contentLength: messageContext.content.length,
        fromName: messageContext.fromName,
        groupName: messageContext.groupName,
        atMe: messageContext.atMe
      });

      // 步骤2: 获取或创建会话
      logger.info('MessageProcessing', '步骤2: 获取或创建会话', { processingId });
      const session = await sessionService.getOrCreateSession(
        messageContext.fromName,
        messageContext.groupName,
        {
          userName: messageContext.fromName,
          groupName: messageContext.groupName,
          roomType: messageContext.roomType
        }
      );

      logger.info('MessageProcessing', '步骤2完成: 会话获取成功', {
        sessionId: session.sessionId,
        isNew: session.isNew,
        messageCount: session.messageCount
      });

      // 步骤3: 添加消息到上下文
      logger.info('MessageProcessing', '步骤3: 添加消息到上下文', { processingId });
      await sessionService.addContext(session.sessionId, {
        content: messageContext.content,
        from_type: messageContext.atMe ? 'user' : 'other',
        timestamp: messageData.timestamp || new Date().toISOString()
      });

      logger.debug('MessageProcessing', '步骤3完成: 消息已添加到上下文', {
        sessionId: session.sessionId,
        contextLength: session.context.length
      });

      // 步骤4: 保存用户消息到数据库
      logger.info('MessageProcessing', '步骤4: 保存用户消息到数据库', { processingId });
      await sessionMessageService.saveUserMessage(
        session.sessionId,
        {
          userId: messageContext.fromName,
          groupId: messageContext.groupName,
          userName: messageContext.fromName,
          content: messageContext.content,
          timestamp: messageData.timestamp || new Date()
        },
        messageData.messageId,
        robot
      );

      logger.info('MessageProcessing', '步骤4完成: 用户消息保存成功', {
        sessionId: session.sessionId,
        messageId: messageData.messageId,
        contentLength: messageContext.content.length
      });

      // 步骤5: AI 意图识别
      logger.info('MessageProcessing', '步骤5: AI 意图识别开始', { processingId });
      executionTrackerService.updateStep(processingId, 'intent_recognition', {
        status: 'processing',
        startTime: Date.now()
      });

      const intentResult = await aiService.recognizeIntent(
        messageContext.content,
        {
          userId: messageContext.fromName,
          groupId: messageContext.groupName,
          userName: messageContext.fromName,
          groupName: messageContext.groupName,
          history: session.context.slice(-5),
          sessionId: session.sessionId,
          messageId: messageData.messageId,
          robotId: robot.robotId,
          robotName: robot.name
        }
      );

      executionTrackerService.updateStep(processingId, 'intent_recognition', {
        status: 'completed',
        endTime: Date.now(),
        result: intentResult
      });

      logger.info('MessageProcessing', '步骤5完成: 意图识别成功', {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        needReply: intentResult.needReply,
        needHuman: intentResult.needHuman
      });

      console.log(`[消息处理] 意图识别结果:`, intentResult);

      // 步骤6: 触发告警（如果需要）
      logger.info('MessageProcessing', '步骤6: 触发告警检查', { processingId });
      executionTrackerService.updateStep(processingId, 'alert_trigger', {
        status: 'processing',
        startTime: Date.now()
      });

      const alertResult = await alertTriggerService.triggerAlert({
        sessionId: session.sessionId,
        intentType: intentResult.intent,
        intent: intentResult.intent,
        userId: messageContext.fromName,
        userName: messageContext.fromName,
        groupId: messageContext.groupName,
        groupName: messageContext.groupName,
        messageContent: messageContext.content,
        robotId: robot.robotId,
        robotName: robot.name,
      });

      if (alertResult) {
        logger.info('MessageProcessing', '步骤6完成: 告警已触发', {
          alertId: alertResult.id,
          alertLevel: alertResult.alertLevel,
          intentType: intentResult.intent,
        });
        console.log(`[消息处理] 告警已触发: ${alertResult.alertLevel} - ${intentResult.intent}`);
      } else {
        logger.debug('MessageProcessing', '步骤6完成: 无需触发告警', {
          intentType: intentResult.intent
        });
      }

      executionTrackerService.updateStep(processingId, 'alert_trigger', {
        status: 'completed',
        endTime: Date.now(),
        result: alertResult
      });

      // 步骤7: 根据意图决策
      logger.info('MessageProcessing', '步骤7: 开始决策逻辑', { processingId });
      const decision = await this.makeDecision(
        intentResult,
        session,
        messageContext,
        processingId,
        robot  // 传递 robot 参数
      );

      logger.info('MessageProcessing', '步骤7完成: 决策完成', {
        action: decision.action,
        reason: decision.reason
      });

      // 步骤8: 更新会话信息
      logger.info('MessageProcessing', '步骤8: 更新会话信息', { processingId });
      await sessionService.updateSession(session.sessionId, {
        lastIntent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        lastProcessedAt: new Date().toISOString()
      });

      logger.debug('MessageProcessing', '步骤8完成: 会话信息更新成功', {
        sessionId: session.sessionId,
        lastIntent: intentResult.intent
      });

      // 步骤9: 完成处理
      const processingTime = Date.now() - startTime;
      console.log(`[消息处理] 计算处理时间: endTime=${Date.now()}, startTime=${startTime}, processingTime=${processingTime}ms`);

      logger.info('MessageProcessing', '===== 消息处理完成 =====', {
        processingId,
        action: decision.action,
        processingTime,
        sessionId: session.sessionId,
        totalSteps: 9
      });
      
      executionTrackerService.completeProcessing(processingId, {
        status: 'success',
        decision,
        processingTime
      });

      console.log(`[消息处理] 处理完成:`, decision);
      return decision;

    } catch (error) {
      console.error('[消息处理] 处理失败:', error);
      console.error('[消息处理] 错误堆栈:', error.stack);

      logger.error('MessageProcessing', '===== 消息处理失败 =====', {
        error: error.message,
        stack: error.stack,
        processingId,
        robotId: robot.robotId,
        robotName: robot.name,
        userId: messageData.fromName,
        groupId: messageData.groupName,
        messageContent: messageContent.substring(0, 200),
        errorType: error.constructor.name,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      });

      executionTrackerService.completeProcessing(processingId, {
        status: 'error',
        error: error.message,
        errorStack: error.stack,
        processingTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * 解析消息内容
   */
  parseMessage(messageData) {
    return {
      content: messageData.spoken || messageData.content || '',
      fromName: messageData.fromName || messageData.receivedName || '',
      groupName: messageData.groupName || '',
      groupRemark: messageData.groupRemark || '',
      roomType: messageData.roomType,
      atMe: messageData.atMe || false,
      textType: messageData.textType || 1,
      fileBase64: messageData.fileBase64 || ''
    };
  }

  /**
   * 根据意图决策
   */
  async makeDecision(intentResult, session, messageContext, processingId, robot) {
    const { intent, needReply, needHuman, confidence } = intentResult;
    const autoReplyConfig = config.get('autoReply');

    logger.debug('MessageProcessing', '决策逻辑执行', {
      intent,
      needReply,
      needHuman,
      confidence,
      sessionId: session.sessionId
    });

    // 1. 风险内容：转人工
    if (intent === 'risk' || needHuman) {
      executionTrackerService.updateStep(processingId, 'decision', {
        status: 'completed',
        result: {
          action: 'human_takeover',
          reason: '检测到风险内容，转人工处理'
        }
      });

      // 更新会话状态为人工处理
      await sessionService.updateSession(session.sessionId, {
        status: 'human',
        humanReason: `风险内容: ${intent}`,
        humanTime: new Date().toISOString()
      });

      logger.warn('MessageProcessing', '会话转人工处理', {
        sessionId: session.sessionId,
        reason: `风险内容: ${intent}`
      });

      return {
        action: 'human_takeover',
        reason: '检测到风险内容，转人工处理',
        intent: intentResult,
        sessionStatus: 'human'
      };
    }

    // 2. 垃圾信息：不回复
    if (intent === 'spam') {
      executionTrackerService.updateStep(processingId, 'decision', {
        status: 'completed',
        result: {
          action: 'none',
          reason: '垃圾信息，不回复'
        }
      });

      logger.info('MessageProcessing', '检测到垃圾信息，跳过回复', {
        sessionId: session.sessionId
      });

      return {
        action: 'none',
        reason: '垃圾信息，不回复',
        intent: intentResult
      };
    }

    // 3. 管理指令：特殊处理（保留给系统管理）
    if (intent === 'admin') {
      executionTrackerService.updateStep(processingId, 'decision', {
        status: 'completed',
        result: {
          action: 'admin_command',
          reason: '管理指令'
        }
      });

      logger.info('MessageProcessing', '管理指令', {
        sessionId: session.sessionId
      });

      return {
        action: 'admin_command',
        reason: '管理指令',
        intent: intentResult
      };
    }

    // 4. 不需要回复
    if (!needReply) {
      executionTrackerService.updateStep(processingId, 'decision', {
        status: 'completed',
        result: {
          action: 'none',
          reason: '不需要回复'
        }
      });

      logger.info('MessageProcessing', '不需要回复', {
        sessionId: session.sessionId,
        confidence
      });

      return {
        action: 'none',
        reason: '不需要回复',
        intent: intentResult
      };
    }

    // 5. 需要回复：根据意图类型生成回复
    return await this.generateReply(intentResult, session, messageContext, processingId, robot);
  }

  /**
   * 生成回复
   */
  async generateReply(intentResult, session, messageContext, processingId, robot) {
    const { intent } = intentResult;
    const autoReplyConfig = config.get('autoReply');

    // 判断接收方类型
    const toType = messageContext.roomType === '2' || messageContext.roomType === '4'
      ? 'single'
      : 'group'; // 2=外部联系人 4=内部联系人 为单聊

    let reply;
    let actionReason;

    logger.info('MessageProcessing', 'generateReply步骤: 开始生成回复', {
      sessionId: session.sessionId,
      intent,
      robotId: robot.robotId,
      toType,
      processingId
    });

    executionTrackerService.updateStep(processingId, 'reply_generation', {
      status: 'processing',
      startTime: Date.now()
    });

    // 根据意图类型选择不同的AI模型
    if (intent === 'service' || intent === 'help' || intent === 'welcome') {
      // 服务问题：使用回复AI模型
      logger.info('MessageProcessing', 'generateReply步骤: 使用服务回复模型', {
        intent,
        processingId
      });

      reply = await aiService.generateServiceReply(
        messageContext.content,
        intent,
        '',
        {
          sessionId: session.sessionId,
          messageId: messageContext.messageId,
          robotId: robot.robotId,
          robotName: robot.name
        }
      );
      actionReason = '服务问题自动回复';

      logger.info('MessageProcessing', 'generateReply步骤: 服务回复生成完成', {
        replyLength: reply.length,
        processingId
      });
    } else if (intent === 'chat') {
      // 闲聊：根据配置决定
      const chatMode = autoReplyConfig.chatMode || 'ai';

      logger.info('MessageProcessing', 'generateReply步骤: 闲聊模式', {
        chatMode,
        processingId
      });

      if (chatMode === 'none') {
        executionTrackerService.updateStep(processingId, 'reply_generation', {
          status: 'completed',
          result: { action: 'none', reason: '闲聊不回复' }
        });

        logger.info('MessageProcessing', 'generateReply步骤: 闲聊不回复');

        return {
          action: 'none',
          reason: '闲聊不回复',
          intent: intentResult
        };
      } else if (chatMode === 'fixed') {
        const fixedReply = autoReplyConfig.chatFixedReply || '';
        reply = fixedReply;
        actionReason = '闲聊固定话术';

        logger.info('MessageProcessing', 'generateReply步骤: 使用闲聊固定话术', {
          replyLength: reply.length,
          processingId
        });
      } else {
        // AI 自然陪聊：使用闲聊AI模型
        logger.info('MessageProcessing', 'generateReply步骤: 使用闲聊AI模型', {
          processingId
        });

        reply = await aiService.generateChatReply(messageContext.content, {
          sessionId: session.sessionId,
          messageId: messageContext.messageId,
          robotId: robot.robotId,
          robotName: robot.name
        });
        actionReason = '闲聊 AI 陪聊';

        logger.info('MessageProcessing', 'generateReply步骤: 闲聊回复生成完成', {
          replyLength: reply.length,
          processingId
        });
      }
    } else {
      // 其他意图：使用回复AI模型
      logger.info('MessageProcessing', 'generateReply步骤: 使用通用回复模型', {
        intent,
        processingId
      });

      reply = await aiService.generateServiceReply(
        messageContext.content,
        intent,
        '',
        {
          sessionId: session.sessionId,
          messageId: messageContext.messageId,
          robotId: robot.robotId,
          robotName: robot.name
        }
      );
      actionReason = '通用自动回复';

      logger.info('MessageProcessing', 'generateReply步骤: 通用回复生成完成', {
        replyLength: reply.length,
        processingId
      });
    }

    executionTrackerService.updateStep(processingId, 'reply_generation', {
      status: 'completed',
      endTime: Date.now(),
      result: { reply }
    });

    logger.info('MessageProcessing', 'generateReply步骤: 回复生成完成', {
      replyLength: reply.length,
      replyPreview: reply.substring(0, 100),
      processingId
    });

    // 更新会话统计
    logger.info('MessageProcessing', 'generateReply步骤: 更新会话统计', {
      sessionId: session.sessionId,
      processingId
    });
    await sessionService.updateSession(session.sessionId, {
      aiReplyCount: session.aiReplyCount + 1,
      replyCount: session.replyCount + 1
    });

    logger.debug('MessageProcessing', 'generateReply步骤: 会话统计更新完成', {
      aiReplyCount: session.aiReplyCount + 1,
      replyCount: session.replyCount + 1,
      processingId
    });

    // 发送回复
    logger.info('MessageProcessing', 'generateReply步骤: 开始发送回复', {
      toType,
      target: messageContext.groupName,
      robotId: robot.robotId,
      replyLength: reply.length,
      processingId
    });

    executionTrackerService.updateStep(processingId, 'send_reply', {
      status: 'processing',
      startTime: Date.now()
    });

    const sendResult = await worktoolService.sendTextMessage(
      robot.robotId,
      messageContext.groupName,
      reply
    );

    executionTrackerService.updateStep(processingId, 'send_reply', {
      status: 'completed',
      endTime: Date.now(),
      result: sendResult
    });

    logger.info('MessageProcessing', 'generateReply步骤: 回复发送完成', {
      sendResult,
      robotId: robot.robotId,
      robotName: robot.name,
      processingId
    });

    // 保存机器人回复到数据库
    logger.info('MessageProcessing', 'generateReply步骤: 保存机器人回复到数据库', {
      sessionId: session.sessionId,
      processingId
    });
    await sessionMessageService.saveBotMessage(
      session.sessionId,
      reply,
      {
        userId: messageContext.fromName,
        groupId: messageContext.groupName,
        userName: messageContext.fromName,
        groupName: messageContext.groupName,
      },
      intent,
      robot
    );

    logger.info('MessageProcessing', 'generateReply步骤: 机器人回复保存成功', {
      sessionId: session.sessionId,
      intent,
      processingId
    });

    logger.info('MessageProcessing', 'generateReply步骤: ===== 生成回复流程完成 =====', {
      action: 'auto_reply',
      actionReason,
      replyLength: reply.length,
      processingId
    });

    return {
      action: 'auto_reply',
      reply,
      reason: actionReason,
      intent: intentResult,
      sendResult
    };
  }

  /**
   * 获取处理统计
   */
  async getStats(timeRange = '24h') {
    return executionTrackerService.getStats(timeRange);
  }

  /**
   * 获取最近处理记录
   */
  async getRecentRecords(limit = 50) {
    return executionTrackerService.getRecentRecords(limit);
  }
}

module.exports = new MessageProcessingService();
