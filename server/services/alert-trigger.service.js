/**
 * 告警触发服务
 * 负责检测、触发告警并通知负责人
 */

const { getDb } = require('coze-coding-dev-sdk');
const { alertHistory } = require('../database/schema');
const { sql } = require('drizzle-orm');
const alertConfigService = require('./alert-config.service');
const alertNotificationService = require('./alert-notification.service');

class AlertTriggerService {
  constructor() {
    // 缓存冷却时间，避免频繁查询数据库
    this.alertCooldowns = new Map();
  }

  /**
   * 检查是否应该触发告警
   */
  async shouldTriggerAlert(intentType, sessionId, userId) {
    const rule = await alertConfigService.getAlertRuleByIntent(intentType);

    if (!rule || !rule.isEnabled) {
      console.log(`[告警触发] 意图 ${intentType} 没有配置告警规则或未启用`);
      return { shouldTrigger: false, rule: null };
    }

    // 检查冷却时间
    const cooldownKey = `${intentType}_${sessionId}_${userId}`;
    const lastAlertTime = this.alertCooldowns.get(cooldownKey);

    if (lastAlertTime) {
      const elapsed = Date.now() - lastAlertTime;
      const cooldownPeriod = rule.cooldownPeriod * 1000; // 转换为毫秒

      if (elapsed < cooldownPeriod) {
        console.log(`[告警触发] 意图 ${intentType} 在冷却期内，剩余 ${Math.ceil((cooldownPeriod - elapsed) / 1000)} 秒`);
        return { shouldTrigger: false, rule, reason: 'cooldown' };
      }
    }

    return { shouldTrigger: true, rule };
  }

  /**
   * 触发告警
   */
  async triggerAlert(context) {
    const {
      sessionId,
      intentType,
      intent,
      userId,
      userName,
      groupId,
      groupName,
      messageContent,
      robotId,
      robotName,
    } = context;

    try {
      // 检查是否应该触发告警
      const { shouldTrigger, rule } = await this.shouldTriggerAlert(intentType, sessionId, userId);

      if (!shouldTrigger || !rule) {
        return null;
      }

      // 更新冷却时间
      const cooldownKey = `${intentType}_${sessionId}_${userId}`;
      this.alertCooldowns.set(cooldownKey, Date.now());

      // 生成告警消息
      const alertMessage = this.generateAlertMessage(rule, context);

      // 保存告警历史
      const db = await getDb();
      const alertRecord = await db
        .insert(alertHistory)
        .values({
          sessionId,
          alertRuleId: rule.id,
          intentType,
          alertLevel: rule.alertLevel,
          userId,
          userName,
          groupId,
          groupName,
          messageContent,
          alertMessage,
          notificationStatus: 'pending',
          createdAt: new Date(),
        })
        .returning();

      console.log(`[告警触发] 告警已触发: ${intentType} - ${alertLevelToText(rule.alertLevel)}`);

      // 获取通知方式
      const notificationMethods = await alertConfigService.getNotificationMethods(rule.id);

      // 异步发送通知（不阻塞主流程）
      if (notificationMethods && notificationMethods.length > 0) {
        this.sendNotifications(alertRecord[0].id, alertMessage, notificationMethods, context)
          .catch((error) => {
            console.error(`[告警触发] 发送通知失败:`, error);
          });
      }

      return alertRecord[0];
    } catch (error) {
      console.error(`[告警触发] 触发告警失败:`, error);
      return null;
    }
  }

  /**
   * 生成告警消息
   */
  generateAlertMessage(rule, context) {
    let message = rule.messageTemplate || '检测到告警';

    // 替换模板变量
    const variables = {
      '{userName}': context.userName || '未知用户',
      '{groupName}': context.groupName || '未知群组',
      '{messageContent}': context.messageContent || '',
      '{intent}': context.intent || context.intentType,
      '{intentType}': context.intentType,
      '{alertLevel}': alertLevelToText(rule.alertLevel),
      '{timestamp}': new Date().toLocaleString('zh-CN'),
    };

    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(key, 'g'), value);
    }

    return message;
  }

  /**
   * 异步发送通知
   */
  async sendNotifications(alertId, alertMessage, notificationMethods, context) {
    const results = [];

    for (const method of notificationMethods) {
      try {
        const result = await alertNotificationService.sendNotification(
          method.methodType,
          alertMessage,
          method.recipientConfig,
          context
        );

        results.push({
          method: method.methodType,
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        console.error(`[告警触发] 发送通知失败 (${method.methodType}):`, error);
        results.push({
          method: method.methodType,
          success: false,
          message: error.message,
        });
      }
    }

    // 更新告警记录的通知状态
    await this.updateAlertNotificationStatus(alertId, results);
  }

  /**
   * 更新告警的通知状态
   */
  async updateAlertNotificationStatus(alertId, results) {
    const db = await getDb();

    const hasSuccess = results.some(r => r.success);

    await db
      .update(alertHistory)
      .set({
        notificationStatus: hasSuccess ? 'sent' : 'failed',
        notificationResult: results,
      })
      .where(sql`${alertHistory.id} = ${alertId}`);

    console.log(`[告警触发] 更新通知状态: ${alertId} - ${hasSuccess ? 'sent' : 'failed'}`);
  }

  /**
   * 获取最近的告警历史
   */
  async getRecentAlerts(limit = 50) {
    const db = await getDb();

    const alerts = await db
      .select()
      .from(alertHistory)
      .orderBy(sql`${alertHistory.createdAt} DESC`)
      .limit(limit);

    return alerts;
  }

  /**
   * 标记告警为已处理
   */
  async markAlertAsHandled(alertId, handledBy) {
    const db = await getDb();

    const result = await db
      .update(alertHistory)
      .set({
        isHandled: true,
        handledBy,
        handledAt: new Date(),
      })
      .where(sql`${alertHistory.id} = ${alertId}`)
      .returning();

    console.log(`[告警触发] 标记告警为已处理: ${alertId} by ${handledBy}`);
    return result[0];
  }

  /**
   * 获取告警统计
   */
  async getAlertStats(timeRange = '7d') {
    const db = await getDb();

    const timeConditions = {
      '24h': sql`${alertHistory.createdAt} > NOW() - INTERVAL '24 hours'`,
      '7d': sql`${alertHistory.createdAt} > NOW() - INTERVAL '7 days'`,
      '30d': sql`${alertHistory.createdAt} > NOW() - INTERVAL '30 days'`,
    };

    const condition = timeConditions[timeRange] || timeConditions['7d'];

    const stats = await db
      .select({
        total: sql`COUNT(*)`,
        critical: sql`COUNT(*) FILTER (WHERE alert_level = 'critical')`,
        warning: sql`COUNT(*) FILTER (WHERE alert_level = 'warning')`,
        info: sql`COUNT(*) FILTER (WHERE alert_level = 'info')`,
        handled: sql`COUNT(*) FILTER (WHERE is_handled = true)`,
        unhandled: sql`COUNT(*) FILTER (WHERE is_handled = false)`,
        pending: sql`COUNT(*) FILTER (WHERE notification_status = 'pending')`,
        sent: sql`COUNT(*) FILTER (WHERE notification_status = 'sent')`,
        failed: sql`COUNT(*) FILTER (WHERE notification_status = 'failed')`,
      })
      .from(alertHistory)
      .where(condition);

    return stats[0];
  }
}

/**
 * 告警级别转换为文本
 */
function alertLevelToText(level) {
  const levelMap = {
    'critical': '严重',
    'warning': '警告',
    'info': '信息',
  };
  return levelMap[level] || level;
}

module.exports = new AlertTriggerService();
