/**
 * AI IO 日志服务
 * 记录 AI 的输入输出，用于实时查看和调试
 */

const { getDb } = require('coze-coding-dev-sdk');
const { aiIoLogs } = require('../database/schema');
const { sql } = require('drizzle-orm');

class AIIoLogService {
  /**
   * 保存 AI IO 日志
   * @param {Object} data - 日志数据
   */
  async saveLog(data) {
    const db = await getDb();

    const log = {
      sessionId: data.sessionId || null,
      messageId: data.messageId || null,
      robotId: data.robotId || null,
      robotName: data.robotName || null,
      operationType: data.operationType,
      aiInput: data.aiInput,
      aiOutput: data.aiOutput || null,
      modelId: data.modelId || null,
      temperature: data.temperature ? String(data.temperature) : null,
      requestDuration: data.requestDuration || null,
      status: data.status || 'success',
      errorMessage: data.errorMessage || null,
      extraData: data.extraData || null,
    };

    try {
      await db.insert(aiIoLogs).values(log);
      console.log(`[AI IO 日志] 保存日志: ${data.operationType}, status=${data.status}`);
    } catch (error) {
      console.error('[AI IO 日志] 保存失败:', error);
    }
  }

  /**
   * 查询 AI IO 日志
   * @param {Object} filters - 过滤条件
   */
  async getLogs(filters = {}) {
    const db = await getDb();

    let query = db.select().from(aiIoLogs);

    // 添加过滤条件
    if (filters.sessionId) {
      query = query.where(sql`${aiIoLogs.sessionId} = ${filters.sessionId}`);
    }
    if (filters.robotId) {
      query = query.where(sql`${aiIoLogs.robotId} = ${filters.robotId}`);
    }
    if (filters.operationType) {
      query = query.where(sql`${aiIoLogs.operationType} = ${filters.operationType}`);
    }
    if (filters.status) {
      query = query.where(sql`${aiIoLogs.status} = ${filters.status}`);
    }
    if (filters.startTime) {
      query = query.where(sql`${aiIoLogs.createdAt} >= ${filters.startTime}`);
    }
    if (filters.endTime) {
      query = query.where(sql`${aiIoLogs.createdAt} <= ${filters.endTime}`);
    }

    // 排序和分页
    query = query.orderBy(sql`${aiIoLogs.createdAt} DESC`);
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  /**
   * 根据 messageId 查询日志
   */
  async getLogsByMessageId(messageId, limit = 10) {
    const db = await getDb();

    return await db
      .select()
      .from(aiIoLogs)
      .where(sql`${aiIoLogs.messageId} = ${messageId}`)
      .orderBy(sql`${aiIoLogs.createdAt} DESC`)
      .limit(limit);
  }

  /**
   * 根据 sessionId 查询日志
   */
  async getLogsBySessionId(sessionId, limit = 100) {
    const db = await getDb();

    return await db
      .select()
      .from(aiIoLogs)
      .where(sql`${aiIoLogs.sessionId} = ${sessionId}`)
      .orderBy(sql`${aiIoLogs.createdAt} ASC`)
      .limit(limit);
  }

  /**
   * 获取统计信息
   */
  async getStats(filters = {}) {
    const db = await getDb();

    let whereClause = sql`1=1`;
    
    if (filters.robotId) {
      whereClause = sql`${whereClause} AND ${aiIoLogs.robotId} = ${filters.robotId}`;
    }
    if (filters.startTime) {
      whereClause = sql`${whereClause} AND ${aiIoLogs.createdAt} >= ${filters.startTime}`;
    }
    if (filters.endTime) {
      whereClause = sql`${whereClause} AND ${aiIoLogs.createdAt} <= ${filters.endTime}`;
    }

    const result = await db
      .select({
        total: sql`COUNT(*)`,
        success: sql`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        error: sql`SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)`,
        avgDuration: sql`AVG(request_duration)`,
      })
      .from(aiIoLogs)
      .where(whereClause);

    return result[0] || { total: 0, success: 0, error: 0, avgDuration: 0 };
  }

  /**
   * 清理过期日志（保留最近30天）
   */
  async cleanup(days = 30) {
    const db = await getDb();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .delete(aiIoLogs)
      .where(sql`${aiIoLogs.createdAt} < ${cutoffDate.toISOString()}`)
      .returning();

    console.log(`[AI IO 日志] 清理 ${days} 天前的日志，删除 ${result.length} 条`);
    return result.length;
  }
}

module.exports = new AIIoLogService();
