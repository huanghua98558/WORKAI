/**
 * 决策服务
 * 负责根据意图和策略决定回复方式
 */

const aiService = require('./ai.service');
const sessionService = require('./session.service');
const worktoolService = require('./worktool.service');
const humanHandoverService = require('./human-handover.service');
const instructionService = require('./instruction.service');
const qaService = require('./qa.service');
const config = require('../lib/config');
const redisClient = require('../lib/redis');

class DecisionService {
  constructor() {
    this.redis = redisClient.getClient();
  }

  /**
   * 决策主流程
   * @param {Object} message - 消息对象（支持 WorkTool 格式）
   * @param {Object} context - 上下文信息
   */
  async makeDecision(message, context = {}) {
    // 支持 WorkTool 格式和原有格式
    const { userId, groupId, userName, groupName, roomType, atMe, message: contextMessage, robot } = context;

    // WorkTool 格式参数
    const spoken = message.spoken || message.content || '';
    const fromName = message.fromName || userName || userId;
    const toGroupName = message.groupName || groupName || groupId;

    // ========== 检查是否为转化客服模式 ==========
    // 1. 检查机器人是否显式开启了转化客服模式
    // 2. 检查机器人分组是否为"营销"
    // 3. 检查机器人类型是否为"角色"
    const isConversionMode = robot && (
      robot.conversionMode ||
      robot.robotGroup === '营销' ||
      robot.robotType === '角色'
    );

    if (isConversionMode) {
      const reason = robot.conversionMode
        ? '转化客服模式已启用'
        : (robot.robotGroup === '营销' ? '机器人分组为营销' : '机器人类型为角色');

      console.log(`机器人 ${robot.robotId} ${reason}，使用转化AI回复`);

      const session = await sessionService.getOrCreateSession(
        userId || fromName,
        toGroupName,
        { userName: fromName, groupName: toGroupName }
      );

      // 添加消息到上下文
      await sessionService.addContext(session.sessionId, {
        content: spoken,
        from_type: atMe ? 'user' : 'other',
        timestamp: message.timestamp || new Date().toISOString()
      });

      // 只使用转化AI回复
      try {
        const reply = await aiService.generateConversionReply(
          spoken || message.content || '',
          'conversion',
          {
            sessionId: session.sessionId,
            messageId: message.id || context.messageId,
            robotId: robot.robotId,
            robotName: robot.name || robot.nickname || robot.robotId,
            userName: fromName,
            groupName: toGroupName
          }
        );

        const toType = roomType === '2' || roomType === '4' ? 'single' : 'group';
        await worktoolService.sendTextMessage(toType, toGroupName, reply);

        await sessionService.updateSession(session.sessionId, {
          aiReplyCount: session.aiReplyCount + 1,
          replyCount: session.replyCount + 1,
          lastIntent: 'conversion',
          lastActiveTime: new Date().toISOString()
        });

        return {
          action: 'conversion_reply',
          reply,
          reason: `${reason}，使用转化AI回复`,
          sessionStatus: 'auto'
        };
      } catch (error) {
        console.error('转化AI回复失败:', error);
        return {
          action: 'none',
          reason: '转化AI回复失败',
          error: error.message
        };
      }
    }

    // 1. 获取或创建会话
    const session = await sessionService.getOrCreateSession(
      userId || fromName,
      toGroupName,
      { userName: fromName, groupName: toGroupName }
    );

    // 2. 添加消息到上下文
    await sessionService.addContext(session.sessionId, {
      content: spoken,
      from_type: atMe ? 'user' : 'other',
      timestamp: message.timestamp || new Date().toISOString()
    });

    // 3. 检查是否在人工接管模式
    if (session.status === 'human') {
      return {
        action: 'none',
        reason: '会话已在人工接管模式',
        sessionStatus: 'human'
      };
    }

    // 4. 意图识别（使用 spoken 或 content）
    const contentToAnalyze = spoken || message.content || '';
    
    // 5. 先尝试指令识别（优先级最高）
    const instructionResult = await instructionService.executeInstruction(contentToAnalyze, {
      ...context,
      message,
      groupName: toGroupName,
      roomType,
      atMe
    });

    if (instructionResult.matched) {
      console.log(`指令识别成功:`, instructionResult);

      // 如果指令执行成功，返回结果
      if (instructionResult.success !== false) {
        return {
          action: 'instruction',
          instructionType: instructionResult.instruction?.type,
          result: instructionResult,
          reason: '执行指令成功'
        };
      }
    }

    // 6. QA 问答库匹配（优先级次之）
    const qaResult = await qaService.matchQA(contentToAnalyze, toGroupName);
    if (qaResult.matched) {
      console.log(`QA 问答匹配成功:`, qaResult);

      // 发送 QA 回复
      const toType = worktoolService.getReceiverType(roomType);
      await worktoolService.sendTextMessage(toType, toGroupName, qaResult.reply);

      return {
        action: 'qa_reply',
        reply: qaResult.reply,
        qaId: qaResult.qaId,
        reason: 'QA 问答匹配成功'
      };
    }

    // 7. AI 意图识别（优先级最低）
    const intentResult = await aiService.recognizeIntent(
      contentToAnalyze,
      {
        userId: userId || fromName,
        groupId: toGroupName,
        userName: fromName,
        groupName: toGroupName,
        history: session.context.slice(-5)
      }
    );

    console.log(`意图识别结果:`, intentResult);

    // 8. 根据意图决定动作
    return await this.decideByIntent(
      intentResult,
      session,
      { ...context, message, content: contentToAnalyze, roomType, atMe }
    );
  }

