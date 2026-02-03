/**
 * 告警批量处理服务
 * 支持批量处理告警，包括批量标记、批量删除、批量升级等
 */

const db = require('../lib/database/db');
const { v4: uuidv4 } = require('uuid');

class AlertBatchService {
  /**
   * 创建批量处理任务
   */
  async createBatchOperation(operationType, filterConditions, createdBy) {
    const query = `
      INSERT INTO alert_batch_operations (operation_type, filter_conditions, created_by, operation_status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `;
    const result = await db.query(query, [operationType, JSON.stringify(filterConditions), createdBy]);
    return result.rows[0];
  }

  /**
   * 批量标记已处理
   */
  async batchMarkHandled(filterConditions, handledBy, handledNote, batchId) {
    // 查询符合条件的告警
    const alerts = await this._findAlertsByFilter(filterConditions);

    // 更新批量操作记录
    await this._updateBatchOperation(batchId, alerts.length, 0, 0);

    const successCount = await this._batchUpdateAlerts(
      alerts,
      {
        status: 'handled',
        handled_by: handledBy,
        handled_at: new Date(),
        handled_note: handledNote,
        batch_id: batchId
      }
    );

    await this._completeBatchOperation(batchId, alerts.length, successCount, alerts.length - successCount);
    return { total: alerts.length, success: successCount, failed: alerts.length - successCount };
  }

  /**
   * 批量忽略告警
   */
  async batchIgnore(filterConditions, ignoredBy, ignoredNote, batchId) {
    const alerts = await this._findAlertsByFilter(filterConditions);
    await this._updateBatchOperation(batchId, alerts.length, 0, 0);

    const successCount = await this._batchUpdateAlerts(
      alerts,
      {
        status: 'ignored',
        handled_by: ignoredBy,
        handled_at: new Date(),
        handled_note: ignoredNote,
        batch_id: batchId
      }
    );

    await this._completeBatchOperation(batchId, alerts.length, successCount, alerts.length - successCount);
    return { total: alerts.length, success: successCount, failed: alerts.length - successCount };
  }

  /**
   * 批量删除告警
   */
  async batchDelete(filterConditions, batchId) {
    const alerts = await this._findAlertsByFilter(filterConditions);
    await this._updateBatchOperation(batchId, alerts.length, 0, 0);

    let successCount = 0;
    for (const alert of alerts) {
      try {
        await db.query('DELETE FROM alert_history WHERE id = $1', [alert.id]);
        successCount++;
      } catch (error) {
        console.error(`删除告警失败: ${alert.id}`, error);
      }
    }

    await this._completeBatchOperation(batchId, alerts.length, successCount, alerts.length - successCount);
    return { total: alerts.length, success: successCount, failed: alerts.length - successCount };
  }

  /**
   * 批量升级告警
   */
  async batchEscalate(filterConditions, escalationLevel, escalateReason, escalatedBy, batchId) {
    const alerts = await this._findAlertsByFilter(filterConditions);
    await this._updateBatchOperation(batchId, alerts.length, 0, 0);

    let successCount = 0;
    for (const alert of alerts) {
      try {
        // 记录升级历史
        await db.query(
          `INSERT INTO alert_upgrades (alert_id, from_level, to_level, escalate_reason, escalated_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [alert.id, alert.escalation_level || 0, escalationLevel, escalateReason, escalatedBy]
        );

        // 更新告警
        await db.query(
          `UPDATE alert_history
           SET escalation_level = $1,
               escalation_count = escalation_count + 1,
               batch_id = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [escalationLevel, batchId, alert.id]
        );

        successCount++;
      } catch (error) {
        console.error(`升级告警失败: ${alert.id}`, error);
      }
    }

    await this._completeBatchOperation(batchId, alerts.length, successCount, alerts.length - successCount);
    return { total: alerts.length, success: successCount, failed: alerts.length - successCount };
  }

