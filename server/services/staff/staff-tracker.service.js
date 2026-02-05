/**
 * 工作人员追踪服务
 * 负责追踪工作人员活动和状态
 *
 * 功能：
 * - 记录工作人员消息
 * - 记录工作人员加入/离开
 * - 追踪工作人员活动
 * - 管理会话工作人员状态
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { staffMessages, staffActivities, sessionStaffStatus } = require('../../database/schema');
const { eq, and, gte, sql } = require('drizzle-orm');

class StaffTrackerService {
  constructor() {
    this.dbPromise = null;
    console.log('[StaffTracker] 工作人员追踪服务初始化完成');
  }

  async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = getDb();
    }
    return this.dbPromise;
  }

  /**
   * 记录工作人员消息
   * @param {string} sessionId - 会话ID
   * @param {Object} message - 消息对象
   */
  async recordStaffMessage(sessionId, message) {
    try {
      const db = await this.getDb();

      await db.insert(staffMessages).values({
        id: uuidv4(),
        sessionId,
        messageId: message.messageId,
        staffUserId: message.userId,
        staffName: message.receivedName || message.staffName,
        content: message.content,
        messageType: 'reply',
        timestamp: message.timestamp || new Date()
      });

      // 更新工作人员活动
      await this.updateActivity(sessionId, message.userId, 'message', {
        messageId: message.messageId,
        content: message.content
      });

      console.log('[StaffTracker] ✅ 记录工作人员消息:', {
        sessionId,
        userId: message.userId,
        messageId: message.messageId
      });

    } catch (error) {
      console.error('[StaffTracker] ❌ 记录工作人员消息失败:', error);
      throw error;
    }
  }

  /**
   * 记录工作人员加入
   * @param {string} sessionId - 会话ID
   * @param {string} staffUserId - 工作人员ID
   * @param {string} staffName - 工作人员名称
   */
  async recordStaffJoin(sessionId, staffUserId, staffName) {
    try {
      await this.updateActivity(sessionId, staffUserId, 'join', {
        staffName
      });

      // 更新会话状态
      await this.updateSessionStaffStatus(sessionId, {
        hasStaffParticipated: true,
        currentStaffUserId: staffUserId,
        staffJoinTime: new Date()
      });

      console.log('[StaffTracker] ✅ 工作人员加入:', {
        sessionId,
        staffUserId,
        staffName
      });

    } catch (error) {
      console.error('[StaffTracker] ❌ 记录工作人员加入失败:', error);
      throw error;
    }
  }

  /**
   * 记录工作人员离开
   * @param {string} sessionId - 会话ID
   * @param {string} staffUserId - 工作人员ID
   */
  async recordStaffLeave(sessionId, staffUserId) {
    try {
      await this.updateActivity(sessionId, staffUserId, 'leave');

      // 更新会话状态
      await this.updateSessionStaffStatus(sessionId, {
        currentStaffUserId: null,
        staffLeaveTime: new Date()
      });

      console.log('[StaffTracker] ✅ 工作人员离开:', {
        sessionId,
        staffUserId
      });

    } catch (error) {
      console.error('[StaffTracker] ❌ 记录工作人员离开失败:', error);
      throw error;
    }
  }

  /**
   * 更新工作人员活动
   * @param {string} sessionId - 会话ID
   * @param {string} staffUserId - 工作人员ID
   * @param {string} activityType - 活动类型（join/leave/message/command/handling）
   * @param {Object} detail - 活动详情
   */
  async updateActivity(sessionId, staffUserId, activityType, detail = {}) {
    try {
      const db = await this.getDb();

      await db.insert(staffActivities).values({
        id: uuidv4(),
        sessionId,
        staffUserId,
        staffName: detail.staffName,
        activityType,
        activityDetail: JSON.stringify(detail),
        messageId: detail.messageId,
        createdAt: new Date()
      });

    } catch (error) {
      console.error('[StaffTracker] ❌ 更新工作人员活动失败:', error);
      throw error;
    }
  }

  /**
   * 更新会话工作人员状态
   * @param {string} sessionId - 会话ID
   * @param {Object} updates - 更新内容
   */
  async updateSessionStaffStatus(sessionId, updates) {
    try {
      const db = await this.getDb();

      // 检查是否已存在
      const existing = await db.select()
        .from(sessionStaffStatus)
        .where(eq(sessionStaffStatus.sessionId, sessionId))
        .limit(1);

      if (existing.length > 0) {
        // 更新
        const updateData = {
          ...updates,
          updatedAt: new Date()
        };

        await db.update(sessionStaffStatus)
          .set(updateData)
          .where(eq(sessionStaffStatus.sessionId, sessionId));

      } else {
        // 创建
        await db.insert(sessionStaffStatus).values({
          id: uuidv4(),
          sessionId,
          ...updates,
          updatedAt: new Date()
        });
      }

    } catch (error) {
      console.error('[StaffTracker] ❌ 更新会话工作人员状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取工作人员信息
   * @param {string} sessionId - 会话ID
   * @returns {Object} 工作人员信息
   */
  async getStaffInfo(sessionId) {
    try {
      const db = await this.getDb();

      const statusResult = await db.select()
        .from(sessionStaffStatus)
        .where(eq(sessionStaffStatus.sessionId, sessionId))
        .limit(1);

      const status = statusResult.length > 0 ? statusResult[0] : null;

      if (!status) {
        return {
          hasStaff: false,
          currentStaff: null,
          joinTime: null,
          messageCount: 0,
          lastActivity: null,
          collaborationMode: 'adaptive',
          aiReplyStrategy: 'normal',
          isHandlingRisk: false
        };
      }

      // 检查是否正在处理风险
      const isHandlingRisk = await this.checkHandlingRisk(sessionId);

      return {
        hasStaff: status.hasStaffParticipated || false,
        currentStaff: status.currentStaffUserId,
        joinTime: status.staffJoinTime,
        leaveTime: status.staffLeaveTime,
        messageCount: status.staffMessageCount || 0,
        lastActivity: status.lastStaffActivity,
        collaborationMode: status.collaborationMode,
        aiReplyStrategy: status.aiReplyStrategy,
        isHandlingRisk
      };

    } catch (error) {
      console.error('[StaffTracker] ❌ 获取工作人员信息失败:', error);
      throw error;
    }
  }

  /**
   * 检查工作人员是否正在处理风险
   * @param {string} sessionId - 会话ID
   * @returns {Promise<boolean>}
   */
  async checkHandlingRisk(sessionId) {
    try {
      const db = await this.getDb();

      // 查询最近5分钟内的工作人员处理指令
      const recentActivities = await db.select()
        .from(staffActivities)
        .where(and(
          eq(staffActivities.sessionId, sessionId),
          eq(staffActivities.activityType, 'command'),
          gte(staffActivities.createdAt, new Date(Date.now() - 5 * 60 * 1000))
        ))
        .limit(1);

      return recentActivities.length > 0;

    } catch (error) {
      console.error('[StaffTracker] ❌ 检查风险处理状态失败:', error);
      return false;
    }
  }

  /**
   * 获取工作人员活跃度
   * @param {string} sessionId - 会话ID
   * @param {number} timeRange - 时间范围（毫秒），默认5分钟
   * @returns {Promise<Object>}
   */
  async getActivityLevel(sessionId, timeRange = 300000) {
    try {
      const db = await this.getDb();

      const activities = await db.select()
        .from(staffActivities)
        .where(and(
          eq(staffActivities.sessionId, sessionId),
          gte(staffActivities.createdAt, new Date(Date.now() - timeRange))
        ));

      const level = activities.length > 5 ? 'high' :
                   activities.length > 2 ? 'medium' : 'low';

      return {
        count: activities.length,
        level,
        activities: activities.map(a => ({
          type: a.activityType,
          time: a.createdAt
        }))
      };

    } catch (error) {
      console.error('[StaffTracker] ❌ 获取活跃度失败:', error);
      return { count: 0, level: 'low', activities: [] };
    }
  }

  /**
   * 获取工作人员消息列表
   * @param {string} sessionId - 会话ID
   * @param {number} limit - 限制数量，默认20
   * @returns {Promise<Array>}
   */
  async getStaffMessages(sessionId, limit = 20) {
    try {
      const db = await this.getDb();

      const messages = await db.select()
        .from(staffMessages)
        .where(eq(staffMessages.sessionId, sessionId))
        .orderBy(staffMessages.createdAt)
        .limit(limit)
        .then(rows => rows.reverse());

      return messages;

    } catch (error) {
      console.error('[StaffTracker] ❌ 获取工作人员消息失败:', error);
      return [];
    }
  }

  /**
   * 获取工作人员活动历史
   * @param {string} sessionId - 会话ID
   * @param {number} limit - 限制数量，默认20
   * @returns {Promise<Array>}
   */
  async getStaffActivities(sessionId, limit = 20) {
    try {
      const db = await this.getDb();

      const activities = await db.select()
        .from(staffActivities)
        .where(eq(staffActivities.sessionId, sessionId))
        .orderBy(staffActivities.createdAt)
        .limit(limit)
        .then(rows => rows.reverse());

      return activities.map(a => ({
        ...a,
        activityDetail: a.activityDetail ? JSON.parse(a.activityDetail) : null
      }));

    } catch (error) {
      console.error('[StaffTracker] ❌ 获取活动历史失败:', error);
      return [];
    }
  }
}

// 创建单例
const staffTrackerService = new StaffTrackerService();

module.exports = staffTrackerService;
