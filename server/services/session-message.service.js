/**
 * 会话消息记录服务
 * 负责保存和查询会话消息记录
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sessionMessages } = require('../database/schema');
const { sql } = require('drizzle-orm');

class SessionMessageService {
  /**
   * 保存用户消息
   */
  async saveUserMessage(sessionId, messageContext, messageId) {
    const db = await getDb();

    const message = {
      sessionId: sessionId,
      messageId: messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: messageContext.userId || messageContext.fromName,
      groupId: messageContext.groupId || messageContext.groupName,
      userName: messageContext.userName || messageContext.fromName,
      groupName: messageContext.groupName,
      content: messageContext.content,
      isFromUser: true,
      isFromBot: false,
      isHuman: false,
      timestamp: messageContext.timestamp || new Date(),
    };

    await db.insert(sessionMessages).values(message);
    console.log(`[会话消息] 保存用户消息: sessionId=${sessionId}, content="${messageContext.content.substring(0, 50)}..."`);
  }

  /**
   * 保存机器人回复消息
   */
  async saveBotMessage(sessionId, content, messageContext, intent) {
    const db = await getDb();

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
      timestamp: new Date(),
    };

    await db.insert(sessionMessages).values(message);
    console.log(`[会话消息] 保存机器人回复: sessionId=${sessionId}, intent=${intent}, content="${content.substring(0, 50)}..."`);
  }

  /**
   * 保存人工回复消息
   */
  async saveHumanMessage(sessionId, content, messageContext, operator) {
    const db = await getDb();

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
      extraData: { operator },
      timestamp: new Date(),
    };

    await db.insert(sessionMessages).values(message);
    console.log(`[会话消息] 保存人工回复: sessionId=${sessionId}, operator=${operator}`);
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
