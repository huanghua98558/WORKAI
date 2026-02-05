/**
 * 风险监控服务
 * 负责监控风险消息的处理状态，检测工作人员是否已处理
 */

const { staffIdentifier } = require('./staff-identifier.service');
const { riskHandlerService } = require('./risk-handler.service');

class RiskMonitorService {
  constructor() {
    this.activeMonitors = new Map(); // 存储活跃的监控任务
    this.aiService = null; // AI服务实例
  }

  /**
   * 启动监控
   * @param {string} riskId - 风险消息ID
   * @param {Object} context - 上下文对象
   * @param {Object} config - 配置对象
   */
  startMonitoring(riskId, context, config) {
    console.log('[RiskMonitor] 启动监控:', riskId);

    if (this.activeMonitors.has(riskId)) {
      console.warn('[RiskMonitor] 监控已存在:', riskId);
      return;
    }

    const monitorConfig = {
      riskId,
      sessionId: context.sessionId,
      enabled: config.enableStaffDetection !== false,
      monitoringDuration: config.monitoringDuration || 300, // 默认5分钟
      checkInterval: 5000, // 每5秒检查一次
      startTime: Date.now(),
      intervalId: null
    };

    // 启动定时检查
    monitorConfig.intervalId = setInterval(async () => {
      await this.checkMonitoring(monitorConfig);
    }, monitorConfig.checkInterval);

    // 设置超时自动停止
    setTimeout(() => {
      this.stopMonitoring(riskId, 'timeout');
    }, monitorConfig.monitoringDuration * 1000);

    this.activeMonitors.set(riskId, monitorConfig);
  }

  /**
   * 停止监控
   * @param {string} riskId - 风险消息ID
   * @param {string} reason - 停止原因
   */
  stopMonitoring(riskId, reason = 'manual') {
    console.log('[RiskMonitor] 停止监控:', riskId, reason);

    const monitor = this.activeMonitors.get(riskId);
    if (!monitor) {
      return;
    }

    // 清除定时器
    if (monitor.intervalId) {
      clearInterval(monitor.intervalId);
    }

    // 删除监控
    this.activeMonitors.delete(riskId);
  }

  /**
   * 检查监控状态
   * @param {Object} monitor - 监控对象
   */
  async checkMonitoring(monitor) {
    try {
      // 检查风险状态
      const risk = await riskHandlerService.getRiskById(monitor.riskId);

      if (!risk || risk.status !== 'processing') {
        this.stopMonitoring(monitor.riskId, 'risk_not_processing');
        return;
      }

      // 检查是否超时
      const elapsed = Date.now() - monitor.startTime;
      if (elapsed > monitor.monitoringDuration * 1000) {
        this.stopMonitoring(monitor.riskId, 'timeout');
        await this.handleTimeout(monitor.riskId);
        return;
      }

      // 获取群内最新消息
      const recentMessages = await this.getRecentMessages(
        monitor.sessionId,
        10,
        risk.createdAt
      );

      if (!recentMessages || recentMessages.length === 0) {
        return;
      }

      // 检测工作人员是否已处理
      for (const message of recentMessages) {
        const handled = await this.checkStaffHandled(message, risk);
        if (handled) {
          this.stopMonitoring(monitor.riskId, 'staff_handled');
          await riskHandlerService.markAsResolved(
            monitor.riskId,
            message.userId
          );
          return;
        }
      }

      // 检测用户满意度
      const userSatisfaction = await this.detectUserSatisfaction(recentMessages, risk);
      if (userSatisfaction === 'high') {
        this.stopMonitoring(monitor.riskId, 'user_satisfied');
        await riskHandlerService.markAsResolved(monitor.riskId, 'AI');
        return;
      }

      // 检测升级信号
      const needEscalation = await this.detectEscalationSignal(recentMessages, risk);
      if (needEscalation) {
        this.stopMonitoring(monitor.riskId, 'escalation_needed');
        await riskHandlerService.markAsEscalated(monitor.riskId);
        await this.sendEscalationNotification(monitor.riskId, risk);
        return;
      }

    } catch (error) {
      console.error('[RiskMonitor] 检查监控失败:', monitor.riskId, error);
    }
  }