  /**
   * 根据意图决策
   */
  async decideByIntent(intentResult, session, context) {
    const { intent, needReply, needHuman, confidence } = intentResult;
    const autoReplyConfig = config.get('autoReply');

    // 记录意图到会话
    await sessionService.updateSession(session.sessionId, {
      lastIntent: intent,
      intentConfidence: confidence
    });

    // 风险内容：强制转人工并发送告警
    if (intent === 'risk' || needHuman) {
      // 发送告警消息给配置的接收者
      const alertResult = await humanHandoverService.sendRiskAlert({
        userId: session.userId,
        userName: session.userName || userId,
        groupId: session.groupId,
        groupName: session.groupName || groupId,
        messageContent: context.message?.content || message.content,
        timestamp: new Date().toLocaleString('zh-CN')
      });

      // 更新会话状态为人工处理
      await sessionService.updateSession(session.sessionId, {
        status: 'human',
        humanReason: `风险内容: ${intent}`,
        humanTime: new Date().toISOString()
      });

      console.log(`风险告警已发送:`, alertResult);

      return {
        action: 'takeover_human',
        reason: '检测到风险内容，已发送告警通知',
        intent: intentResult,
        alertResult
      };
    }

    // 垃圾信息：拒绝回复
    if (intent === 'spam') {
      return {
        action: 'none',
        reason: '垃圾信息，不回复',
        intent: intentResult
      };
    }

    // 管理指令：特殊处理
    if (intent === 'admin') {
      return {
        action: 'admin_command',
        reason: '管理指令',
        intent: intentResult
      };
    }

    // 不需要回复
    if (!needReply) {
      return {
        action: 'none',
        reason: '不需要回复',
        intent: intentResult
      };
    }

    // 需要回复：根据意图类型生成回复
    let reply;
    const toType = context.roomType === '2' || context.roomType === '4' ? 'single' : 'group'; // 2=外部联系人 4=内部联系人 为单聊

    if (intent === 'service') {
      // 服务问题：自动回复
      reply = await aiService.generateServiceReply(
        context.content,
        intent
      );
      
      await sessionService.updateSession(session.sessionId, {
        aiReplyCount: session.aiReplyCount + 1,
        replyCount: session.replyCount + 1
      });

      // 发送回复
      await worktoolService.sendTextMessage(toType, session.groupId, reply);

      return {
        action: 'auto_reply',
        reply,
        reason: '服务问题自动回复',
        intent: intentResult
      };
    } else if (intent === 'chat') {
      // 闲聊：根据配置决定
      const chatMode = autoReplyConfig.chatMode;
      
      if (chatMode === 'none') {
        return {
          action: 'none',
          reason: '闲聊不回复',
          intent: intentResult
        };
      } else if (chatMode === 'probability') {
        const probability = autoReplyConfig.chatProbability || 0.3;
        const shouldReply = Math.random() < probability;
        
        if (!shouldReply) {
          return {
            action: 'none',
            reason: '闲聊概率未命中',
            intent: intentResult
          };
        }
      } else if (chatMode === 'fixed') {
        const fixedReply = autoReplyConfig.chatFixedReply || '';
        
        await worktoolService.sendTextMessage(toType, session.groupId, fixedReply);
        
        return {
          action: 'auto_reply',
          reply: fixedReply,
          reason: '闲聊固定话术',
          intent: intentResult
        };
      }

      // AI 自然陪聊：使用客服回复模型（统一模型）
      reply = await aiService.generateServiceReply(context.content, 'chat', '', {
        sessionId: session.sessionId,
        messageId: context.messageId,
        robotId: context.robotId,
        robotName: context.robotName
      });
      
      await sessionService.updateSession(session.sessionId, {
        aiReplyCount: session.aiReplyCount + 1,
        replyCount: session.replyCount + 1
      });

      await worktoolService.sendTextMessage(toType, session.groupId, reply);

      return {
        action: 'auto_reply',
        reply,
        reason: '闲聊 AI 陪聊',
        intent: intentResult
      };
    } else if (intent === 'help' || intent === 'welcome') {
      // 帮助或欢迎：使用服务回复
      reply = await aiService.generateServiceReply(
        context.message?.content,
        intent
      );
      
      await sessionService.updateSession(session.sessionId, {
        aiReplyCount: session.aiReplyCount + 1,
        replyCount: session.replyCount + 1
      });

      await worktoolService.sendTextMessage(toType, session.groupId, reply);

      return {
        action: 'auto_reply',
        reply,
        reason: `${intent === 'welcome' ? '欢迎' : '帮助'}自动回复`,
        intent: intentResult
      };
    }

    // 默认：不回复
    return {
      action: 'none',
      reason: '未知意图，不回复',
      intent: intentResult
    };
  }

