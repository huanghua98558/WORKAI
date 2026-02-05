/**
 * 协同决策服务
 * 负责AI与工作人员的智能协同决策
 *
 * 功能：
 * - 检测工作人员上下文
 * - 检测信息上下文
 * - 应用协同策略
 * - 生成协同决策
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { collaborationDecisionLogs } = require('../../database/schema');
const { eq } = require('drizzle-orm');
const staffTrackerService = require('../staff/staff-tracker.service');

class CollabDecisionService {
  constructor() {
    this.dbPromise = null;
    console.log('[CollabDecision] 协同决策服务初始化完成');
  }

  async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = getDb();
    }
    return this.dbPromise;
  }

  /**
   * 主决策入口
   * @param {Object} context - 上下文对象
   * @param {string} context.sessionId - 会话ID
   * @param {string} context.messageId - 消息ID
   * @param {string} context.content - 消息内容
   * @param {Object} robot - 机器人配置
   * @returns {Promise<Object>} 决策结果
   */
  async makeDecision(context, robot) {
    console.log('[CollabDecision] 开始协同决策:', context.sessionId);

    try {
      // 1. 检测工作人员上下文
      const staffContext = await this.detectStaffContext(context);

      // 2. 检测信息上下文
      const infoContext = await this.detectInfoContext(context);

      // 3. 应用协同策略
      const strategy = this.applyStrategy(staffContext, infoContext, robot);

      // 4. 生成决策
      const decision = {
        shouldAIReply: strategy.shouldAIReply,
        aiAction: strategy.aiAction,
        staffAction: strategy.staffAction,
        priority: strategy.priority,
        reason: strategy.reason,
        aiBehavior: this.getAIBehavior(context, strategy),
        metadata: {
          staffContext,
          infoContext,
          strategy
        }
      };

      // 5. 记录决策日志
      await this.logDecision(context.sessionId, context.messageId, decision, robot);

      console.log('[CollabDecision] ✅ 决策完成:', {
        reason: decision.reason,
        shouldAIReply: decision.shouldAIReply,
        priority: decision.priority
      });

      return decision;

    } catch (error) {
      console.error('[CollabDecision] ❌ 协同决策失败:', error);
      throw error;
    }
  }

  /**
   * 检测工作人员上下文
   * @param {Object} context - 上下文对象
   * @returns {Promise<Object>} 工作人员上下文
   */
  async detectStaffContext(context) {
    try {
      const staffInfo = await staffTrackerService.getStaffInfo(context.sessionId);
      const activityLevel = await staffTrackerService.getActivityLevel(context.sessionId);

      const timeSinceJoin = staffInfo.joinTime
        ? Date.now() - new Date(staffInfo.joinTime).getTime()
        : null;

      return {
        hasStaff: staffInfo.hasStaff,
        staffUserId: staffInfo.currentStaff,
        joinTime: staffInfo.joinTime,
        leaveTime: staffInfo.leaveTime,
        messageCount: staffInfo.messageCount,
        lastActivity: staffInfo.lastActivity,
        activityLevel: activityLevel.level,
        activityCount: activityLevel.count,
        isHandlingRisk: staffInfo.isHandlingRisk,
        timeSinceJoin,
        collaborationMode: staffInfo.collaborationMode,
        aiReplyStrategy: staffInfo.aiReplyStrategy
      };

    } catch (error) {
      console.error('[CollabDecision] ❌ 检测工作人员上下文失败:', error);
      return {
        hasStaff: false,
        staffUserId: null,
        joinTime: null,
        messageCount: 0,
        activityLevel: 'low',
        isHandlingRisk: false,
        timeSinceJoin: null,
        collaborationMode: 'adaptive',
        aiReplyStrategy: 'normal'
      };
    }
  }

  /**
   * 检测信息上下文
   * @param {Object} context - 上下文对象
   * @returns {Promise<Object>} 信息上下文
   */
  async detectInfoContext(context) {
    // 简化版本：从上下文中提取信息
    // 后续可以集成更复杂的信息检测服务
    return {
      risk: {
        level: 'none',
        score: 0
      },
      satisfaction: {
        level: 'medium',
        score: 50
      },
      sentiment: {
        sentiment: 'neutral',
        confidence: 0.5
      },
      urgency: {
        level: 'medium',
        score: 0.5
      }
    };
  }

  /**
   * 应用协同策略
   * @param {Object} staffContext - 工作人员上下文
   * @param {Object} infoContext - 信息上下文
   * @param {Object} robot - 机器人配置
   * @returns {Object} 策略结果
   */
  applyStrategy(staffContext, infoContext, robot) {
    const config = robot.collaborationConfig || {
      mode: 'adaptive',
      staffPriority: 0.7,
      aiPriority: 0.3,
      staffJoinBuffer: 30 // 工作人员加入缓冲时间（秒）
    };

    // 策略判断链（按优先级）
    const strategies = [
      () => this.checkStaffHandling(staffContext),
      () => this.checkCriticalRisk(infoContext),
      () => this.checkStaffJustJoined(staffContext, config),
      () => this.checkLowSatisfaction(infoContext),
      () => this.checkWarningRiskWithStaff(staffContext, infoContext),
      () => this.checkAIPaused(staffContext),
      () => this.applyModeBasedDecision(staffContext, config)
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result) {
        console.log('[CollabDecision] 策略匹配:', result.reason);
        return result;
      }
    }

    // 默认策略
    return {
      shouldAIReply: true,
      aiAction: 'reply',
      staffAction: 'monitor',
      priority: 'ai',
      reason: 'default'
    };
  }

  /**
   * 检查工作人员是否正在处理
   */
  checkStaffHandling(staffContext) {
    if (staffContext.isHandlingRisk) {
      return {
        shouldAIReply: false,
        aiAction: 'wait',
        staffAction: 'continue',
        priority: 'staff',
        reason: 'staff_is_handling'
      };
    }
    return null;
  }

  /**
   * 检查高风险
   */
  checkCriticalRisk(infoContext) {
    if (infoContext.risk.level === 'critical') {
      return {
        shouldAIReply: false,
        aiAction: 'wait',
        staffAction: 'handle',
        priority: 'staff',
        reason: 'critical_risk'
      };
    }
    return null;
  }

  /**
   * 检查工作人员刚加入
   */
  checkStaffJustJoined(staffContext, config) {
    if (staffContext.hasStaff &&
        staffContext.timeSinceJoin &&
        staffContext.timeSinceJoin < config.staffJoinBuffer * 1000) {
      return {
        shouldAIReply: false,
        aiAction: 'wait',
        staffAction: 'speak',
        priority: 'staff',
        reason: 'staff_just_joined'
      };
    }
    return null;
  }

  /**
   * 检查低满意度
   */
  checkLowSatisfaction(infoContext) {
    if (infoContext.satisfaction.level === 'low') {
      return {
        shouldAIReply: false,
        aiAction: 'wait',
        staffAction: 'handle',
        priority: 'staff',
        reason: 'low_satisfaction'
      };
    }
    return null;
  }

  /**
   * 检查中等风险+工作人员在场
   */
  checkWarningRiskWithStaff(staffContext, infoContext) {
    if (infoContext.risk.level === 'warning' && staffContext.hasStaff) {
      return {
        shouldAIReply: true,
        aiAction: 'comfort',
        staffAction: 'handle',
        priority: 'both',
        reason: 'warning_with_staff'
      };
    }
    return null;
  }

  /**
   * 检查AI是否暂停
   */
  checkAIPaused(staffContext) {
    if (staffContext.aiReplyStrategy === 'paused') {
      return {
        shouldAIReply: false,
        aiAction: 'paused',
        staffAction: 'handle',
        priority: 'staff',
        reason: 'ai_paused'
      };
    }
    return null;
  }

  /**
   * 基于模式的决策
   */
  applyModeBasedDecision(staffContext, config) {
    if (staffContext.collaborationMode === 'priority_to_staff') {
      return {
        shouldAIReply: !staffContext.hasStaff,
        aiAction: 'reply',
        staffAction: staffContext.hasStaff ? 'handle' : 'monitor',
        priority: staffContext.hasStaff ? 'staff' : 'ai',
        reason: 'staff_priority_mode'
      };
    }

    if (staffContext.collaborationMode === 'priority_to_ai') {
      return {
        shouldAIReply: true,
        aiAction: 'reply',
        staffAction: 'monitor',
        priority: 'ai',
        reason: 'ai_priority_mode'
      };
    }

    // 自适应模式
    return this.adaptiveDecision(staffContext, infoContext, config);
  }

  /**
   * 自适应决策
   */
  adaptiveDecision(staffContext, infoContext, config) {
    let score = { staff: 0, ai: 0 };

    // 满意度因素
    if (infoContext.satisfaction.level === 'low') score.staff += 0.5;
    else if (infoContext.satisfaction.level === 'high') score.ai += 0.3;

    // 风险因素
    if (infoContext.risk.level === 'warning') score.staff += 0.3;

    // 工作人员活跃度因素
    if (staffContext.activityLevel === 'high') score.staff += 0.2;
    else if (staffContext.activityLevel === 'medium') score.staff += 0.1;

    // 综合决策
    const total = score.staff + score.ai;
    const staffRatio = total > 0 ? score.staff / total : 0;

    if (staffRatio > config.staffPriority) {
      return {
        shouldAIReply: false,
        aiAction: 'wait',
        staffAction: 'handle',
        priority: 'staff',
        reason: 'adaptive_staff_priority'
      };
    } else {
      return {
        shouldAIReply: true,
        aiAction: 'reply',
        staffAction: 'monitor',
        priority: 'ai',
        reason: 'adaptive_ai_priority'
      };
    }
  }

  /**
   * 获取AI行为
   */
  getAIBehavior(context, strategy) {
    return {
      replyFrequency: strategy.priority === 'staff' ? 'low' : 'normal',
      replyDelay: strategy.priority === 'staff'
        ? { min: 3000, max: 8000 }
        : { min: 0, max: 2000 },
      shouldShowThinking: false
    };
  }

  /**
   * 记录决策日志
   */
  async logDecision(sessionId, messageId, decision, robot) {
    try {
      const db = await this.getDb();

      await db.insert(collaborationDecisionLogs).values({
        id: uuidv4(),
        sessionId,
        messageId,
        robotId: robot?.robotId,
        shouldAiReply: decision.shouldAIReply,
        aiAction: decision.aiAction,
        staffAction: decision.staffAction,
        priority: decision.priority,
        reason: decision.reason,
        staffContext: JSON.stringify(decision.metadata.staffContext),
        infoContext: JSON.stringify(decision.metadata.infoContext),
        strategy: JSON.stringify(decision.metadata.strategy),
        createdAt: new Date()
      });

    } catch (error) {
      console.error('[CollabDecision] ❌ 记录决策日志失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }
}

// 创建单例
const collabDecisionService = new CollabDecisionService();

module.exports = collabDecisionService;
