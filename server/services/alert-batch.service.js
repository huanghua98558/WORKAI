/**
 * 告警批量处理服务（简化版）
 * 支持批量处理告警，包括批量标记、批量删除、批量升级等
 */

const { getDb } = require('coze-coding-dev-sdk');
const { alertHistory, alertBatchOperations } = require('../database/schema');
const { sql } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');

class AlertBatchService {
  /**
   * 创建批量处理任务
   */
  async createBatchOperation(operationType, filterConditions, createdBy) {
    const db = await getDb();

    const result = await db
      .insert(alertBatchOperations)
      .values({
        operationType,
        filterConditions,
        createdBy,
        operationStatus: 'pending',
      })
      .returning();

    return result[0];
  }

  /**
   * 批量标记已处理
   */
  async batchMarkHandled(filterConditions, handledBy, handledNote, batchId) {
    const db = await getDb();

    // 查询符合条件的告警
    const alerts = await this._findAlertsByFilter(filterConditions);

    // 更新批量操作记录
    await db
      .update(alertBatchOperations)
      .set({
        totalCount: alerts.length,
        operationStatus: 'processing',
      })
      .where(sql`${alertBatchOperations.id} = ${batchId}`);

    // 批量更新
    if (alerts.length > 0) {
      const alertIds = alerts.map(a => a.id);
      await db
        .update(alertHistory)
        .set({
          status: 'handled',
          handledBy,
          handledAt: new Date(),
          handledNote,
          batchId,
        })
        .where(sql`${alertHistory.id} = ANY(${alertIds})`);
    }

    // 完成批量操作
    await db
      .update(alertBatchOperations)
      .set({
        successCount: alerts.length,
        failedCount: 0,
        operationResult: JSON.stringify({
          total: alerts.length,
          success: alerts.length,
          failed: 0,
        }),
        operationStatus: 'completed',
        completedAt: new Date(),
      })
      .where(sql`${alertBatchOperations.id} = ${batchId}`);

    return { total: alerts.length, success: alerts.length, failed: 0 };
  }

  /**
   * 批量忽略
   */
  async batchIgnore(filterConditions, ignoredBy, ignoredNote, batchId) {
    const db = await getDb();

    const alerts = await this._findAlertsByFilter(filterConditions);

    await db
      .update(alertBatchOperations)
      .set({
        totalCount: alerts.length,
        operationStatus: 'processing',
      })
      .where(sql`${alertBatchOperations.id} = ${batchId}`);

    if (alerts.length > 0) {
      const alertIds = alerts.map(a => a.id);
      await db
        .update(alertHistory)
        .set({
          status: 'ignored',
          handledBy: ignoredBy,
          handledAt: new Date(),
          handledNote: ignoredNote,
          batchId,
        })
        .where(sql`${alertHistory.id} = ANY(${alertIds})`);
    }

    await db
      .update(alertBatchOperations)
      .set({
        successCount: alerts.length,
        failedCount: 0,
        operationResult: JSON.stringify({
          total: alerts.length,
          success: alerts.length,
          failed: 0,
        }),
        operationStatus: 'completed',
        completedAt: new Date(),
      })
      .where(sql`${alertBatchOperations.id} = ${batchId}`);

    return { total: alerts.length, success: alerts.length, failed: 0 };
  }

  /**
   * 获取批量操作历史
   */
  async getBatchOperations(limit = 20, offset = 0) {
    const db = await getDb();

    const operations = await db
      .select()
      .from(alertBatchOperations)
      .orderBy(sql`${alertBatchOperations.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return operations;
  }

  /**
   * 根据ID获取批量操作详情
   */
  async getBatchOperationById(operationId) {
    const db = await getDb();

    const operations = await db
      .select()
      .from(alertBatchOperations)
      .where(sql`${alertBatchOperations.id} = ${operationId}`)
      .limit(1);

    return operations[0] || null;
  }

  /**
   * 获取批量操作影响的告警列表
   */
  async getBatchOperationAlerts(operationId) {
    const db = await getDb();

    const alerts = await db
      .select()
      .from(alertHistory)
      .where(sql`${alertHistory.batchId} = ${operationId}`)
      .orderBy(sql`${alertHistory.createdAt} DESC`);

    return alerts;
  }

  // ========== 私有方法 ==========

  /**
   * 根据过滤条件查找告警
   */
  async _findAlertsByFilter(filterConditions) {
    const db = await getDb();

    let query = db.select().from(alertHistory);
    const conditions = [];

    if (filterConditions.groupId) {
      conditions.push(sql`${alertHistory.alertGroupId} = ${filterConditions.groupId}`);
    }

    if (filterConditions.status) {
      conditions.push(sql`${alertHistory.status} = ${filterConditions.status}`);
    }

    if (filterConditions.alertLevel) {
      conditions.push(sql`${alertHistory.alertLevel} = ${filterConditions.alertLevel}`);
    }

    if (filterConditions.startTime) {
      conditions.push(sql`${alertHistory.createdAt} >= ${filterConditions.startTime}`);
    }

    if (filterConditions.endTime) {
      conditions.push(sql`${alertHistory.createdAt} <= ${filterConditions.endTime}`);
    }

    if (filterConditions.alertIds && filterConditions.alertIds.length > 0) {
      conditions.push(sql`${alertHistory.id} = ANY(${filterConditions.alertIds})`);
    }

    if (conditions.length > 0) {
      query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
    }

    return await query;
  }
}

module.exports = new AlertBatchService();
