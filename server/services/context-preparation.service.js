/**
 * ContextPreparationService - 上下文准备服务
 * 
 * 功能：
 * - 检索历史消息
 * - 计算用户画像
 * - 计算工作人员状态
 * - 获取售后任务状态
 * - 获取群聊信息
 * - 动态调整上下文数量
 */

const { getDb } = require('coze-coding-dev-sdk');
const { 
  sessionMessages,
  userSessions, 
  sessions,
  tasks,
  groupSessions
} = require('../database/schema');
const { eq, and, desc, gte, lte, sql, count } = require('drizzle-orm');

class ContextPreparationService {
  constructor() {
    this.dbPromise = null;
    console.log('[ContextPreparation] 上下文准备服务初始化完成');
  }

  async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = getDb();
    }
    return this.dbPromise;
  }

  /**
   * 准备上下文数据（主入口）
   * @param {string} sessionId - 会话ID
   * @param {Object} message - 消息对象
   * @param {Object} robot - 机器人对象
   * @returns {Promise<Object>} 完整上下文数据
   */
  async prepareContext(sessionId, message, robot) {
    const startTime = Date.now();
    console.log('[ContextPreparation] === 准备上下文数据 ===');
    console.log('[ContextPreparation] sessionId:', sessionId);

    try {
      // 1. 判断是否为新会话
      const isNewSession = await this.checkIsNewSession(sessionId);

      // 2. 检索历史消息
      const historyMessages = await this.getHistoryMessages(sessionId, message);

      // 3. 获取用户画像
      const userProfile = await this.getUserProfile(message.receivedName, robot);

      // 4. 获取工作人员状态
      const staffStatus = await this.getStaffStatus(robot);

      // 5. 获取售后任务状态
      const taskStatus = await this.getTaskStatus(message.receivedName);

      // 6. 获取群聊信息
      const groupInfo = await this.getGroupInfo(message.groupName, robot);

      // 7. 动态调整上下文数量
      const adjustedHistoryMessages = this.adjustContextCount(
        historyMessages,
        message.textType
      );

      const retrievalTime = Date.now() - startTime;

      const contextData = {
        session_id: sessionId,
        robotId: robot.robotId, // 添加机器人ID
        is_new_session: isNewSession,
        history_messages: adjustedHistoryMessages,
        current_message: message, // 添加当前消息
        user_profile: userProfile,
        staff_status: staffStatus,
        task_status: taskStatus,
        group_info: groupInfo,
        metadata: {
          context_count: adjustedHistoryMessages.length,
          context_type: this.getContextType(message.roomType),
          retrieval_time: retrievalTime,
          retrieval_strategy: this.getRetrievalStrategy(isNewSession, adjustedHistoryMessages.length)
        }
      };

      console.log('[ContextPreparation] 上下文准备完成:', {
        contextCount: adjustedHistoryMessages.length,
        retrievalTime: retrievalTime + 'ms',
        userSatisfaction: userProfile.satisfaction_score,
        hasPendingTask: taskStatus.has_pending_task
      });

      return contextData;

    } catch (error) {
      console.error('[ContextPreparation] ❌ 准备上下文失败:', error);
      throw error;
    }
  }

  /**
   * 判断是否为新会话
   */
  async checkIsNewSession(sessionId) {
    try {
      const db = await this.getDb();
      
      const existingMessages = await db.select()
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, sessionId))
        .limit(1);

      return existingMessages.length === 0;
    } catch (error) {
      // 如果查询失败，假设是新会话
      console.error('[ContextPreparation] checkIsNewSession错误:', error.message);
      return true;
    }
  }

  /**
   * 检索历史消息
   */
  async getHistoryMessages(sessionId, message) {
    try {
      const db = await this.getDb();
      
      const historyMessages = await db.select()
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, sessionId))
        .orderBy(desc(sessionMessages.createdAt))
        .limit(30);

      // 反转数组，使最新的消息在最后
      return historyMessages.reverse().map(msg => ({
        message_id: msg.id,
        sender_type: msg.isFromUser ? 'user' : (msg.isFromBot ? 'bot' : 'system'),
        sender_name: msg.userName,
        sender_enterprise: msg.extraData?.enterpriseName || '',
        sender_robot_id: msg.robotId || null,
        content: msg.content,
        message_type: 'text',
        timestamp: msg.timestamp
      }));
    } catch (error) {
      // 如果查询失败，返回空数组
      console.error('[ContextPreparation] getHistoryMessages错误:', error.message);
      return [];
    }
  }

  /**
   * 获取用户画像
   */
  async getUserProfile(userName, robot) {
    const db = await this.getDb();
    
    // 生成用户ID（基于用户名）
    const userId = `user_${Buffer.from(userName).toString('base64').substring(0, 16)}`;

    try {
      // 查询用户会话
      const userSession = await db.select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .limit(1);

      if (userSession.length === 0) {
        // 新用户，返回默认值
        return {
          user_id: userId,
          user_name: userName,
          enterprise_name: '',
          satisfaction_score: 50,
          problem_resolution_rate: 0,
          message_count: 0,
          last_message_time: null,
          joined_at: new Date().toISOString(),
          user_type: 'new'
        };
      }

      const session = userSession[0];

      // 计算用户类型
      const now = new Date();
      const lastMessageAt = session.lastMessageTime ? new Date(session.lastMessageTime) : null;
      let userType = 'new';

      if (session.messageCount >= 5) {
        if (lastMessageAt && (now - lastMessageAt) < 24 * 60 * 60 * 1000) {
          userType = 'active';
        } else if (lastMessageAt && (now - lastMessageAt) < 7 * 24 * 60 * 60 * 1000) {
          userType = 'inactive';
        } else {
          userType = 'archived';
        }
      }

      return {
        user_id: session.userId,
        user_name: userName,
        enterprise_name: session.enterpriseName || '',
        satisfaction_score: session.satisfactionScore || 50,
        problem_resolution_rate: session.problemResolutionRate || 0,
        message_count: session.messageCount || 0,
        last_message_time: session.lastMessageTime || null,
        joined_at: session.createdAt,
        user_type: userType
      };
    } catch (error) {
      // 如果查询失败（比如字段不存在），返回默认值
      console.error('[ContextPreparation] getUserProfile错误:', error.message);
      return {
        user_id: userId,
        user_name: userName,
        enterprise_name: '',
        satisfaction_score: 50,
        problem_resolution_rate: 0,
        message_count: 0,
        last_message_time: null,
        joined_at: new Date().toISOString(),
        user_type: 'new'
      };
    }
  }

  /**
   * 获取工作人员状态
   */
  async getStaffStatus(robot) {
    // 暂时返回空数据，因为没有staff表
    return {
      online_staff: [],
      is_handling: false,
      handling_staff: null,
      staff_activity: 'low',
      total_staff_count: 0,
      online_staff_count: 0
    };
  }

  /**
   * 获取售后任务状态
   */
  async getTaskStatus(userName) {
    try {
      const db = await this.getDb();
      
      const userId = `user_${Buffer.from(userName).toString('base64').substring(0, 16)}`;

      // 查询未完成的任务（使用createdBy字段关联用户）
      const pendingTasks = await db.select()
        .from(tasks)
        .where(
          sql`${tasks.status} != 'completed' AND ${tasks.createdBy} = ${userId}`
        )
        .orderBy(desc(tasks.createdAt))
        .limit(1);

      if (pendingTasks.length === 0) {
        return {
          has_pending_task: false,
          task_id: null,
          task_type: null,
          task_status: null,
          created_at: null,
          updated_at: null
        };
      }

      const task = pendingTasks[0];

      return {
        has_pending_task: true,
        task_id: task.taskId,
        task_type: task.priority, // 使用priority作为任务类型
        task_status: task.status,
        created_at: task.createdAt,
        updated_at: task.updatedAt
      };
    } catch (error) {
      // 如果查询失败（比如字段不存在），返回默认值
      console.error('[ContextPreparation] getTaskStatus错误:', error.message);
      return {
        has_pending_task: false,
        task_id: null,
        task_type: null,
        task_status: null,
        created_at: null,
        updated_at: null
      };
    }
  }

  /**
   * 获取群聊信息
   */
  async getGroupInfo(groupName, robot) {
    try {
      const db = await this.getDb();
      
      // 生成群组ID（基于群名）
      const groupId = `group_${Buffer.from(groupName).toString('base64').substring(0, 16)}`;

      // 查询社群会话
      const groupSession = await db.select()
        .from(groupSessions)
        .where(eq(groupSessions.groupId, groupId))
        .limit(1);

      if (groupSession.length === 0) {
        // 新群组，返回默认值
        return {
          group_id: groupId,
          group_name: groupName,
          member_count: 0,
          message_count: 0,
          last_message_time: null,
          group_type: 'external', // 默认为外部群
          created_at: new Date().toISOString()
        };
      }

      const session = groupSession[0];

      return {
        group_id: session.groupId,
        group_name: session.groupName,
        member_count: session.memberCount,
        message_count: session.messageCount,
        last_message_time: session.lastMessageTime || null,
        group_type: 'external', // 默认为外部群，因为没有groupType字段
        created_at: session.createdAt
      };
    } catch (error) {
      // 如果查询失败，返回默认值
      console.error('[ContextPreparation] getGroupInfo错误:', error.message);
      const groupId = `group_${Buffer.from(groupName).toString('base64').substring(0, 16)}`;
      return {
        group_id: groupId,
        group_name: groupName,
        member_count: 0,
        message_count: 0,
        last_message_time: null,
        group_type: 'external',
        created_at: new Date().toISOString()
      };
    }
  }

  /**
   * 动态调整上下文数量
   */
  adjustContextCount(historyMessages, textType) {
    // 如果是图片消息，返回空数组
    if (textType === 2) {
      return [];
    }

    // 新会话，返回空数组
    if (historyMessages.length === 0) {
      return [];
    }

    // 如果会话消息总数 < 10条，返回全部消息
    if (historyMessages.length < 10) {
      return historyMessages;
    }

    // 简单策略：返回最近10条消息
    // TODO: 可以根据消息类型动态调整数量
    return historyMessages.slice(-10);
  }

  /**
   * 获取上下文类型
   */
  getContextType(roomType) {
    switch (roomType) {
      case 1: // 外部群
      case 3: // 内部群
        return 'group_session';
      case 2: // 外部联系人
      case 4: // 内部联系人
        return 'user_session';
      default:
        return 'user_session';
    }
  }

  /**
   * 获取检索策略
   */
  getRetrievalStrategy(isNewSession, contextCount) {
    if (isNewSession) {
      return 'empty';
    }
    return `recent_${contextCount}_messages`;
  }

  /**
   * 映射内容类型
   */
  mapContentType(contentType) {
    const typeMap = {
      'text': 'text',
      'image': 'image',
      'audio': 'audio',
      'video': 'video',
      'file': 'video' // 暂时映射到video
    };
    return typeMap[contentType] || 'text';
  }
}

// 导出单例
module.exports = new ContextPreparationService();
