/**
 * 消息处理服务（改造版）
 * 集成工作人员协同功能
 *
 * 改造内容：
 * - 1. 消息入口识别工作人员
 * - 2. 工作人员消息记录活动并检查指令
 * - 3. 工作人员消息不触发AI回复
 * - 4. 非工作人员消息进行协同决策
 * - 5. 根据决策结果决定是否触发AI回复
 */

const { v4: uuidv4 } = require('uuid');
const staffIdentifierService = require('./staff/staff-identifier.service');
const staffTrackerService = require('./staff/staff-tracker.service');
const staffCommandService = require('./staff/staff-command.service');
const collabDecisionService = require('./collab/collab-decision.service');
const { getDb } = require('coze-coding-dev-sdk');
const { staffMessages, collaborationDecisionLogs } = require('../database/schema');
const { eq, and } = require('drizzle-orm');

class MessageProcessingService {
  constructor() {
    this.dbPromise = null;
    console.log('[MessageProcessing] 消息处理服务（协同版）初始化完成');
  }

  async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = getDb();
    }
    return this.dbPromise;
  }

  /**
   * 处理消息（主入口）
   * @param {Object} context - 上下文对象
   * @param {Object} message - 消息对象
   * @param {Object} robot - 机器人配置
   * @returns {Promise<Object>} 处理结果
   */
  async processMessage(context, message, robot) {
    console.log('[MessageProcessing] === 处理消息 ===');
    console.log('[MessageProcessing] 会话ID:', context.sessionId);
    console.log('[MessageProcessing] 消息ID:', message.messageId);
    console.log('[MessageProcessing] 消息内容:', message.content);

    try {
      // === 第1步：识别工作人员 ===
      const staffInfo = await staffIdentifierService.identifyStaff(
        context,
        message,
        robot
      );

      console.log('[MessageProcessing] 工作人员识别结果:', {
        isStaff: staffInfo.isStaff,
        confidence: staffInfo.confidence,
        matchMethod: staffInfo.matchMethod,
        staffUserId: staffInfo.staffUserId
      });

      // === 第2步：如果是工作人员消息 ===
      if (staffInfo.isStaff) {
        return await this.handleStaffMessage(context, message, staffInfo, robot);
      }

      // === 第3步：非工作人员消息，进行协同决策 ===
      return await this.handleUserMessage(context, message, robot);

    } catch (error) {
      console.error('[MessageProcessing] ❌ 处理消息失败:', error);
      throw error;
    }
  }

  /**
   * 处理工作人员消息
   * @param {Object} context - 上下文对象
   * @param {Object} message - 消息对象
   * @param {Object} staffInfo - 工作人员信息
   * @param {Object} robot - 机器人配置
   * @returns {Promise<Object>} 处理结果
   */
  async handleStaffMessage(context, message, staffInfo, robot) {
    console.log('[MessageProcessing] 处理工作人员消息');

    try {
      // 1. 记录工作人员消息
      await this.recordStaffMessage(context, message, staffInfo);

      // 2. 记录工作人员活动
      await staffTrackerService.updateActivity(
        context.sessionId,
        staffInfo.staffUserId,
        'message',
        {
          messageId: message.messageId,
          content: message.content,
          confidence: staffInfo.confidence,
          matchMethod: staffInfo.matchMethod
        }
      );

      // 3. 更新会话状态
      await staffTrackerService.updateSessionStaffStatus(context.sessionId, {
        hasStaff: true,
        currentStaff: staffInfo.staffUserId,
        lastActivity: new Date()
      });

      // 4. 检查工作人员指令
      const commandInfo = await staffCommandService.detectCommand(message);
      if (commandInfo) {
        console.log('[MessageProcessing] 检测到工作人员指令:', commandInfo.command);

        const commandResult = await staffCommandService.executeCommand(
          context.sessionId,
          commandInfo,
          staffInfo.staffUserId,
          message
        );

        return {
          success: true,
          type: 'staff_command',
          commandInfo,
          commandResult,
          shouldTriggerAI: false, // 工作人员指令不触发AI回复
          staffUserId: staffInfo.staffUserId
        };
      }

      // 5. 普通工作人员消息，不触发AI回复
      return {
        success: true,
        type: 'staff_message',
        staffInfo,
        shouldTriggerAI: false, // 工作人员消息不触发AI回复
        staffUserId: staffInfo.staffUserId,
        message: '工作人员消息已处理，AI不回复'
      };

    } catch (error) {
      console.error('[MessageProcessing] ❌ 处理工作人员消息失败:', error);
      throw error;
    }
  }

  /**
   * 处理非工作人员消息
   * @param {Object} context - 上下文对象
   * @param {Object} message - 消息对象
   * @param {Object} robot - 机器人配置
   * @returns {Promise<Object>} 处理结果
   */
  async handleUserMessage(context, message, robot) {
    console.log('[MessageProcessing] 处理用户消息');

    try {
      // 1. 检查协同功能是否启用
      if (!robot.enableCollaboration) {
        console.log('[MessageProcessing] 协同功能未启用，直接触发AI回复');
        return {
          success: true,
          type: 'user_message',
          shouldTriggerAI: true,
          message: '协同功能未启用，直接触发AI回复'
        };
      }

      // 2. 进行协同决策
      console.log('[MessageProcessing] 开始协同决策...');
      const decision = await collabDecisionService.makeDecision(context, robot);

      console.log('[MessageProcessing] 协同决策结果:', {
        shouldAIReply: decision.shouldAIReply,
        reason: decision.reason,
        priority: decision.priority
      });

      // 3. 返回处理结果
      return {
        success: true,
        type: 'user_message',
        shouldTriggerAI: decision.shouldAIReply,
        decision,
        message: decision.shouldAIReply
          ? '决策：AI应该回复'
          : '决策：AI不应该回复'
      };

    } catch (error) {
      console.error('[MessageProcessing] ❌ 处理用户消息失败:', error);

      // 决策失败时，降级处理：触发AI回复
      console.log('[MessageProcessing] 决策失败，降级触发AI回复');
      return {
        success: true,
        type: 'user_message',
        shouldTriggerAI: true,
        message: '决策失败，降级触发AI回复'
      };
    }
  }

  /**
   * 记录工作人员消息
   * @param {Object} context - 上下文对象
   * @param {Object} message - 消息对象
   * @param {Object} staffInfo - 工作人员信息
   */
  async recordStaffMessage(context, message, staffInfo) {
    try {
      const db = await this.getDb();

      await db.insert(staffMessages).values({
        id: uuidv4(),
        sessionId: context.sessionId,
        messageId: message.messageId,
        staffUserId: staffInfo.staffUserId,
        staffName: staffInfo.nickname,
        content: message.content,
        messageType: 'reply',
        createdAt: new Date()
      });

      console.log('[MessageProcessing] ✅ 工作人员消息已记录');

    } catch (error) {
      console.error('[MessageProcessing] ❌ 记录工作人员消息失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 获取工作人员消息列表
   * @param {string} sessionId - 会话ID
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>} 工作人员消息列表
   */
  async getStaffMessages(sessionId, limit = 50) {
    return staffTrackerService.getStaffMessages(sessionId, limit);
  }

  /**
   * 获取决策日志
   * @param {string} sessionId - 会话ID
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>} 决策日志列表
   */
  async getDecisionLogs(sessionId, limit = 50) {
    try {
      const db = await this.getDb();

      const logs = await db
        .select()
        .from(collaborationDecisionLogs)
        .where(eq(collaborationDecisionLogs.sessionId, sessionId))
        .orderBy(collaborationDecisionLogs.createdAt)
        .limit(limit);

      // 解析JSON字段
      return logs.map(log => ({
        ...log,
        staffContext: log.staffContext ? JSON.parse(log.staffContext) : null,
        infoContext: log.infoContext ? JSON.parse(log.infoContext) : null,
        strategy: log.strategy ? JSON.parse(log.strategy) : null
      }));

    } catch (error) {
      console.error('[MessageProcessing] ❌ 获取决策日志失败:', error);
      return [];
    }
  }
}

// 创建单例
const messageProcessingService = new MessageProcessingService();

module.exports = messageProcessingService;
