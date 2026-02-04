/**
 * 告警触发增强服务
 * 负责触发告警、处理通知分发
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { alertHistory, alertRecipients, alertNotifications, alertRules } = require('../database/schema');
const { eq, and, sql as drizzleSql } = require('drizzle-orm');
const alertDedupService = require('./alert-dedup.service');
const alertRateLimiter = require('./alert-rate-limiter.service');
const robotCommandService = require('./robot-command.service');
const logger = require('./system-logger.service');

class AlertTriggerEnhancedService {
  constructor() {
    this.wsClients = new Map(); // WebSocket客户端
  }

  /**
   * 触发告警
   * @param {Object} alertData - 告警数据
   */
  async triggerAlert(alertData) {
    const {
      ruleId,
      ruleName,
      type,
      level,
      robotId,
      robotName,
      description,
      triggerTime,
      metadata = {}
    } = alertData;

    console.log(`[AlertTrigger] 触发告警: ${type} (${level})`);

    try {
      // 1. 生成告警记录
      const alertId = this.generateId();
      const now = new Date();

      const db = await getDb();

      const [alert] = await db.insert(alertHistory)
        .values({
          id: alertId,
          alertRuleId: ruleId,
          intentType: type,
          alertLevel: level,
          robotId: robotId,
          alertMessage: description,
          notificationStatus: 'pending',
          status: 'pending',
          createdAt: now
        })
        .returning();

      console.log(`[AlertTrigger] 告警记录已创建: ${alertId}`);

      // 2. 查找接收者
      const recipients = await this.getRecipients(robotId, level);

      if (recipients.length === 0) {
        console.log(`[AlertTrigger] 没有找到接收者 (robotId=${robotId}, level=${level})`);
        return { success: false, message: '没有找到接收者', alertId };
      }

      console.log(`[AlertTrigger] 找到 ${recipients.length} 个接收者`);

      // 3. 处理每个接收者
      const results = [];
      for (const recipient of recipients) {
        try {
          const result = await this.sendToRecipient(alert, recipient, ruleId);
          results.push(result);
        } catch (error) {
          console.error(`[AlertTrigger] 发送给接收者失败 (recipientId=${recipient.id}):`, error);
          results.push({
            recipientId: recipient.id,
            recipientName: recipient.name,
            success: false,
            error: error.message
          });
        }
      }

      // 4. 推送到WebSocket客户端
      this.broadcastToWebSocket({
        type: 'alert',
        data: {
          alertId,
          type,
          level,
          robotName,
          description,
          triggerTime,
          recipientCount: recipients.length
        }
      });

      const successCount = results.filter(r => r.success).length;

      return {
        success: true,
        message: `告警已发送给 ${successCount}/${recipients.length} 个接收者`,
        alertId,
        results
      };
    } catch (error) {
      console.error('[AlertTrigger] 触发告警失败:', error);
      logger.error('AlertTrigger', '触发告警失败', {
        alertType: type,
        alertLevel: level,
        error: error.message
      });
      return { success: false, message: error.message };
    }
  }

  /**
   * 查找接收者
   */
  async getRecipients(robotId, alertLevel) {
    const db = await getDb();

    const recipients = await db.select()
      .from(alertRecipients)
      .where(
        and(
          eq(alertRecipients.enabled, true),
          drizzleSql`${alertRecipients.robot_ids}::jsonb ? ${robotId}`,
          drizzleSql`${alertRecipients.alert_levels}::jsonb ? ${alertLevel}`
        )
      );

    return recipients;
  }

  /**
   * 发送告警给接收者
   */
  async sendToRecipient(alert, recipient, ruleId) {
    const { id: alertId, robotId, alertLevel, alertMessage } = alert;
    const { id: recipientId, name, nickname, robotIds } = recipient;

    try {
      // 1. 检查去重
      const { isDuplicate } = await alertDedupService.checkDuplicate(
        ruleId,
        robotId,
        recipientId,
        alert.intentType
      );

      if (isDuplicate) {
        console.log(`[AlertTrigger] 跳过重复告警: recipient=${name}`);
        return {
          recipientId,
          recipientName: name,
          success: false,
          reason: 'duplicate',
          message: '重复告警，已跳过'
        };
      }

      // 2. 检查限流
      const { allowed, reason } = await alertRateLimiter.checkLimit(
        recipientId,
        ruleId,
        alertLevel
      );

      if (!allowed) {
        console.log(`[AlertTrigger] 跳过限流告警: recipient=${name}, reason=${reason}`);
        return {
          recipientId,
          recipientName: name,
          success: false,
          reason,
          message: '达到限流阈值，已跳过'
        };
      }

      // 3. 构建告警消息
      const message = this.buildAlertMessage(alert);

      // 4. 发送通知
      const command = await robotCommandService.createCommand({
        robotId,
        commandType: 'send_private_message',
        commandPayload: {
          list: [
            {
              type: 203,
              titleList: [nickname],
              receivedContent: message
            }
          ]
        },
        priority: alertLevel === 'critical' ? 10 : 5,
        maxRetries: 3
      });

      // 5. 记录通知
      await this.recordNotification({
        alertId,
        recipientId,
        ruleId,
        commandId: command.id,
        notificationMethod: 'web',
        status: 'sent',
        sentAt: new Date()
      });

      // 6. 记录去重
      await alertDedupService.recordTrigger(
        ruleId,
        robotId,
        recipientId,
        alert.intentType
      );

      console.log(`[AlertTrigger] 通知已发送: recipient=${name}, commandId=${command.id}`);

      return {
        recipientId,
        recipientName: name,
        success: true,
        commandId: command.id
      };
    } catch (error) {
      console.error(`[AlertTrigger] 发送给接收者失败:`, error);

      // 记录失败的通知
      await this.recordNotification({
        alertId,
        recipientId,
        ruleId,
        notificationMethod: 'web',
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * 记录通知
   */
  async recordNotification(notificationData) {
    const db = await getDb();

    await db.insert(alertNotifications)
      .values({
        ...notificationData,
        createdAt: new Date()
      });
  }

  /**
   * 构建告警消息
   */
  buildAlertMessage(alert) {
    const { alertLevel, intentType, robotId, alertMessage, createdAt } = alert;

    const levelEmoji = {
      'info': 'ℹ️',
      'warning': '⚠️',
      'critical': '🚨'
    };

    const emoji = levelEmoji[alertLevel] || '⚠️';

    return `${emoji} ${intentType}\n\n` +
           `机器人ID：${robotId}\n` +
           `时间：${new Date(createdAt).toLocaleString('zh-CN')}\n` +
           `详情：${alertMessage}\n\n` +
           `请及时处理！`;
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(alertId, userId) {
    const db = await getDb();

    const [updated] = await db.update(alertHistory)
      .set({
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        status: 'acknowledged',
        updatedAt: new Date()
      })
      .where(eq(alertHistory.id, alertId))
      .returning();

    // 推送到WebSocket
    this.broadcastToWebSocket({
      type: 'alert_acknowledged',
      data: { alertId, userId }
    });

    return updated;
  }

  /**
   * 关闭告警
   */
  async closeAlert(alertId, userId) {
    const db = await getDb();

    const [alert] = await db.select()
      .from(alertHistory)
      .where(eq(alertHistory.id, alertId))
      .limit(1);

    if (!alert) {
      throw new Error('告警不存在');
    }

    const now = new Date();
    const resolvedDuration = alert.createdAt
      ? Math.floor((now - new Date(alert.createdAt)) / 1000)
      : null;

    const [updated] = await db.update(alertHistory)
      .set({
        closedAt: now,
        closedBy: userId,
        status: 'closed',
        resolvedDuration,
        updatedAt: now
      })
      .where(eq(alertHistory.id, alertId))
      .returning();

    // 重置用户的通知计数
    if (alert.alertRuleId) {
      const notifications = await db.select()
        .from(alertNotifications)
        .where(eq(alertNotifications.alertId, alertId));

      for (const notification of notifications) {
        await alertRateLimiter.resetUserCount(notification.recipientId, alert.alertRuleId);
      }
    }

    // 推送到WebSocket
    this.broadcastToWebSocket({
      type: 'alert_closed',
      data: { alertId, userId }
    });

    return updated;
  }

  /**
   * 添加WebSocket客户端
   */
  addWebSocketClient(ws, userId) {
    this.wsClients.set(userId, ws);
    console.log(`[AlertTrigger] WebSocket客户端已连接: userId=${userId}, 总数=${this.wsClients.size}`);
  }

  /**
   * 移除WebSocket客户端
   */
  removeWebSocketClient(userId) {
    this.wsClients.delete(userId);
    console.log(`[AlertTrigger] WebSocket客户端已断开: userId=${userId}, 总数=${this.wsClients.size}`);
  }

  /**
   * 广播消息到所有WebSocket客户端
   */
  broadcastToWebSocket(message) {
    const data = JSON.stringify(message);
    this.wsClients.forEach((ws, userId) => {
      if (ws.readyState === 1) { // OPEN
        try {
          ws.send(data);
        } catch (error) {
          console.error(`[AlertTrigger] 发送WebSocket消息失败 (userId=${userId}):`, error);
        }
      }
    });
  }

  /**
   * 生成ID
   */
  generateId() {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new AlertTriggerEnhancedService();
