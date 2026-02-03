/**
 * 告警分组服务
 * 管理告警分组的创建、更新、查询等功能
 */

const { getDb } = require('coze-coding-dev-sdk');
const { alertGroups, alertHistory, alertRules } = require('../database/schema');
const { sql } = require('drizzle-orm');

class AlertGroupService {
  /**
   * 获取所有告警分组
   */
  async getAllGroups() {
    const db = await getDb();

    const groups = await db
      .select({
        id: alertGroups.id,
        groupName: alertGroups.groupName,
        groupCode: alertGroups.groupCode,
        groupDescription: alertGroups.groupDescription,
        groupColor: alertGroups.groupColor,
        sortOrder: alertGroups.sortOrder,
        isDefault: alertGroups.isDefault,
        createdAt: alertGroups.createdAt,
        updatedAt: alertGroups.updatedAt,
      })
      .from(alertGroups)
      .orderBy(alertGroups.sortOrder, alertGroups.id);

    // 获取每个分组的统计信息
    const result = [];
    for (const group of groups) {
      const ruleCount = await db
        .select({ count: sql`count(*)` })
        .from(alertRules)
        .where(sql`${alertRules.groupId} = ${group.id}`);

      const alertCount = await db
        .select({ count: sql`count(*)` })
        .from(alertHistory)
        .where(sql`${alertHistory.alertGroupId} = ${group.id}`);

      result.push({
        ...group,
        rule_count: parseInt(ruleCount[0].count),
        alert_count: parseInt(alertCount[0].count),
      });
    }

    return result;
  }

  /**
   * 根据ID获取分组
   */
  async getGroupById(groupId) {
    const db = await getDb();

    const groups = await db
      .select()
      .from(alertGroups)
      .where(sql`${alertGroups.id} = ${groupId}`)
      .limit(1);

    if (groups.length === 0) return null;

    const group = groups[0];

    const ruleCount = await db
      .select({ count: sql`count(*)` })
      .from(alertRules)
      .where(sql`${alertRules.groupId} = ${group.id}`);

    const alertCount = await db
      .select({ count: sql`count(*)` })
      .from(alertHistory)
      .where(sql`${alertHistory.alertGroupId} = ${group.id}`);

    return {
      ...group,
      rule_count: parseInt(ruleCount[0].count),
      alert_count: parseInt(alertCount[0].count),
    };
  }

  /**
   * 根据分组代码获取分组
   */
  async getGroupByCode(groupCode) {
    const db = await getDb();

    const groups = await db
      .select()
      .from(alertGroups)
      .where(sql`${alertGroups.groupCode} = ${groupCode}`)
      .limit(1);

    return groups[0] || null;
  }

  /**
   * 获取默认分组
   */
  async getDefaultGroup() {
    const db = await getDb();

    const groups = await db
      .select()
      .from(alertGroups)
      .where(sql`${alertGroups.isDefault} = true`)
      .limit(1);

    return groups[0] || null;
  }

  /**
   * 创建分组
   */
  async createGroup(groupData) {
    const db = await getDb();

    const { groupName, groupCode, groupDescription, groupColor, sortOrder, isDefault } = groupData;

    const result = await db
      .insert(alertGroups)
      .values({
        groupName,
        groupCode,
        groupDescription,
        groupColor: groupColor || '#3B82F6',
        sortOrder: sortOrder || 0,
        isDefault: isDefault || false,
      })
      .returning();

    console.log(`[告警分组] 创建分组: ${groupName}`);
    return result[0];
  }

  /**
   * 更新分组
   */
  async updateGroup(groupId, groupData) {
    const db = await getDb();

    const { groupName, groupDescription, groupColor, sortOrder, isDefault } = groupData;

    const result = await db
      .update(alertGroups)
      .set({
        groupName,
        groupDescription,
        groupColor,
        sortOrder,
        isDefault,
        updatedAt: new Date(),
      })
      .where(sql`${alertGroups.id} = ${groupId}`)
      .returning();

    console.log(`[告警分组] 更新分组: ${groupId}`);
    return result[0];
  }

  /**
   * 删除分组
   */
  async deleteGroup(groupId) {
    const db = await getDb();

    // 检查是否有关联的规则
    const ruleCount = await db
      .select({ count: sql`count(*)` })
      .from(alertRules)
      .where(sql`${alertRules.groupId} = ${groupId}`);

    if (parseInt(ruleCount[0].count) > 0) {
      throw new Error('该分组下存在告警规则，无法删除');
    }

    // 检查是否有关联的历史
    const historyCount = await db
      .select({ count: sql`count(*)` })
      .from(alertHistory)
      .where(sql`${alertHistory.alertGroupId} = ${groupId}`);

    if (parseInt(historyCount[0].count) > 0) {
      throw new Error('该分组下存在告警历史，无法删除');
    }

    const result = await db
      .delete(alertGroups)
      .where(sql`${alertGroups.id} = ${groupId}`)
      .returning();

    console.log(`[告警分组] 删除分组: ${groupId}`);
    return result[0];
  }

  /**
   * 获取分组统计信息
   */
  async getGroupStatistics(groupId) {
    const db = await getDb();

    const stats = await db
      .select({
        total_alerts: sql`count(*)`,
        pending_alerts: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'pending')`,
        handled_alerts: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'handled')`,
        critical_alerts: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'critical')`,
        warning_alerts: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'warning')`,
        info_alerts: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'info')`,
        escalated_alerts: sql`count(*) FILTER (WHERE ${alertHistory.escalationCount} > 0)`,
        avg_handle_time_seconds: sql`avg(EXTRACT(EPOCH FROM (${alertHistory.handledAt} - ${alertHistory.createdAt})))`,
      })
      .from(alertHistory)
      .where(sql`${alertHistory.alertGroupId} = ${groupId}`);

    return stats[0] || {};
  }

  /**
   * 获取分组趋势数据（最近7天）
   */
  async getGroupTrends(groupId, days = 7) {
    const db = await getDb();

    const trends = await db
      .select({
        stat_date: sql`DATE(${alertHistory.createdAt})`,
        total_count: sql`count(*)`,
        critical_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'critical')`,
        warning_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'warning')`,
        info_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'info')`,
      })
      .from(alertHistory)
      .where(
        sql`${alertHistory.alertGroupId} = ${groupId} AND ${alertHistory.createdAt} >= CURRENT_DATE - INTERVAL '${days} days'`
      )
      .groupBy(sql`DATE(${alertHistory.createdAt})`)
      .orderBy(sql`DATE(${alertHistory.createdAt}) ASC`);

    return trends.map(t => ({
      date: t.stat_date?.toISOString().split('T')[0],
      total_count: parseInt(t.total_count),
      critical_count: parseInt(t.critical_count),
      warning_count: parseInt(t.warning_count),
      info_count: parseInt(t.info_count),
    }));
  }
}

module.exports = new AlertGroupService();