  /**
   * 检测工作人员是否已处理
   * @param {Object} message - 新消息
   * @param {Object} risk - 风险消息
   * @returns {Promise<boolean>}
   */
  async checkStaffHandled(message, risk) {
    // 1. 检查消息发送者是否为工作人员
    const isStaff = staffIdentifier.isStaffUser(message);
    if (!isStaff) {
      return false;
    }

    // 2. 检查消息是否为回复（@引用或内容相关）
    const isRelated = await this.isMessageRelated(message, risk);
    if (!isRelated) {
      return false;
    }

    // 3. 确认是处理而非简单的确认
    const isHandling = await this.isHandlingMessage(message);
    if (!isHandling) {
      return false;
    }

    console.log('[RiskMonitor] 检测到工作人员处理:', message.userId);

    // 记录处理日志
    await riskHandlerService.recordHandlingLog({
      riskId: risk.riskId,
      action: 'staff_reply',
      actor: message.userId,
      content: message.content,
      metadata: {
        userName: message.receivedName,
        timestamp: message.timestamp
      }
    });

    return true;
  }

  /**
   * 判断消息是否相关
   * @param {Object} newMessage - 新消息
   * @param {Object} risk - 风险消息
   * @returns {Promise<boolean>}
   */
  async isMessageRelated(newMessage, risk) {
    // 1. 检查是否@回复了用户
    if (newMessage.atUsers && newMessage.atUsers.includes(risk.userId)) {
      return true;
    }

    // 2. 检查是否引用了消息
    if (newMessage.replyTo && newMessage.replyTo === risk.messageId) {
      return true;
    }

    // 3. AI判断内容相关性
    const relevanceScore = await this.calculateRelevance(
      newMessage.content,
      risk.content
    );

    return relevanceScore > 0.7; // 相关性阈值
  }

  /**
   * 计算消息相关性分数
   * @param {string} message1 - 消息1
   * @param {string} message2 - 消息2
   * @returns {Promise<number>}
   */
  async calculateRelevance(message1, message2) {
    try {
      // 使用AI计算相关性
      if (!this.aiService) {
        const { AIServiceFactory } = require('../ai/AIServiceFactory');
        this.aiService = AIServiceFactory.getService('doubao-pro-4k');
      }

      const prompt = `
请判断以下两条消息的相关性（0-1之间的分数）：

消息1：${message1}
消息2：${message2}

请直接输出一个数字（如0.8），不要输出任何其他内容。
`;

      const response = await this.aiService.generate({ prompt, temperature: 0 });
      const score = parseFloat(response.trim());

      return isNaN(score) ? 0 : Math.min(1, Math.max(0, score));

    } catch (error) {
      console.error('[RiskMonitor] 计算相关性失败:', error);
      return 0;
    }
  }

  /**
   * 判断是否为处理性消息
   * @param {Object} message - 消息对象
   * @returns {Promise<boolean>}
   */
  async isHandlingMessage(message) {
    // 处理性消息的特征
    const handlingKeywords = [
      '抱歉', '对不起', '理解', '帮您', '解决', '处理',
      '稍后', '正在', '马上', '立即', '专人', '联系',
      '会尽快', '马上处理', '正在为您', '了解一下'
    ];

    const content = message.content.toLowerCase();
    const matchCount = handlingKeywords.filter(kw => content.includes(kw)).length;

    // 至少包含2个关键词
    return matchCount >= 2;
  }

  /**
   * 检测用户满意度
   * @param {Array} messages - 消息列表
   * @param {Object} risk - 风险消息
   * @returns {Promise<string>} - 'high' | 'medium' | 'low'
   */
  async detectUserSatisfaction(messages, risk) {
    try {
      // 筛选用户发送的消息
      const userMessages = messages.filter(m => m.userId === risk.userId);

      if (userMessages.length === 0) {
        return 'low';
      }

      // 满意度关键词
      const satisfiedKeywords = ['好的', '谢谢', '感谢', '理解', '可以', '行', '没问题'];
      const dissatisfiedKeywords = ['不行', '不能', '不满意', '投诉', '投诉'];

      let satisfiedCount = 0;
      let dissatisfiedCount = 0;

      for (const message of userMessages) {
        const content = message.content.toLowerCase();
        satisfiedCount += satisfiedKeywords.filter(kw => content.includes(kw)).length;
        dissatisfiedCount += dissatisfiedKeywords.filter(kw => content.includes(kw)).length;
      }

      if (satisfiedCount >= dissatisfiedCount + 2) {
        return 'high';
      } else if (dissatisfiedCount >= satisfiedCount + 2) {
        return 'low';
      } else {
        return 'medium';
      }

    } catch (error) {
      console.error('[RiskMonitor] 检测用户满意度失败:', error);
      return 'low';
    }
  }

