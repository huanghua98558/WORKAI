/**
 * 风险处理核心服务
 * 负责处理风险消息的完整流程
 */

const { staffIdentifier } = require('./staff-identifier.service');
const { AIServiceFactory } = require('../ai/AIServiceFactory');

class RiskHandlerService {
  constructor() {
    this.activeRisks = new Map(); // 存储活跃的风险消息
  }

  /**
   * 处理风险消息
   * @param {Object} message - 消息对象
   * @param {Object} context - 上下文对象
   * @param {Object} config - 配置对象
   * @returns {Promise<Object>}
   */
  async handleRiskMessage(message, context, config) {
    try {
      console.log('[RiskHandler] 开始处理风险消息:', message.messageId);

      // 1. 生成安抚性回复
      const aiReply = await this.generateComfortingReply(message, config);

      console.log('[RiskHandler] AI安抚回复已生成:', aiReply);

      // 2. 记录风险消息到数据库
      const riskId = await this.recordRiskMessage({
        messageId: message.messageId,
        sessionId: context.sessionId,
        userId: message.userId,
        userName: message.receivedName,
        groupName: message.groupName,
        content: message.content,
        aiReply: aiReply,
        status: 'processing',
        createdAt: new Date()
      });

      console.log('[RiskHandler] 风险消息已记录到数据库:', riskId);

      // 3. 记录AI回复日志
      await this.recordHandlingLog({
        riskId: riskId,
        action: 'ai_reply',
        actor: 'AI',
        content: aiReply,
        metadata: {
          messageId: message.messageId,
          modelId: config.modelId,
          personaId: config.personaId
        }
      });

      // 4. 异步通知人工（不阻塞主流程）
      if (config.mode === 'auto_notify') {
        this.notifyHumanAsync({
          riskId,
          sessionId: context.sessionId,
          userId: message.userId,
          userName: message.receivedName,
          groupName: message.groupName,
          message: message.content,
          aiReply: aiReply,
          priority: 'medium'
        }).catch(err => {
          console.error('[RiskHandler] 通知人工失败:', err);
        });
      }

      // 5. 存储到活跃风险列表
      this.activeRisks.set(riskId, {
        riskId,
        messageId: message.messageId,
        sessionId: context.sessionId,
        content: message.content,
        aiReply: aiReply,
        status: 'processing',
        createdAt: new Date()
      });

      console.log('[RiskHandler] 风险消息处理完成:', riskId);

      return {
        success: true,
        riskId,
        reply: aiReply,
        status: 'processing'
      };

    } catch (error) {
      console.error('[RiskHandler] 处理风险消息失败:', error);
      throw error;
    }
  }

  /**
   * 生成安抚性回复
   * @param {Object} message - 消息对象
   * @param {Object} config - 配置对象
   * @returns {Promise<string>}
   */
  async generateComfortingReply(message, config) {
    try {
      const prompt = `
你是一个专业的客服AI助手。用户发送了一条可能包含投诉、抱怨等情绪的消息。

用户消息：${message.content}

你的任务：
1. 理解用户的情绪，表达真诚的歉意和同理心
2. 引导用户详细描述问题，让用户感受到被重视
3. 告知用户已通知专业客服关注此事
4. 承诺会尽力解决问题
5. 保持专业、耐心、友好

回复要求：
- 语气温和、专业、真诚
- 不承诺无法兑现的事情
- 避免机械化的回复
- 长度控制在60-120字
- 体现出对用户的理解和关心
`;

      const aiService = AIServiceFactory.getService(config.modelId);
      const reply = await aiService.generate({
        prompt,
        persona: config.personaId,
        temperature: 0.7
      });

      return reply;
    } catch (error) {
      console.error('[RiskHandler] 生成安抚回复失败:', error);

      // 返回兜底回复
      return '非常抱歉给您带来不便！我非常理解您的感受，请您详细描述一下遇到的问题，我会尽全力帮您解决。';
    }
  }

