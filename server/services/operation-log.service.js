/**
 * 运营日志服务
 * 记录系统的操作日志，用于追踪和审计
 */

const { getDb } = require('coze-coding-dev-sdk');
const { operationLogs } = require('../database/schema');
const { sql } = require('drizzle-orm');

class OperationLogService {
  /**
   * 保存运营日志
   * @param {Object} data - 日志数据
   */
  async saveLog(data) {
    const db = await getDb();

    const log = {
      userId: data.userId || null,
      username: data.username || null,
      action: data.action,
      module: data.module,
      targetId: data.targetId || null,
      targetType: data.targetType || null,
      description: data.description || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      requestData: data.requestData || null,
      responseData: data.responseData || null,
      status: data.status || 'success',
      errorMessage: data.errorMessage || null,
      duration: data.duration || null,
    };

    try {
      await db.insert(operationLogs).values(log);
      console.log(`[运营日志] 保存日志: ${data.module}.${data.action}, status=${data.status}`);
    } catch (error) {
      console.error('[运营日志] 保存失败:', error);
    }
  }

  /**
   * 查询运营日志
   * @param {Object} filters - 过滤条件
   */
  async getLogs(filters = {}) {
    const db = await getDb();

    let query = db.select().from(operationLogs);

    // 添加过滤条件
    if (filters.userId) {
      query = query.where(sql`${operationLogs.userId} = ${filters.userId}`);
    }
    if (filters.username) {
      query = query.where(sql`${operationLogs.username} ILIKE ${'%' + filters.username + '%'}`);
    }
    if (filters.module) {
      query = query.where(sql`${operationLogs.module} = ${filters.module}`);
    }
    if (filters.action) {
      query = query.where(sql`${operationLogs.action} ILIKE ${'%' + filters.action + '%'}`);
    }
    if (filters.targetId) {
      query = query.where(sql`${operationLogs.targetId} = ${filters.targetId}`);
    }
    if (filters.status) {
      query = query.where(sql`${operationLogs.status} = ${filters.status}`);
    }
    if (filters.startTime) {
      query = query.where(sql`${operationLogs.createdAt} >= ${filters.startTime}`);
    }
    if (filters.endTime) {
      query = query.where(sql`${operationLogs.createdAt} <= ${filters.endTime}`);
    }

    // 排序和分页
    query = query.orderBy(sql`${operationLogs.createdAt} DESC`);
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  /**
   * 根据 targetId 查询日志
   */
  async getLogsByTargetId(targetId, targetType = null, limit = 50) {
    const db = await getDb();

    let whereClause = sql`${operationLogs.targetId} = ${targetId}`;
    if (targetType) {
      whereClause = sql`${whereClause} AND ${operationLogs.targetType} = ${targetType}`;
    }

    return await db
      .select()
      .from(operationLogs)
      .where(whereClause)
      .orderBy(sql`${operationLogs.createdAt} DESC`)
      .limit(limit);
  }

  /**
   * 根据 userId 查询日志
   */
  async getLogsByUserId(userId, limit = 100) {
    const db = await getDb();

    return await db
      .select()
      .from(operationLogs)
      .where(sql`${operationLogs.userId} = ${userId}`)
      .orderBy(sql`${operationLogs.createdAt} DESC`)
      .limit(limit);
  }

  /**
   * 获取统计信息
   */
  async getStats(filters = {}) {
    const db = await getDb();

    let whereClause = sql`1=1`;
    
    if (filters.module) {
      whereClause = sql`${whereClause} AND ${operationLogs.module} = ${filters.module}`;
    }
    if (filters.userId) {
      whereClause = sql`${whereClause} AND ${operationLogs.userId} = ${filters.userId}`;
    }
    if (filters.startTime) {
      whereClause = sql`${whereClause} AND ${operationLogs.createdAt} >= ${filters.startTime}`;
    }
    if (filters.endTime) {
      whereClause = sql`${whereClause} AND ${operationLogs.createdAt} <= ${filters.endTime}`;
    }

    const result = await db
      .select({
        total: sql`COUNT(*)`,
        success: sql`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        error: sql`SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)`,
        avgDuration: sql`AVG(duration)`,
      })
      .from(operationLogs)
      .where(whereClause);

    return result[0] || { total: 0, success: 0, error: 0, avgDuration: 0 };
  }

  /**
   * 获取模块统计
   */
  async getModuleStats(filters = {}) {
    const db = await getDb();

    let whereClause = sql`1=1`;
    
    if (filters.startTime) {
      whereClause = sql`${whereClause} AND ${operationLogs.createdAt} >= ${filters.startTime}`;
    }
    if (filters.endTime) {
      whereClause = sql`${whereClause} AND ${operationLogs.createdAt} <= ${filters.endTime}`;
    }

    const result = await db
      .select({
        module: operationLogs.module,
        total: sql`COUNT(*)`,
        success: sql`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        error: sql`SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)`,
      })
      .from(operationLogs)
      .where(whereClause)
      .groupBy(operationLogs.module)
      .orderBy(sql`COUNT(*) DESC`);

    return result;
  }