  /**
   * 触发告警
   */
  async triggerAlert(alertType, data) {
    const alertRules = config.get('alert.rules') || [];
    const rule = alertRules.find(r => r.id === alertType);

    if (!rule || !rule.enabled) {
      return;
    }

    // 记录告警
    const alertKey = `alert:${alertType}:${Date.now()}`;
    await this.redis.setex(
      alertKey,
      3600,
      JSON.stringify({
        type: alertType,
        level: rule.level,
        data,
        timestamp: new Date().toISOString()
      })
    );

    // 发送告警消息
    if (rule.actions.includes('send_message')) {
      const targets = rule.targets || [];
      for (const target of targets) {
        await worktoolService.sendTextMessage(
          target.type,
          target.id,
          `[${rule.level.toUpperCase()}] ${alertType}: ${JSON.stringify(data)}`
        );
      }
    }

    console.log(`🚨 告警触发: ${alertType} - ${rule.level}`);
  }

  /**
   * 获取决策统计
   */
  async getStats() {
    const statsKey = 'decision:stats';
    const stats = await this.redis.hgetall(statsKey);
    
    if (!stats) {
      return {
        totalDecisions: 0,
        autoReplies: 0,
        humanTakeovers: 0,
        noneReplies: 0,
        intentDistribution: {}
      };
    }

    return {
      totalDecisions: parseInt(stats.total) || 0,
      autoReplies: parseInt(stats.auto_reply) || 0,
      humanTakeovers: parseInt(stats.human_takeover) || 0,
      noneReplies: parseInt(stats.none) || 0,
      intentDistribution: stats.intentDistribution 
        ? JSON.parse(stats.intentDistribution) 
        : {}
    };
  }
}

module.exports = new DecisionService();
