/**
 * 告警统计分析服务（简化版）
 * 提供详细的告警统计、趋势分析和图表数据
 */

const { getDb } = require('coze-coding-dev-sdk');
const { alertHistory, alertGroups } = require('../database/schema');
const { sql } = require('drizzle-orm');

class AlertAnalyticsService {
  /**
   * 获取总体统计信息
   */
  async getOverallStats(startDate, endDate) {
    const db = await getDb();

    const stats = await db
      .select({
        total_count: sql`count(*)`,
        pending_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'pending')`,
        handled_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'handled')`,
        ignored_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'ignored')`,
        sent_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'sent')`,
        critical_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'critical')`,
        warning_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'warning')`,
        info_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'info')`,
        escalated_count: sql`count(*) FILTER (WHERE ${alertHistory.escalationCount} > 0)`,
        avg_escalation_count: sql`AVG(${alertHistory.escalationCount})`,
        max_escalation_count: sql`MAX(${alertHistory.escalationCount})`,
        affected_groups: sql`COUNT(DISTINCT ${alertHistory.alertGroupId})`,
        affected_users: sql`COUNT(DISTINCT ${alertHistory.userId})`,
        affected_chats: sql`COUNT(DISTINCT ${alertHistory.groupChatId})`,
        avg_response_time_seconds: sql`AVG(EXTRACT(EPOCH FROM (COALESCE(${alertHistory.handledAt}, CURRENT_TIMESTAMP) - ${alertHistory.createdAt})))`,
      })
      .from(alertHistory)
      .where(
        sql`${alertHistory.createdAt} >= COALESCE(${startDate || sql`CURRENT_DATE - INTERVAL '7 days'`})
          AND ${alertHistory.createdAt} <= COALESCE(${endDate || sql`CURRENT_TIMESTAMP`})`
      );

    return stats[0] || {};
  }

  /**
   * 获取时间趋势数据（按天）
   */
  async getDailyTrends(days = 30) {
    const db = await getDb();

    const trends = await db
      .select({
        date: sql`DATE(${alertHistory.createdAt})`,
        total_count: sql`count(*)`,
        pending_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'pending')`,
        handled_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'handled')`,
        critical_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'critical')`,
        warning_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'warning')`,
        info_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'info')`,
        escalated_count: sql`count(*) FILTER (WHERE ${alertHistory.escalationCount} > 0)`,
        avg_response_time_seconds: sql`AVG(EXTRACT(EPOCH FROM (COALESCE(${alertHistory.handledAt}, CURRENT_TIMESTAMP) - ${alertHistory.createdAt})))`,
      })
      .from(alertHistory)
      .where(
        sql`${alertHistory.createdAt} >= CURRENT_DATE - (INTERVAL '1 day' * ${days})`
      )
      .groupBy(sql`DATE(${alertHistory.createdAt})`)
      .orderBy(sql`DATE(${alertHistory.createdAt}) ASC`);

    return trends.map(t => ({
      date: t.date?.toISOString().split('T')[0],
      total_count: parseInt(t.total_count),
      pending_count: parseInt(t.pending_count),
      handled_count: parseInt(t.handled_count),
      critical_count: parseInt(t.critical_count),
      warning_count: parseInt(t.warning_count),
      info_count: parseInt(t.info_count),
      escalated_count: parseInt(t.escalated_count),
      avg_response_time_seconds: parseFloat(t.avg_response_time_seconds) || 0,
    }));
  }

  /**
   * 按分组统计
   */
  async getGroupStats(startDate, endDate) {
    const db = await getDb();

    const stats = await db
      .select({
        id: alertGroups.id,
        group_name: alertGroups.groupName,
        group_code: alertGroups.groupCode,
        group_color: alertGroups.groupColor,
        total_count: sql`count(${alertHistory.id})`,
        pending_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'pending')`,
        handled_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'handled')`,
        critical_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'critical')`,
        warning_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'warning')`,
        info_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'info')`,
        escalated_count: sql`count(*) FILTER (WHERE ${alertHistory.escalationCount} > 0)`,
        avg_escalation_count: sql`AVG(${alertHistory.escalationCount})`,
        avg_response_time_seconds: sql`AVG(EXTRACT(EPOCH FROM (COALESCE(${alertHistory.handledAt}, CURRENT_TIMESTAMP) - ${alertHistory.createdAt})))`,
      })
      .from(alertGroups)
      .leftJoin(alertHistory, sql`${alertGroups.id}::text = ${alertHistory.alertGroupId}`)
      .where(
        sql`${alertHistory.createdAt} IS NULL OR (
          ${alertHistory.createdAt} >= COALESCE(${startDate || sql`CURRENT_DATE - INTERVAL '7 days'`})
          AND ${alertHistory.createdAt} <= COALESCE(${endDate || sql`CURRENT_TIMESTAMP`})
        )`
      )
      .groupBy(alertGroups.id, alertGroups.groupName, alertGroups.groupCode, alertGroups.groupColor)
      .orderBy(sql`${alertGroups.sortOrder} ASC, count(${alertHistory.id}) DESC`);

    return stats;
  }

  /**
   * 按意图类型统计
   */
  async getIntentTypeStats(startDate, endDate) {
    const db = await getDb();

    const stats = await db
      .select({
        intent_type: alertHistory.intentType,
        total_count: sql`count(*)`,
        pending_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'pending')`,
        handled_count: sql`count(*) FILTER (WHERE ${alertHistory.status} = 'handled')`,
        critical_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'critical')`,
        warning_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'warning')`,
        info_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'info')`,
        avg_response_time_seconds: sql`AVG(EXTRACT(EPOCH FROM (COALESCE(${alertHistory.handledAt}, CURRENT_TIMESTAMP) - ${alertHistory.createdAt})))`,
      })
      .from(alertHistory)
      .where(
        sql`${alertHistory.createdAt} >= COALESCE(${startDate || sql`CURRENT_DATE - INTERVAL '7 days'`})
          AND ${alertHistory.createdAt} <= COALESCE(${endDate || sql`CURRENT_TIMESTAMP`})`
      )
      .groupBy(alertHistory.intentType)
      .orderBy(sql`count(*) DESC`);

    return stats;
  }

  /**
   * 获取告警级别分布
   */
  async getAlertLevelDistribution(startDate, endDate) {
    const db = await getDb();

    const distribution = await db
      .select({
        alert_level: alertHistory.alertLevel,
        count: sql`count(*)`,
        percentage: sql`ROUND(count(*) * 100.0 / SUM(count(*)) OVER (), 2)`,
      })
      .from(alertHistory)
      .where(
        sql`${alertHistory.createdAt} >= COALESCE(${startDate || sql`CURRENT_DATE - INTERVAL '7 days'`})
          AND ${alertHistory.createdAt} <= COALESCE(${endDate || sql`CURRENT_TIMESTAMP`})`
      )
      .groupBy(alertHistory.alertLevel)
      .orderBy(
        sql`CASE ${alertHistory.alertLevel}
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'info' THEN 3
        END`
      );

    return distribution.map(d => ({
      alert_level: d.alert_level,
      count: parseInt(d.count),
      percentage: parseFloat(d.percentage) || 0,
    }));
  }

  /**
   * 获取用户告警排行（Top 10）
   */
  async getTopUsers(days = 7) {
    const db = await getDb();

    const topUsers = await db
      .select({
        user_id: alertHistory.userId,
        user_name: alertHistory.userName,
        alert_count: sql`count(*)`,
        critical_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'critical')`,
        escalated_count: sql`count(*) FILTER (WHERE ${alertHistory.escalationCount} > 0)`,
      })
      .from(alertHistory)
      .where(
        sql`${alertHistory.createdAt} >= CURRENT_DATE - (INTERVAL '1 day' * ${days})
          AND ${alertHistory.userId} IS NOT NULL`
      )
      .groupBy(alertHistory.userId, alertHistory.userName)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return topUsers.map(u => ({
      user_id: u.user_id,
      user_name: u.user_name,
      alert_count: parseInt(u.alert_count),
      critical_count: parseInt(u.critical_count),
      escalated_count: parseInt(u.escalated_count),
    }));
  }

  /**
   * 获取群组告警排行（Top 10）
   */
  async getTopChats(days = 7) {
    const db = await getDb();

    const topChats = await db
      .select({
        group_chat_id: alertHistory.groupChatId,
        group_name: alertHistory.groupName,
        alert_count: sql`count(*)`,
        critical_count: sql`count(*) FILTER (WHERE ${alertHistory.alertLevel} = 'critical')`,
        escalated_count: sql`count(*) FILTER (WHERE ${alertHistory.escalationCount} > 0)`,
        affected_users: sql`COUNT(DISTINCT ${alertHistory.userId})`,
      })
      .from(alertHistory)
      .where(
        sql`${alertHistory.createdAt} >= CURRENT_DATE - (INTERVAL '1 day' * ${days})
          AND ${alertHistory.groupChatId} IS NOT NULL`
      )
      .groupBy(alertHistory.groupChatId, alertHistory.groupName)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return topChats.map(c => ({
      group_chat_id: c.group_chat_id,
      group_name: c.group_name,
      alert_count: parseInt(c.alert_count),
      critical_count: parseInt(c.critical_count),
      escalated_count: parseInt(c.escalated_count),
      affected_users: parseInt(c.affected_users),
    }));
  }

  /**
   * 获取完整的分析报告
   */
  async getAnalyticsReport(days = 7) {
    const startDate = null;
    const endDate = null;

    const [
      overall,
      dailyTrends,
      groupStats,
      intentTypeStats,
      alertLevelDistribution,
      topUsers,
      topChats
    ] = await Promise.all([
      this.getOverallStats(startDate, endDate),
      this.getDailyTrends(days),
      this.getGroupStats(startDate, endDate),
      this.getIntentTypeStats(startDate, endDate),
      this.getAlertLevelDistribution(startDate, endDate),
      this.getTopUsers(days),
      this.getTopChats(days)
    ]);

    return {
      reportDate: new Date().toISOString(),
      dateRange: `${days} 天`,
      overall,
      trends: {
        daily: dailyTrends,
      },
      byGroup: groupStats,
      byIntentType: intentTypeStats,
      distribution: {
        alertLevel: alertLevelDistribution,
      },
      rankings: {
        topUsers,
        topChats,
      },
    };
  }
}

module.exports = new AlertAnalyticsService();