  /**
   * 批量重新分配
   */
  async batchReassign(filterConditions, newAssignee, reassignedBy, batchId) {
    const alerts = await this._findAlertsByFilter(filterConditions);
    await this._updateBatchOperation(batchId, alerts.length, 0, 0);

    const successCount = await this._batchUpdateAlerts(
      alerts,
      {
        assignee: newAssignee,
        reassigned_by: reassignedBy,
        reassigned_at: new Date(),
        batch_id: batchId
      }
    );

    await this._completeBatchOperation(batchId, alerts.length, successCount, alerts.length - successCount);
    return { total: alerts.length, success: successCount, failed: alerts.length - successCount };
  }

  /**
   * 获取批量操作历史
   */
  async getBatchOperations(limit = 20, offset = 0) {
    const query = `
      SELECT 
        bao.*,
        COUNT(DISTINCT h.id) as affected_alerts
      FROM alert_batch_operations bao
      LEFT JOIN alert_history h ON h.batch_id = bao.id
      GROUP BY bao.id
      ORDER BY bao.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * 根据ID获取批量操作详情
   */
  async getBatchOperationById(operationId) {
    const query = 'SELECT * FROM alert_batch_operations WHERE id = $1';
    const result = await db.query(query, [operationId]);
    return result.rows[0];
  }

  /**
   * 获取批量操作影响的告警列表
   */
  async getBatchOperationAlerts(operationId) {
    const query = `
      SELECT h.*, 
             g.group_name,
             g.group_color
      FROM alert_history h
      LEFT JOIN alert_groups g ON h.group_id = g.id
      WHERE h.batch_id = $1
      ORDER BY h.created_at DESC
    `;
    const result = await db.query(query, [operationId]);
    return result.rows;
  }

  // ========== 私有方法 ==========

  /**
   * 根据过滤条件查找告警
   */
  async _findAlertsByFilter(filterConditions) {
    let query = 'SELECT * FROM alert_history WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filterConditions.groupId) {
      query += ` AND group_id = $${paramIndex}`;
      params.push(filterConditions.groupId);
      paramIndex++;
    }

    if (filterConditions.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filterConditions.status);
      paramIndex++;
    }

    if (filterConditions.alertLevel) {
      query += ` AND alert_level = $${paramIndex}`;
      params.push(filterConditions.alertLevel);
      paramIndex++;
    }

    if (filterConditions.startTime) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(filterConditions.startTime);
      paramIndex++;
    }

    if (filterConditions.endTime) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(filterConditions.endTime);
      paramIndex++;
    }

    if (filterConditions.alertIds && filterConditions.alertIds.length > 0) {
      query += ` AND id = ANY($${paramIndex})`;
      params.push(filterConditions.alertIds);
      paramIndex++;
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * 批量更新告警
   */
  async _batchUpdateAlerts(alerts, updateData) {
    let successCount = 0;
    for (const alert of alerts) {
      try {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updateData)) {
          const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setClauses.push(`${columnName} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }

        const query = `
          UPDATE alert_history
          SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramIndex}
        `;
        values.push(alert.id);

        await db.query(query, values);
        successCount++;
      } catch (error) {
        console.error(`更新告警失败: ${alert.id}`, error);
      }
    }
    return successCount;
  }

  /**
   * 更新批量操作记录
   */
  async _updateBatchOperation(batchId, totalCount, successCount, failedCount) {
    const query = `
      UPDATE alert_batch_operations
      SET total_count = $2,
          success_count = $3,
          failed_count = $4,
          operation_status = 'processing'
      WHERE id = $1
    `;
    await db.query(query, [batchId, totalCount, successCount, failedCount]);
  }

  /**
   * 完成批量操作
   */
  async _completeBatchOperation(batchId, totalCount, successCount, failedCount) {
    const operationResult = {
      total: totalCount,
      success: successCount,
      failed: failedCount,
      completedAt: new Date().toISOString()
    };

    const query = `
      UPDATE alert_batch_operations
      SET total_count = $2,
          success_count = $3,
          failed_count = $4,
          operation_result = $5,
          operation_status = 'completed',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await db.query(query, [batchId, totalCount, successCount, failedCount, JSON.stringify(operationResult)]);
  }
}

module.exports = new AlertBatchService();