  /**
   * 记录风险消息到数据库
   * @param {Object} data - 风险消息数据
   * @returns {Promise<string>} - 返回riskId
   */
  async recordRiskMessage(data) {
    try {
      // 这里需要使用数据库ORM（Drizzle）
      // 暂时使用mock实现，后续需要接入真实的数据库
      const { db } = require('../../database');

      const riskId = `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [risk] = await db.insert(riskMessages).values({
        id: riskId,
        messageId: data.messageId,
        sessionId: data.sessionId,
        userId: data.userId,
        userName: data.userName,
        groupName: data.groupName,
        content: data.content,
        aiReply: data.aiReply,
        status: data.status || 'processing',
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date()
      }).returning();

      return risk.id;
    } catch (error) {
      console.error('[RiskHandler] 记录风险消息失败:', error);
      throw error;
    }
  }

  /**
   * 记录处理日志
   * @param {Object} data - 日志数据
   * @returns {Promise<void>}
   */
  async recordHandlingLog(data) {
    try {
      // 这里需要使用数据库ORM（Drizzle）
      const { db } = require('../../database');

      await db.insert(riskHandlingLogs).values({
        riskId: data.riskId,
        action: data.action,
        actor: data.actor,
        content: data.content,
        metadata: data.metadata || {},
        createdAt: new Date()
      });

    } catch (error) {
      console.error('[RiskHandler] 记录处理日志失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 异步通知人工
   * @param {Object} notification - 通知对象
   * @returns {Promise<void>}
   */
  async notifyHumanAsync(notification) {
    try {
      const { notifyHumanService } = require('./notify-human.service');
      await notifyHumanService.sendRiskNotification(notification);

      // 记录通知日志
      await this.recordHandlingLog({
        riskId: notification.riskId,
        action: 'notification_sent',
        actor: 'System',
        content: `发送风险通知给工作人员`,
        metadata: notification
      });

    } catch (error) {
      console.error('[RiskHandler] 通知人工失败:', error);
      throw error;
    }
  }

  /**
   * 获取风险消息详情
   * @param {string} riskId - 风险消息ID
   * @returns {Promise<Object|null>}
   */
  async getRiskById(riskId) {
    try {
      // 这里需要使用数据库ORM（Drizzle）
      // 暂时从内存中获取
      return this.activeRisks.get(riskId) || null;
    } catch (error) {
      console.error('[RiskHandler] 获取风险消息失败:', error);
      return null;
    }
  }

  /**
   * 更新风险消息状态
   * @param {string} riskId - 风险消息ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<void>}
   */
  async updateRiskStatus(riskId, updates) {
    try {
      const risk = this.activeRisks.get(riskId);
      if (!risk) {
        console.warn('[RiskHandler] 风险消息不存在:', riskId);
        return;
      }

      // 更新内存中的数据
      this.activeRisks.set(riskId, {
        ...risk,
        ...updates
      });

      // 更新数据库
      const { db } = require('../../database');
      await db.update(riskMessages)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(riskMessages.id, riskId));

    } catch (error) {
      console.error('[RiskHandler] 更新风险状态失败:', error);
      throw error;
    }
  }

  /**
   * 标记为已解决
   * @param {string} riskId - 风险消息ID
   * @param {string} resolvedBy - 解决者
   * @returns {Promise<void>}
   */
  async markAsResolved(riskId, resolvedBy) {
    await this.updateRiskStatus(riskId, {
      status: 'resolved',
      resolvedBy: resolvedBy,
      resolvedAt: new Date()
    });

    // 记录解决日志
    await this.recordHandlingLog({
      riskId,
      action: resolvedBy === 'AI' ? 'auto_resolved' : 'manual_resolved',
      actor: resolvedBy,
      content: `风险消息已解决`,
      metadata: {
        resolvedBy,
        resolvedAt: new Date()
      }
    });

    console.log('[RiskHandler] 风险消息已解决:', riskId, resolvedBy);
  }

  /**
   * 标记为需要升级
   * @param {string} riskId - 风险消息ID
   * @returns {Promise<void>}
   */
  async markAsEscalated(riskId) {
    await this.updateRiskStatus(riskId, {
      status: 'escalated'
    });

    // 记录升级日志
    await this.recordHandlingLog({
      riskId,
      action: 'escalation',
      actor: 'System',
      content: `风险消息已升级，需要人工介入`,
      metadata: {
        escalatedAt: new Date()
      }
    });

    console.log('[RiskHandler] 风险消息已升级:', riskId);
  }
}

// 导出单例实例
const riskHandlerService = new RiskHandlerService();

// 导出类和实例
module.exports = {
  RiskHandlerService,
  riskHandlerService
};