  /**
   * 检测升级信号
   * @param {Array} messages - 消息列表
   * @param {Object} risk - 风险消息
   * @returns {Promise<boolean>}
   */
  async detectEscalationSignal(messages, risk) {
    try {
      // 筛选用户发送的消息
      const userMessages = messages.filter(m => m.userId === risk.userId);

      if (userMessages.length === 0) {
        return false;
      }

      // 升级关键词
      const escalationKeywords = [
        '我要投诉', '我要举报', '不解决就投诉',
        '上级', '经理', '领导', '你们领导',
        '我要找领导', '投诉你们', '威胁'
      ];

      for (const message of userMessages) {
        const content = message.content.toLowerCase();
        const matchCount = escalationKeywords.filter(kw => content.includes(kw)).length;
        if (matchCount >= 1) {
          return true;
        }
      }

      return false;

    } catch (error) {
      console.error('[RiskMonitor] 检测升级信号失败:', error);
      return false;
    }
  }

  /**
   * 获取群内最新消息
   * @param {string} sessionId - 会话ID
   * @param {number} limit - 消息数量限制
   * @param {Date} afterTime - 只获取此时间之后的消息
   * @returns {Promise<Array>}
   */
  async getRecentMessages(sessionId, limit = 10, afterTime = null) {
    try {
      // 这里需要从数据库或消息队列中获取
      // 暂时返回空数组
      return [];
    } catch (error) {
      console.error('[RiskMonitor] 获取最新消息失败:', error);
      return [];
    }
  }

  /**
   * 处理超时
   * @param {string} riskId - 风险消息ID
   */
  async handleTimeout(riskId) {
    console.log('[RiskMonitor] 监控超时:', riskId);

    // 标记为需要升级
    await riskHandlerService.markAsEscalated(riskId);

    // 发送超时通知
    const risk = await riskHandlerService.getRiskById(riskId);
    if (risk) {
      await this.sendTimeoutNotification(riskId, risk);
    }
  }

  /**
   * 发送升级通知
   * @param {string} riskId - 风险消息ID
   * @param {Object} risk - 风险消息
   */
  async sendEscalationNotification(riskId, risk) {
    try {
      const { notifyHumanService } = require('./notify-human.service');

      await notifyHumanService.sendRiskNotification({
        riskId,
        sessionId: risk.sessionId,
        userId: risk.userId,
        userName: risk.userName,
        groupName: risk.groupName,
        message: risk.content,
        aiReply: risk.aiReply,
        priority: 'high',
        reason: 'escalation_needed'
      });

    } catch (error) {
      console.error('[RiskMonitor] 发送升级通知失败:', error);
    }
  }

  /**
   * 发送超时通知
   * @param {string} riskId - 风险消息ID
   * @param {Object} risk - 风险消息
   */
  async sendTimeoutNotification(riskId, risk) {
    try {
      const { notifyHumanService } = require('./notify-human.service');

      await notifyHumanService.sendRiskNotification({
        riskId,
        sessionId: risk.sessionId,
        userId: risk.userId,
        userName: risk.userName,
        groupName: risk.groupName,
        message: risk.content,
        aiReply: risk.aiReply,
        priority: 'high',
        reason: 'timeout'
      });

    } catch (error) {
      console.error('[RiskMonitor] 发送超时通知失败:', error);
    }
  }
}

// 导出单例实例
const riskMonitorService = new RiskMonitorService();

// 导出类和实例
module.exports = {
  RiskMonitorService,
  riskMonitorService
};
