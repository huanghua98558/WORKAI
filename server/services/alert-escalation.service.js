/**
 * 告警升级服务（简化版）
 * 管理告警的自动升级和手动升级逻辑
 */

const { getDb } = require('coze-coding-dev-sdk');
const { alertHistory, alertRules, alertGroups, alertUpgrades } = require('../database/schema');
const { sql } = require('drizzle-orm');
const alertNotificationService = require('./alert-notification.service');

class AlertEscalationService {
  /**
   * 检查并执行告警升级
   */
  async checkAndEscalate(alertId) {
    const db = await getDb();

    // 获取告警详情
    const alerts = await db
      .select()
      .from(alertHistory)
      .where(sql`${alertHistory.id} = ${alertId}`)
      .limit(1);

    if (alerts.length === 0) {
      throw new Error('告警不存在');
    }

    const alert = alerts[0];

    // 获取告警规则
    const rules = await db
      .select()
      .from(alertRules)
      .leftJoin(alertGroups, sql`${alertRules.groupId} = ${alertGroups.id}`)
      .where(
        sql`${alertRules.intentType} = ${alert.intentType} AND ${alertRules.isEnabled} = true`
      )
      .limit(1);

    const rule = rules[0] || {};

    if (!rule || !rule.alert_rules?.enableEscalation) {
      return { escalated: false, reason: '规则不存在或未启用升级' };
    }

    const ruleData = rule.alert_rules;

    // 检查升级条件
    const shouldEscalate = await this._shouldEscalate(alert, ruleData);

    if (!shouldEscalate) {
      return { escalated: false, reason: '未达到升级条件' };
    }

    // 计算新的升级级别
    const newLevel = (alert.escalationLevel || 0) + 1;

    // 执行升级
    return await this._executeEscalation(alert, newLevel, ruleData);
  }

  /**
   * 手动升级告警
   */
  async manualEscalate(alertId, newLevel, reason, escalatedBy) {
    const db = await getDb();

    const alerts = await db
      .select()
      .from(alertHistory)
      .where(sql`${alertHistory.id} = ${alertId}`)
      .limit(1);

    if (alerts.length === 0) {
      throw new Error('告警不存在');
    }

    const alert = alerts[0];

    return await this._executeEscalation(alert, newLevel, null, reason, escalatedBy);
  }

  /**
   * 获取告警升级历史
   */
  async getEscalationHistory(alertId) {
    const db = await getDb();

    const history = await db
      .select()
      .from(alertUpgrades)
      .where(sql`${alertUpgrades.alertId} = ${alertId}`)
      .orderBy(sql`${alertUpgrades.escalatedAt} ASC`);

    return history;
  }

  /**
   * 获取升级统计
   */
  async getEscalationStats(days = 30) {
    const db = await getDb();

    const stats = await db
      .select({
        stat_date: sql`DATE(${alertUpgrades.escalatedAt})`,
        total_escalations: sql`count(*)`,
        unique_alerts: sql`count(DISTINCT ${alertUpgrades.alertId})`,
        avg_level_increase: sql`AVG(${alertUpgrades.toLevel} - ${alertUpgrades.fromLevel})`,
        auto_escalations: sql`count(DISTINCT ${alertUpgrades.alertId}) FILTER (WHERE ${alertUpgrades.escalatedBy} = 'system')`,
        manual_escalations: sql`count(DISTINCT ${alertUpgrades.alertId}) FILTER (WHERE ${alertUpgrades.escalatedBy} != 'system')`,
      })
      .from(alertUpgrades)
      .where(
        sql`${alertUpgrades.escalatedAt} >= CURRENT_DATE - (INTERVAL '1 day' * ${days})`
      )
      .groupBy(sql`DATE(${alertUpgrades.escalatedAt})`)
      .orderBy(sql`DATE(${alertUpgrades.escalatedAt}) DESC`);

    return stats.map(s => ({
      date: s.stat_date?.toISOString().split('T')[0],
      total_escalations: parseInt(s.total_escalations),
      unique_alerts: parseInt(s.unique_alerts),
      avg_level_increase: parseFloat(s.avg_level_increase) || 0,
      auto_escalations: parseInt(s.auto_escalations),
      manual_escalations: parseInt(s.manual_escalations),
    }));
  }

