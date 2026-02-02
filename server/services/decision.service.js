/**
 * 决策服务
 * 负责根据意图和策略决定回复方式
 */

const aiService = require('./ai.service');
const sessionService = require('./session.service');
const worktoolService = require('./worktool.service');
const humanHandoverService = require('./human-handover.service');
const config = require('../lib/config');
const redisClient = require('../lib/redis');

class DecisionService {
  constructor() {
    this.redis = redisClient.getClient();
  }

  /**
   * 决策主流程
   */
  async makeDecision(message, context = {}) {
    const { userId, groupId, userName, groupName } = context;

    // 1. 获取或创建会话
    const session = await sessionService.getOrCreateSession(
      userId,
      groupId,
      { userName, groupName }
    );

    // 2. 添加消息到上下文
    await sessionService.addContext(session.sessionId, message);

    // 3. 检查是否在人工接管模式
    if (session.status === 'human') {
      return {
        action: 'none',
        reason: '会话已在人工接管模式',
        sessionStatus: 'human'
      };
    }

    // 4. 意图识别
    const intentResult = await aiService.recognizeIntent(
      message.content,
      {
        userId,
        groupId,
        userName,
        groupName,
        history: session.context.slice(-5)
      }
    );

    console.log(`意图识别结果:`, intentResult);

    // 5. 根据意图决定动作
    return await this.decideByIntent(
      intentResult,
      session,
      context
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
    const toType = context.toType || 'group';

    if (intent === 'service') {
      // 服务问题：自动回复
      reply = await aiService.generateServiceReply(
        context.message?.content,
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

      // AI 自然陪聊
      reply = await aiService.generateChatReply(context.message?.content);
      
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
