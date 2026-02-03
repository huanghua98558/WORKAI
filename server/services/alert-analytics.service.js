/**
 * 告警统计分析服务
 * 提供详细的告警统计、趋势分析和图表数据
 */

const db = require('../lib/database/db');

class AlertAnalyticsService {
  /**
   * 获取总体统计信息
   */
  async getOverallStats(startDate, endDate) {
    const query = `
      SELECT
        COUNT(*) as total_count,
        COUNT(DISTINCT CASE WHEN status = 'pending' THEN id END) as pending_count,
        COUNT(DISTINCT CASE WHEN status = 'handled' THEN id END) as handled_count,
        COUNT(DISTINCT CASE WHEN status = 'ignored' THEN id END) as ignored_count,
        COUNT(DISTINCT CASE WHEN status = 'sent' THEN id END) as sent_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'critical' THEN id END) as critical_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'warning' THEN id END) as warning_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'info' THEN id END) as info_count,
        COUNT(DISTINCT CASE WHEN escalation_count > 0 THEN id END) as escalated_count,
        AVG(escalation_count) as avg_escalation_count,
        MAX(escalation_count) as max_escalation_count,
        COUNT(DISTINCT group_id) as affected_groups,
        COUNT(DISTINCT user_id) as affected_users,
        COUNT(DISTINCT group_chat_id) as affected_chats,
        AVG(EXTRACT(EPOCH FROM (COALESCE(handled_at, CURRENT_TIMESTAMP) - created_at))) as avg_response_time_seconds
      FROM alert_history
      WHERE created_at >= COALESCE($1, CURRENT_DATE - INTERVAL '7 days')
        AND created_at <= COALESCE($2, CURRENT_TIMESTAMP)
    `;

    const result = await db.query(query, [startDate, endDate]);
    return result.rows[0];
  }

