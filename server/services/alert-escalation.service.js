/**
 * 告警升级服务
 * 管理告警的自动升级和手动升级逻辑
 */

const db = require('../lib/database/db');
const alertNotificationService = require('./alert-notification.service');

class AlertEscalationService {
  /**
   * 检查并执行告警升级
   */
  async checkAndEscalate(alertId) {
    // 获取告警详情
    const alertQuery = 'SELECT * FROM alert_history WHERE id = $1';
    const alertResult = await db.query(alertQuery, [alertId]);
    const alert = alertResult.rows[0];

    if (!alert) {
      throw new Error('告警不存在');
    }

    // 获取告警规则
    const ruleQuery = `
      SELECT r.*, g.group_name, g.group_code
      FROM alert_rules r
      LEFT JOIN alert_groups g ON r.group_id = g.id
      WHERE r.intent_type = $1 AND r.is_enabled = TRUE
    `;
    const ruleResult = await db.query(ruleQuery, [alert.intent_type]);
    const rule = ruleResult.rows[0];

    if (!rule || !rule.enable_escalation) {
      return { escalated: false, reason: '规则不存在或未启用升级' };
    }

    // 检查升级条件
    const shouldEscalate = await this._shouldEscalate(alert, rule);

    if (!shouldEscalate) {
      return { escalated: false, reason: '未达到升级条件' };
    }

    // 计算新的升级级别
    const newLevel = (alert.escalation_level || 0) + 1;

    // 执行升级
    return await this._executeEscalation(alert, newLevel, rule);
  }

  /**
   * 手动升级告警
   */
  async manualEscalate(alertId, newLevel, reason, escalatedBy) {
    // 获取告警详情
    const alertQuery = 'SELECT * FROM alert_history WHERE id = $1';
    const alertResult = await db.query(alertQuery, [alertId]);
    const alert = alertResult.rows[0];

    if (!alert) {
      throw new Error('告警不存在');
    }

    // 执行升级
    return await this._executeEscalation(alert, newLevel, null, reason, escalatedBy);
  }

  /**
   * 获取告警升级历史
   */
  async getEscalationHistory(alertId) {
    const query = `
      SELECT * FROM alert_upgrades
      WHERE alert_id = $1
      ORDER BY escalated_at ASC
    `;
    const result = await db.query(query, [alertId]);
    return result.rows;
  }

  /**
   * 获取升级统计
   */
  async getEscalationStats(days = 30) {
    const query = `
      SELECT 
        DATE(au.escalated_at) as stat_date,
        COUNT(*) as total_escalations,
        COUNT(DISTINCT au.alert_id) as unique_alerts,
        AVG(au.to_level - au.from_level) as avg_level_increase,
        COUNT(DISTINCT CASE WHEN au.escalated_by = 'system' THEN au.alert_id END) as auto_escalations,
        COUNT(DISTINCT CASE WHEN au.escalated_by != 'system' THEN au.alert_id END) as manual_escalations
      FROM alert_upgrades au
      WHERE au.escalated_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(au.escalated_at)
      ORDER BY stat_date DESC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * 获取待升级告警列表
   */
  async getPendingEscalations() {
    const query = `
      SELECT 
        h.*,
        r.escalation_threshold,
        r.escalation_interval,
        g.group_name,
        g.group_code
      FROM alert_history h
      INNER JOIN alert_rules r ON h.intent_type = r.intent_type
      LEFT JOIN alert_groups g ON r.group_id = g.id
      WHERE h.status IN ('pending', 'sent')
        AND r.is_enabled = TRUE
        AND r.enable_escalation = TRUE
        AND (h.escalation_count < r.escalation_threshold OR r.escalation_threshold = 0)
        AND (h.created_at + (r.escalation_interval * INTERVAL '1 second') < CURRENT_TIMESTAMP)
      ORDER BY h.created_at ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * 批量检查并升级告警（定时任务）
   */
  async batchCheckEscalations() {
    const pendingAlerts = await this.getPendingEscalations();
    const results = {
      total: pendingAlerts.length,
      escalated: 0,
      failed: 0
    };

    for (const alert of pendingAlerts) {
      try {
        const result = await this.checkAndEscalate(alert.id);
        if (result.escalated) {
          results.escalated++;
        }
      } catch (error) {
        console.error(`检查告警升级失败: ${alert.id}`, error);
        results.failed++;
      }
    }

    return results;
  }

  // ========== 私有方法 ==========

  /**
   * 判断是否应该升级
   */
  async _shouldEscalate(alert, rule) {
    // 检查升级次数限制
    if (rule.escalation_threshold > 0 && alert.escalation_count >= rule.escalation_threshold) {
      return false;
    }

    // 检查升级间隔
    const lastEscalationTime = alert.updated_at || alert.created_at;
    const timeSinceLastEscalation = (new Date() - new Date(lastEscalationTime)) / 1000;

    if (timeSinceLastEscalation < rule.escalation_interval) {
      return false;
    }

    return true;
  }

  /**
   * 执行升级
   */
  async _executeEscalation(alert, newLevel, rule, reason, escalatedBy) {
    const currentLevel = alert.escalation_level || 0;
    const escalatedByUser = escalatedBy || 'system';

    // 解析升级配置
    let escalateConfig = {};
    if (rule && rule.escalation_config) {
      try {
        escalateConfig = typeof rule.escalation_config === 'string'
          ? JSON.parse(rule.escalation_config)
          : rule.escalation_config;
      } catch (error) {
        console.error('解析升级配置失败:', error);
      }
    }

    // 记录升级历史
    await db.query(
      `INSERT INTO alert_upgrades (alert_id, from_level, to_level, escalate_reason, escalated_by, escalate_config)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [alert.id, currentLevel, newLevel, reason || '自动升级', escalatedByUser, JSON.stringify(escalateConfig)]
    );

    // 更新告警
    const escalationHistory = alert.escalation_history || [];
    escalationHistory.push({
      level: newLevel,
      time: new Date().toISOString(),
      reason: reason || '自动升级',
      by: escalatedByUser
    });

    await db.query(
      `UPDATE alert_history
       SET escalation_level = $1,
           escalation_count = escalation_count + 1,
           escalation_history = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newLevel, JSON.stringify(escalationHistory), alert.id]
    );

    // 根据升级级别调整告警级别
    let newAlertLevel = alert.alert_level;
    if (escalateConfig.levelMapping && escalateConfig.levelMapping[newLevel]) {
      newAlertLevel = escalateConfig.levelMapping[newLevel];
    } else {
      // 默认升级逻辑
      if (newLevel === 1 && newAlertLevel === 'info') {
        newAlertLevel = 'warning';
      } else if (newLevel >= 2) {
        newAlertLevel = 'critical';
      }
    }

    if (newAlertLevel !== alert.alert_level) {
      await db.query(
        `UPDATE alert_history SET alert_level = $1 WHERE id = $2`,
        [newAlertLevel, alert.id]
      );
    }

    // 发送升级通知
    try {
      const escalateMethod = escalateConfig.method || 'robot';
      const escalateRecipients = escalateConfig.recipients || [];

      if (escalateMethod && escalateRecipients.length > 0) {
        await alertNotificationService.sendEscalationNotification(
          alert,
          currentLevel,
          newLevel,
          escalateMethod,
          escalateRecipients,
          reason || '告警自动升级'
        );
      }
    } catch (error) {
      console.error('发送升级通知失败:', error);
    }

    return {
      escalated: true,
      fromLevel: currentLevel,
      toLevel: newLevel,
      newAlertLevel,
      reason: reason || '自动升级'
    };
  }
}

module.exports = new AlertEscalationService();