  /**
   * 清理过期日志（保留最近90天）
   */
  async cleanup(days = 90) {
    const db = await getDb();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .delete(operationLogs)
      .where(sql`${operationLogs.createdAt} < ${cutoffDate.toISOString()}`)
      .returning();

    console.log(`[运营日志] 清理完成，删除 ${result.length} 条 ${days} 天前的日志`);
    return result.length;
  }

  /**
   * 根据ID删除单条日志
   */
  async deleteById(id) {
    const db = await getDb();

    const result = await db
      .delete(operationLogs)
      .where(sql`${operationLogs.id} = ${id}`)
      .returning();

    console.log(`[运营日志] 删除单条日志: ${id}`);
    return result.length > 0;
  }

  /**
   * 批量删除日志
   */
  async batchDelete(ids) {
    const db = await getDb();

    let whereClause = sql`1=0`; // 初始为假条件
    ids.forEach((id, index) => {
      if (index === 0) {
        whereClause = sql`${operationLogs.id} = ${id}`;
      } else {
        whereClause = sql`${whereClause} OR ${operationLogs.id} = ${id}`;
      }
    });

    const result = await db
      .delete(operationLogs)
      .where(whereClause)
      .returning();

    console.log(`[运营日志] 批量删除日志: ${result.length} 条`);
    return result.length;
  }

  /**
   * 按条件删除日志
   */
  async deleteByFilters(filters = {}) {
    const db = await getDb();

    let whereClause = sql`1=1`;

    if (filters.userId) {
      whereClause = sql`${whereClause} AND ${operationLogs.userId} = ${filters.userId}`;
    }
    if (filters.username) {
      whereClause = sql`${whereClause} AND ${operationLogs.username} ILIKE ${'%' + filters.username + '%'}`;
    }
    if (filters.module) {
      whereClause = sql`${whereClause} AND ${operationLogs.module} = ${filters.module}`;
    }
    if (filters.action) {
      whereClause = sql`${whereClause} AND ${operationLogs.action} ILIKE ${'%' + filters.action + '%'}`;
    }
    if (filters.status) {
      whereClause = sql`${whereClause} AND ${operationLogs.status} = ${filters.status}`;
    }
    if (filters.startTime) {
      whereClause = sql`${whereClause} AND ${operationLogs.createdAt} >= ${filters.startTime}`;
    }
    if (filters.endTime) {
      whereClause = sql`${whereClause} AND ${operationLogs.createdAt} <= ${filters.endTime}`;
    }

    const result = await db
      .delete(operationLogs)
      .where(whereClause)
      .returning();

    console.log(`[运营日志] 按条件删除日志: ${result.length} 条`);
    return result.length;
  }

  /**
   * 清空所有日志
   */
  async clearAll() {
    const db = await getDb();

    const result = await db
      .delete(operationLogs)
      .returning();

    console.log(`[运营日志] 清空所有日志: ${result.length} 条`);
    return result.length;
  }
}

module.exports = new OperationLogService();
