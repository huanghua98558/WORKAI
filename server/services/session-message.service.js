/**
 * 会话消息记录服务
 * 负责保存和查询会话消息记录
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sessionMessages } = require('../database/schema');
const { sql } = require('drizzle-orm');
const logger = require('./system-logger.service');

class SessionMessageService {
  /**
   * 保存用户消息
   */
  async saveUserMessage(sessionId, messageContext, messageId, robot) {
    try {
      const db = await getDb();

      // 验证必填字段
      if (!sessionId) {
        throw new Error('sessionId 不能为空');
      }

      if (!messageContext || !messageContext.content) {
        throw new Error('消息内容不能为空');
      }

      // 获取机器人名称：优先使用 nickname，其次 name，最后使用 robotId
      const robotName = robot?.nickname || robot?.name || robot?.robotId || '未知机器人';

      const message = {
        sessionId: sessionId,
        messageId: messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: messageContext.userId || messageContext.fromName || null,
        groupId: messageContext.groupId || messageContext.groupName || null,
        userName: messageContext.userName || messageContext.fromName || null,
        groupName: messageContext.groupName || null,
        content: messageContext.content,
        isFromUser: true,
        isFromBot: false,
        isHuman: false,
        robotId: robot?.robotId || null,
        robotName: robotName,
        timestamp: messageContext.timestamp || new Date(),
      };

      // 验证字段长度
      if (message.sessionId && message.sessionId.length > 255) {
        throw new Error(`sessionId 长度超过限制: ${message.sessionId.length}`);
      }

      if (message.robotId && message.robotId.length > 64) {
        throw new Error(`robotId 长度超过限制: ${message.robotId.length}, value: ${message.robotId}`);
      }

      if (message.robotName && message.robotName.length > 255) {
        throw new Error(`robotName 长度超过限制: ${message.robotName.length}`);
      }

      logger.info('SessionMessage', '准备保存用户消息', {
        sessionId: message.sessionId,
        messageId: message.messageId,
        robotId: message.robotId,
        robotName: message.robotName,
        contentLength: message.content.length,
        timestamp: message.timestamp
      });

      await db.insert(sessionMessages).values(message);

      logger.info('SessionMessage', '用户消息保存成功', {
        sessionId: message.sessionId,
        messageId: message.messageId,
        robotId: message.robotId,
        robotName: message.robotName,
        contentLength: message.content.length
      });

      console.log(`[会话消息] 保存用户消息: sessionId=${sessionId}, robot=${robotName}, content="${messageContext.content.substring(0, 50)}..."`);
    } catch (error) {
      logger.error('SessionMessage', '保存用户消息失败', {
        sessionId,
        messageId,
        robotId: robot?.robotId,
        robotName: robot?.nickname || robot?.name || robot?.robotId,
        error: error.message,
        stack: error.stack,
        messageContext: {
          userId: messageContext?.userId,
          groupId: messageContext?.groupId,
          userName: messageContext?.userName,
          groupName: messageContext?.groupName,
          contentLength: messageContext?.content?.length,
          timestamp: messageContext?.timestamp
        }
      });

      console.error('[会话消息] 保存用户消息失败:', error);
      console.error('[会话消息] 错误详情:', {
        sessionId,
        messageId,
        robotId: robot?.robotId,
        robotIdLength: robot?.robotId?.length,
        robotName: robot?.nickname || robot?.name || robot?.robotId,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * 保存机器人回复消息
   */
  async saveBotMessage(sessionId, content, messageContext, intent, robot) {
    const db = await getDb();

    // 获取机器人名称：优先使用 nickname，其次 name，最后使用 robotId
    const robotName = robot?.nickname || robot?.name || robot?.robotId || '未知机器人';

    const message = {
      sessionId: sessionId,
      messageId: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: messageContext?.userId || messageContext?.fromName,
      groupId: messageContext?.groupId || messageContext?.groupName,
      userName: messageContext?.userName || messageContext?.fromName,
      groupName: messageContext?.groupName,
      content: content,
      isFromUser: false,
      isFromBot: true,
      isHuman: false,
      intent: intent,
      robotId: robot?.robotId || null,
      robotName: robotName,
      timestamp: new Date(),
    };

    await db.insert(sessionMessages).values(message);
    console.log(`[会话消息] 保存机器人回复: sessionId=${sessionId}, robot=${robotName}, intent=${intent}, content="${content.substring(0, 50)}..."`);
  }

  /**
   * 保存人工回复消息
   */
  async saveHumanMessage(sessionId, content, messageContext, operator, robot) {
    const db = await getDb();

    // 获取机器人名称：优先使用 nickname，其次 name，最后使用 robotId
    const robotName = robot?.nickname || robot?.name || robot?.robotId || '未知机器人';

    const message = {
      sessionId: sessionId,
      messageId: `human_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: messageContext?.userId || messageContext?.fromName,
      groupId: messageContext?.groupId || messageContext?.groupName,
      userName: messageContext?.userName || messageContext?.fromName,
      groupName: messageContext?.groupName,
      content: content,
      isFromUser: false,
      isFromBot: false,
      isHuman: true,
      robotId: robot?.robotId || null,
      robotName: robotName,
      extraData: { operator },
      timestamp: new Date(),
    };

    await db.insert(sessionMessages).values(message);
    console.log(`[会话消息] 保存人工回复: sessionId=${sessionId}, robot=${robotName}, operator=${operator}`);
  }

  /**
   * 获取会话的消息记录
   */
  async getSessionMessages(sessionId, limit = 100) {
    const db = await getDb();

    const messages = await db
      .select()
      .from(sessionMessages)
      .where(sql`${sessionMessages.sessionId} = ${sessionId}`)
      .orderBy(sessionMessages.timestamp)
      .limit(limit);

    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isFromUser: msg.isFromUser,
      isFromBot: msg.isFromBot,
      isHuman: msg.isHuman,
      timestamp: msg.timestamp,
      intent: msg.intent,
      userName: msg.userName,
      groupName: msg.groupName,
      robotName: msg.robotName,
      extraData: msg.extraData,
    }));
  }

  /**
   * 搜索会话消息
   */
  async searchMessages(keyword, limit = 50) {
    const db = await getDb();

    const messages = await db
      .select()
      .from(sessionMessages)
      .where(sql`${sessionMessages.content} ILIKE ${'%' + keyword + '%'}`)
      .orderBy(sessionMessages.timestamp)
      .limit(limit);

    return messages;
  }

  /**
   * 获取用户的消息历史
   */
  async getUserMessages(userId, limit = 50) {
    const db = await getDb();

    const messages = await db
      .select()
      .from(sessionMessages)
      .where(sql`${sessionMessages.userId} = ${userId}`)
      .orderBy(sessionMessages.timestamp)
      .limit(limit);

    return messages;
  }

  /**
   * 获取会话统计
   */
  async getSessionStats(sessionId) {
    const db = await getDb();

    const result = await db
      .select({
        total: sql`COUNT(*)`,
        userMessages: sql`SUM(CASE WHEN is_from_user = true THEN 1 ELSE 0 END)`,
        botMessages: sql`SUM(CASE WHEN is_from_bot = true THEN 1 ELSE 0 END)`,
        humanMessages: sql`SUM(CASE WHEN is_human = true THEN 1 ELSE 0 END)`,
      })
      .from(sessionMessages)
      .where(sql`${sessionMessages.sessionId} = ${sessionId}`);

    return result[0] || { total: 0, userMessages: 0, botMessages: 0, humanMessages: 0 };
  }

  /**
   * 清理过期的消息记录（保留最近90天）
   */
  async cleanup(days = 90) {
    const db = await getDb();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .delete(sessionMessages)
      .where(sql`${sessionMessages.timestamp} < ${cutoffDate.toISOString()}`)
      .returning();

    console.log(`[会话消息] 清理 ${days} 天前的消息记录，删除 ${result.length} 条`);
    return result.length;
  }
}

module.exports = new SessionMessageService();
