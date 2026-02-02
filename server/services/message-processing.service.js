/**
 * 消息处理服务
 * 统一消息处理流程：意图识别 → 决策是否回复 → 生成回复 → 发送回复
 */

const aiService = require('./ai.service');
const sessionService = require('./session.service');
const worktoolService = require('./worktool.service');
const executionTrackerService = require('./execution-tracker.service');
const config = require('../lib/config');

class MessageProcessingService {
  /**
   * 处理消息的主入口
   * @param {Object} messageData - WorkTool 消息数据
   * @param {Object} robot - 机器人配置
   */
  async processMessage(messageData, robot) {
    const startTime = Date.now();
    console.log(`[消息处理] 开始处理消息，startTime: ${startTime}, ISO: ${new Date(startTime).toISOString()}`);
    const processingId = executionTrackerService.startProcessing({
      robotId: robot.robotId,
      messageData,
      startTime
    });

    try {
      // 1. 解析消息内容
      const messageContext = this.parseMessage(messageData);
      
      // 2. 获取或创建会话
      const session = await sessionService.getOrCreateSession(
        messageContext.fromName,
        messageContext.groupName,
        {
          userName: messageContext.fromName,
          groupName: messageContext.groupName,
          roomType: messageContext.roomType
        }
      );

      // 3. 添加消息到上下文
      await sessionService.addContext(session.sessionId, {
        content: messageContext.content,
        from_type: messageContext.atMe ? 'user' : 'other',
        timestamp: messageData.timestamp || new Date().toISOString()
      });

      // 4. AI 意图识别
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
          history: session.context.slice(-5)
        }
      );

      executionTrackerService.updateStep(processingId, 'intent_recognition', {
        status: 'completed',
        endTime: Date.now(),
        result: intentResult
      });

      console.log(`[消息处理] 意图识别结果:`, intentResult);

      // 5. 根据意图决策
      const decision = await this.makeDecision(
        intentResult,
        session,
        messageContext,
        processingId
      );

      // 6. 更新会话信息
      await sessionService.updateSession(session.sessionId, {
        lastIntent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        lastProcessedAt: new Date().toISOString()
      });

      // 7. 完成处理
      const processingTime = Date.now() - startTime;
      console.log(`[消息处理] 计算处理时间: endTime=${Date.now()}, startTime=${startTime}, processingTime=${processingTime}ms`);
      executionTrackerService.completeProcessing(processingId, {
        status: 'success',
        decision,
        processingTime
      });

      console.log(`[消息处理] 处理完成:`, decision);
      return decision;

    } catch (error) {
      console.error('[消息处理] 处理失败:', error);
      
      executionTrackerService.completeProcessing(processingId, {
        status: 'error',
        error: error.message,
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
  async makeDecision(intentResult, session, messageContext, processingId) {
    const { intent, needReply, needHuman, confidence } = intentResult;
    const autoReplyConfig = config.get('autoReply');

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

      return {
        action: 'none',
        reason: '不需要回复',
        intent: intentResult
      };
    }

    // 5. 需要回复：根据意图类型生成回复
    return await this.generateReply(intentResult, session, messageContext, processingId);
  }

  /**
   * 生成回复
   */
  async generateReply(intentResult, session, messageContext, processingId) {
    const { intent } = intentResult;
    const autoReplyConfig = config.get('autoReply');
    
    // 判断接收方类型
    const toType = messageContext.roomType === '2' || messageContext.roomType === '4' 
      ? 'single' 
      : 'group'; // 2=外部联系人 4=内部联系人 为单聊

    let reply;
    let actionReason;

    executionTrackerService.updateStep(processingId, 'reply_generation', {
      status: 'processing',
      startTime: Date.now()
    });

    // 根据意图类型选择不同的AI模型
    if (intent === 'service' || intent === 'help' || intent === 'welcome') {
      // 服务问题：使用回复AI模型
      reply = await aiService.generateServiceReply(
        messageContext.content,
        intent
      );
      actionReason = '服务问题自动回复';
    } else if (intent === 'chat') {
      // 闲聊：根据配置决定
      const chatMode = autoReplyConfig.chatMode || 'ai';
      
      if (chatMode === 'none') {
        executionTrackerService.updateStep(processingId, 'reply_generation', {
          status: 'completed',
          result: { action: 'none', reason: '闲聊不回复' }
        });

        return {
          action: 'none',
          reason: '闲聊不回复',
          intent: intentResult
        };
      } else if (chatMode === 'fixed') {
        const fixedReply = autoReplyConfig.chatFixedReply || '';
        reply = fixedReply;
        actionReason = '闲聊固定话术';
      } else {
        // AI 自然陪聊：使用闲聊AI模型
        reply = await aiService.generateChatReply(messageContext.content);
        actionReason = '闲聊 AI 陪聊';
      }
    } else {
      // 其他意图：使用回复AI模型
      reply = await aiService.generateServiceReply(
        messageContext.content,
        intent
      );
      actionReason = '通用自动回复';
    }

    executionTrackerService.updateStep(processingId, 'reply_generation', {
      status: 'completed',
      endTime: Date.now(),
      result: { reply }
    });

    // 更新会话统计
    await sessionService.updateSession(session.sessionId, {
      aiReplyCount: session.aiReplyCount + 1,
      replyCount: session.replyCount + 1
    });

    // 发送回复
    executionTrackerService.updateStep(processingId, 'send_reply', {
      status: 'processing',
      startTime: Date.now()
    });

    const sendResult = await worktoolService.sendTextMessage(
      toType,
      messageContext.groupName,
      reply
    );

    executionTrackerService.updateStep(processingId, 'send_reply', {
      status: 'completed',
      endTime: Date.now(),
      result: sendResult
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