  /**
   * 获取时间趋势数据（按天）
   */
  async getDailyTrends(days = 30) {
    const query = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_count,
        COUNT(DISTINCT CASE WHEN status = 'pending' THEN id END) as pending_count,
        COUNT(DISTINCT CASE WHEN status = 'handled' THEN id END) as handled_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'critical' THEN id END) as critical_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'warning' THEN id END) as warning_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'info' THEN id END) as info_count,
        COUNT(DISTINCT CASE WHEN escalation_count > 0 THEN id END) as escalated_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(handled_at, CURRENT_TIMESTAMP) - created_at))) as avg_response_time_seconds
      FROM alert_history
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * 获取小时趋势数据（当天）
   */
  async getHourlyTrends(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const query = `
      SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as total_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'critical' THEN id END) as critical_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'warning' THEN id END) as warning_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'info' THEN id END) as info_count
      FROM alert_history
      WHERE DATE(created_at) = $1
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `;

    const result = await db.query(query, [targetDate]);
    return result.rows;
  }

  /**
   * 按分组统计
   */
  async getGroupStats(startDate, endDate) {
    const query = `
      SELECT
        g.id,
        g.group_name,
        g.group_code,
        g.group_color,
        COUNT(h.id) as total_count,
        COUNT(DISTINCT CASE WHEN h.status = 'pending' THEN h.id END) as pending_count,
        COUNT(DISTINCT CASE WHEN h.status = 'handled' THEN h.id END) as handled_count,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'critical' THEN h.id END) as critical_count,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'warning' THEN h.id END) as warning_count,
        COUNT(DISTINCT CASE WHEN h.alert_level = 'info' THEN h.id END) as info_count,
        COUNT(DISTINCT CASE WHEN h.escalation_count > 0 THEN h.id END) as escalated_count,
        AVG(h.escalation_count) as avg_escalation_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(h.handled_at, CURRENT_TIMESTAMP) - h.created_at))) as avg_response_time_seconds
      FROM alert_groups g
      LEFT JOIN alert_history h ON g.id = h.group_id
        AND h.created_at >= COALESCE($1, CURRENT_DATE - INTERVAL '7 days')
        AND h.created_at <= COALESCE($2, CURRENT_TIMESTAMP)
      GROUP BY g.id, g.group_name, g.group_code, g.group_color
      ORDER BY g.sort_order ASC, total_count DESC
    `;

    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * 按意图类型统计
   */
  async getIntentTypeStats(startDate, endDate) {
    const query = `
      SELECT
        intent_type,
        COUNT(*) as total_count,
        COUNT(DISTINCT CASE WHEN status = 'pending' THEN id END) as pending_count,
        COUNT(DISTINCT CASE WHEN status = 'handled' THEN id END) as handled_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'critical' THEN id END) as critical_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'warning' THEN id END) as warning_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'info' THEN id END) as info_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(handled_at, CURRENT_TIMESTAMP) - created_at))) as avg_response_time_seconds
      FROM alert_history
      WHERE created_at >= COALESCE($1, CURRENT_DATE - INTERVAL '7 days')
        AND created_at <= COALESCE($2, CURRENT_TIMESTAMP)
      GROUP BY intent_type
      ORDER BY total_count DESC
    `;

    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * 获取告警级别分布
   */
  async getAlertLevelDistribution(startDate, endDate) {
    const query = `
      SELECT
        alert_level,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM alert_history
      WHERE created_at >= COALESCE($1, CURRENT_DATE - INTERVAL '7 days')
        AND created_at <= COALESCE($2, CURRENT_TIMESTAMP)
      GROUP BY alert_level
      ORDER BY
        CASE alert_level
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'info' THEN 3
        END
    `;

    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * 获取处理时效分析
   */
  async getResponseTimeAnalysis(startDate, endDate) {
    const query = `
      SELECT
        alert_level,
        COUNT(*) as total_count,
        COUNT(handled_at) as handled_count,
        AVG(EXTRACT(EPOCH FROM (handled_at - created_at))) as avg_response_time_seconds,
        MIN(EXTRACT(EPOCH FROM (handled_at - created_at))) as min_response_time_seconds,
        MAX(EXTRACT(EPOCH FROM (handled_at - created_at))) as max_response_time_seconds,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (handled_at - created_at))) as median_response_time_seconds,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (handled_at - created_at))) as p95_response_time_seconds
      FROM alert_history
      WHERE created_at >= COALESCE($1, CURRENT_DATE - INTERVAL '7 days')
        AND created_at <= COALESCE($2, CURRENT_TIMESTAMP)
        AND handled_at IS NOT NULL
      GROUP BY alert_level
      ORDER BY
        CASE alert_level
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'info' THEN 3
        END
    `;

    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * 获取升级统计
   */
  async getEscalationStats(startDate, endDate) {
    const query = `
      SELECT
        escalation_count,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
        COUNT(DISTINCT CASE WHEN status = 'handled' THEN id END) as handled_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(handled_at, CURRENT_TIMESTAMP) - created_at))) as avg_response_time_seconds
      FROM alert_history
      WHERE created_at >= COALESCE($1, CURRENT_DATE - INTERVAL '7 days')
        AND created_at <= COALESCE($2, CURRENT_TIMESTAMP)
      GROUP BY escalation_count
      ORDER BY escalation_count ASC
    `;

    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * 获取用户告警排行（Top 10）
   */
  async getTopUsers(days = 7) {
    const query = `
      SELECT
        user_id,
        user_name,
        COUNT(*) as alert_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'critical' THEN id END) as critical_count,
        COUNT(DISTINCT CASE WHEN escalation_count > 0 THEN id END) as escalated_count
      FROM alert_history
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND user_id IS NOT NULL
      GROUP BY user_id, user_name
      ORDER BY alert_count DESC
      LIMIT 10
    `;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * 获取群组告警排行（Top 10）
   */
  async getTopChats(days = 7) {
    const query = `
      SELECT
        group_chat_id,
        group_name,
        COUNT(*) as alert_count,
        COUNT(DISTINCT CASE WHEN alert_level = 'critical' THEN id END) as critical_count,
        COUNT(DISTINCT CASE WHEN escalation_count > 0 THEN id END) as escalated_count,
        COUNT(DISTINCT user_id) as affected_users
      FROM alert_history
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND group_chat_id IS NOT NULL
      GROUP BY group_chat_id, group_name
      ORDER BY alert_count DESC
      LIMIT 10
    `;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * 获取机器学习统计数据（用于优化配置）
   */
  async getMLStats(days = 30) {
    const query = `
      SELECT
        intent_type,
        COUNT(*) as total_count,
        AVG(confidence) as avg_confidence,
        AVG(CASE WHEN need_human THEN 1 ELSE 0 END) as human_intervention_rate,
        AVG(CASE WHEN status = 'handled' THEN 1 ELSE 0 END) as auto_handle_rate,
        AVG(EXTRACT(EPOCH FROM (COALESCE(handled_at, CURRENT_TIMESTAMP) - created_at))) as avg_response_time_seconds
      FROM alert_history
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY intent_type
      ORDER BY total_count DESC
    `;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * 获取完整的分析报告
   */
  async getAnalyticsReport(days = 7) {
    const startDate = null;
    const endDate = null;

    const [
      overallStats,
      dailyTrends,
      groupStats,
      intentTypeStats,
      alertLevelDistribution,
      responseTimeAnalysis,
      escalationStats,
      topUsers,
      topChats
    ] = await Promise.all([
      this.getOverallStats(startDate, endDate),
      this.getDailyTrends(days),
      this.getGroupStats(startDate, endDate),
      this.getIntentTypeStats(startDate, endDate),
      this.getAlertLevelDistribution(startDate, endDate),
      this.getResponseTimeAnalysis(startDate, endDate),
      this.getEscalationStats(startDate, endDate),
      this.getTopUsers(days),
      this.getTopChats(days)
    ]);

    return {
      reportDate: new Date().toISOString(),
      dateRange: `${days} 天`,
      overall: overallStats,
      trends: {
        daily: dailyTrends
      },
      byGroup: groupStats,
      byIntentType: intentTypeStats,
      distribution: {
        alertLevel: alertLevelDistribution,
        escalation: escalationStats
      },
      performance: {
        responseTime: responseTimeAnalysis
      },
      rankings: {
        topUsers: topUsers,
        topChats: topChats
      }
    };
  }
}

module.exports = new AlertAnalyticsService();
