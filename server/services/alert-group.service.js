/**
 * 告警分组服务
 * 管理告警分组的创建、更新、查询等功能
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

const { alertGroups, alertHistory, alertRules } = require('../database/schema');

class AlertGroupService {
  /**
   * 获取所有告警分组
   */
  async getAllGroups() {
    const query = `
      SELECT 
        g.*,
        COUNT(DISTINCT r.id) as rule_count,
        COUNT(DISTINCT h.id) as alert_count
      FROM alert_groups g
      LEFT JOIN alert_rules r ON g.id = r.group_id
      LEFT JOIN alert_history h ON g.id = h.group_id
      GROUP BY g.id
      ORDER BY g.sort_order ASC, g.id ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * 根据ID获取分组
   */
  async getGroupById(groupId) {
    const query = `
      SELECT 
        g.*,
        COUNT(DISTINCT r.id) as rule_count,
        COUNT(DISTINCT h.id) as alert_count
      FROM alert_groups g
      LEFT JOIN alert_rules r ON g.id = r.group_id
      LEFT JOIN alert_history h ON g.id = h.group_id
      WHERE g.id = $1
      GROUP BY g.id
    `;
    const result = await db.query(query, [groupId]);
    return result.rows[0];
  }

  /**
   * 根据分组代码获取分组
   */
  async getGroupByCode(groupCode) {
    const query = 'SELECT * FROM alert_groups WHERE group_code = $1';
    const result = await db.query(query, [groupCode]);
    return result.rows[0];
  }

  /**
   * 获取默认分组
   */
  async getDefaultGroup() {
    const query = 'SELECT * FROM alert_groups WHERE is_default = TRUE LIMIT 1';
    const result = await db.query(query);
    return result.rows[0];
  }

  /**
   * 创建分组
   */
  async createGroup(groupData) {
    const { groupName, groupCode, groupDescription, groupColor, sortOrder, isDefault } = groupData;

    const query = `
      INSERT INTO alert_groups (group_name, group_code, group_description, group_color, sort_order, is_default)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(query, [groupName, groupCode, groupDescription, groupColor || '#3B82F6', sortOrder || 0, isDefault || false]);
    return result.rows[0];
  }

  /**
   * 更新分组
   */
  async updateGroup(groupId, groupData) {
    const { groupName, groupDescription, groupColor, sortOrder, isDefault } = groupData;

    const query = `
      UPDATE alert_groups
      SET group_name = COALESCE($2, group_name),
          group_description = COALESCE($3, group_description),
          group_color = COALESCE($4, group_color),
          sort_order = COALESCE($5, sort_order),
          is_default = COALESCE($6, is_default),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [groupId, groupName, groupDescription, groupColor, sortOrder, isDefault]);
    return result.rows[0];
  }

  /**
   * 删除分组
   */
  async deleteGroup(groupId) {
    // 检查是否有关联的规则
    const rulesCheck = await db.query('SELECT COUNT(*) FROM alert_rules WHERE group_id = $1', [groupId]);
    if (parseInt(rulesCheck.rows[0].count) > 0) {
      throw new Error('该分组下存在告警规则，无法删除');
    }

    // 检查是否有关联的历史
    const historyCheck = await db.query('SELECT COUNT(*) FROM alert_history WHERE group_id = $1', [groupId]);
    if (parseInt(historyCheck.rows[0].count) > 0) {
      throw new Error('该分组下存在告警历史，无法删除');
    }

    const query = 'DELETE FROM alert_groups WHERE id = $1 RETURNING *';
    const result = await db.query(query, [groupId]);
    return result.rows[0];
  }

  /**
   * 获取分组统计信息
   */
  async getGroupStatistics(groupId) {
    const query = `
      SELECT 
        COUNT(DISTINCT h.id) as total_alerts,
        COUNT(DISTINCT CASE WHEN h.status = 'pending' THEN h.id END) as pending_alerts,
        COUNT(DISTINCT CASE WHEN h.status = 'handled' THEN h.id END) as handled_alerts,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'critical' THEN h.id END) as critical_alerts,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'warning' THEN h.id END) as warning_alerts,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'info' THEN h.id END) as info_alerts,
        COUNT(DISTINCT CASE WHEN h.escalation_count > 0 THEN h.id END) as escalated_alerts,
        AVG(EXTRACT(EPOCH FROM (h.handled_at - h.created_at))) as avg_handle_time_seconds
      FROM alert_groups g
      LEFT JOIN alert_history h ON g.id = h.group_id
      WHERE g.id = $1
      GROUP BY g.id
    `;
    const result = await db.query(query, [groupId]);
    return result.rows[0];
  }

  /**
   * 获取分组趋势数据（最近7天）
   */
  async getGroupTrends(groupId, days = 7) {
    const query = `
      SELECT 
        DATE(h.created_at) as stat_date,
        COUNT(*) as total_count,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'critical' THEN h.id END) as critical_count,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'warning' THEN h.id END) as warning_count,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'info' THEN h.id END) as info_count
      FROM alert_history h
      WHERE h.group_id = $1
        AND h.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(h.created_at)
      ORDER BY stat_date ASC
    `;
    const result = await db.query(query, [groupId]);
    return result.rows;
  }
}

module.exports = new AlertGroupService();