  /**
   * 获取待升级告警列表
   */
  async getPendingEscalations() {
    const db = await getDb();

    const alerts = await db
      .select({
        id: alertHistory.id,
        sessionId: alertHistory.sessionId,
        alertRuleId: alertHistory.alertRuleId,
        intentType: alertHistory.intentType,
        alertLevel: alertHistory.alertLevel,
        groupId: alertHistory.groupId,
        groupName: alertHistory.groupName,
        alertGroupId: alertHistory.alertGroupId,
        userId: alertHistory.userId,
        userName: alertHistory.userName,
        groupChatId: alertHistory.groupChatId,
        messageContent: alertHistory.messageContent,
        alertMessage: alertHistory.alertMessage,
        notificationStatus: alertHistory.notificationStatus,
        notificationResult: alertHistory.notificationResult,
        status: alertHistory.status,
        isHandled: alertHistory.isHandled,
        handledBy: alertHistory.handledBy,
        handledAt: alertHistory.handledAt,
        handledNote: alertHistory.handledNote,
        escalationLevel: alertHistory.escalationLevel,
        escalationCount: alertHistory.escalationCount,
        escalationHistory: alertHistory.escalationHistory,
        parentAlertId: alertHistory.parentAlertId,
        batchId: alertHistory.batchId,
        batchSize: alertHistory.batchSize,
        robotId: alertHistory.robotId,
        assignee: alertHistory.assignee,
        confidence: alertHistory.confidence,
        needReply: alertHistory.needReply,
        needHuman: alertHistory.needHuman,
        createdAt: alertHistory.createdAt,
        escalation_threshold: alertRules.escalationThreshold,
        escalation_interval: alertRules.escalationInterval,
      })
      .from(alertHistory)
      .innerJoin(alertRules, sql`${alertHistory.intentType} = ${alertRules.intentType}`)
      .where(
        sql`${alertHistory.status} IN ('pending', 'sent')
          AND ${alertRules.isEnabled} = true
          AND ${alertRules.enableEscalation} = true
          AND (${alertHistory.escalationCount} < ${alertRules.escalationThreshold} OR ${alertRules.escalationThreshold} = 0)
          AND COALESCE(${alertHistory.handledAt}, ${alertHistory.createdAt}) < (CURRENT_TIMESTAMP - (${alertRules.escalationInterval} * INTERVAL '1 second'))`
      )
      .orderBy(sql`${alertHistory.createdAt} ASC`);

    return alerts;
  }

  // ========== 私有方法 ==========

  /**
   * 判断是否应该升级
   */
  async _shouldEscalate(alert, rule) {
    // 检查升级次数限制
    if (rule.escalationThreshold > 0 && alert.escalationCount >= rule.escalationThreshold) {
      return false;
    }

    // 检查升级间隔
    const lastEscalationTime = alert.updatedAt || alert.createdAt;
    const timeSinceLastEscalation = (new Date() - new Date(lastEscalationTime)) / 1000;

    if (timeSinceLastEscalation < rule.escalationInterval) {
      return false;
    }

    return true;
  }

  /**
   * 执行升级
   */
  async _executeEscalation(alert, newLevel, rule, reason, escalatedBy) {
    const db = await getDb();

    const currentLevel = alert.escalationLevel || 0;
    const escalatedByUser = escalatedBy || 'system';

    // 记录升级历史
    await db.insert(alertUpgrades).values({
      alertId: alert.id,
      fromLevel: currentLevel,
      toLevel: newLevel,
      escalateReason: reason || '自动升级',
      escalatedBy: escalatedByUser,
    });

    // 更新告警
    const escalationHistory = alert.escalationHistory || [];
    escalationHistory.push({
      level: newLevel,
      time: new Date().toISOString(),
      reason: reason || '自动升级',
      by: escalatedByUser,
    });

    await db
      .update(alertHistory)
      .set({
        escalationLevel: newLevel,
        escalationCount: alert.escalationCount + 1,
        escalationHistory,
        updatedAt: new Date(),
      })
      .where(sql`${alertHistory.id} = ${alert.id}`);

    return {
      escalated: true,
      fromLevel: currentLevel,
      toLevel: newLevel,
      reason: reason || '自动升级',
    };
  }
}

module.exports = new AlertEscalationService();
