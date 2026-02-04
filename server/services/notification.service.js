/**
 * 通知服务
 * 统一管理多种通知渠道：声音、桌面弹窗、企业微信、机器人私聊
 */

const { getDb } = require('coze-coding-dev-sdk');
const { notificationMethods, alertHistory, robots } = require('../database/schema');
const { eq, and, desc } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('NOTIFICATION_SERVICE');

/**
 * 通知配置接口
 */
class NotificationService {
  constructor() {
    this.notificationCache = new Map();
    this.cacheExpiry = 300000; // 5分钟缓存
  }

  /**
   * 获取告警规则的所有通知方式
   */
  async getNotificationMethods(alertRuleId) {
    try {
      const db = getDb();

      // 检查缓存
      const cacheKey = `rule:${alertRuleId}`;
      const cached = this.notificationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      // 从数据库获取
      const methods = await db
        .select()
        .from(notificationMethods)
        .where(eq(notificationMethods.alertRuleId, alertRuleId))
        .orderBy(notificationMethods.priority);

      // 更新缓存
      this.notificationCache.set(cacheKey, {
        data: methods,
        timestamp: Date.now()
      });

      return methods;
    } catch (error) {
      logger.error('获取通知方式失败:', error);
      return [];
    }
  }

  /**
   * 清除缓存
   */
  clearCache(alertRuleId) {
    if (alertRuleId) {
      this.notificationCache.delete(`rule:${alertRuleId}`);
    } else {
      this.notificationCache.clear();
    }
  }

  /**
   * 发送通知（根据告警规则自动选择通知方式）
   */
  async sendAlertNotification(alertId, alertRuleId, alertData) {
    try {
      logger.info('发送告警通知:', { alertId, alertRuleId });

      // 获取通知方式
      const methods = await this.getNotificationMethods(alertRuleId);

      // 过滤启用的方式
      const enabledMethods = methods.filter(m => m.isEnabled);

      if (enabledMethods.length === 0) {
        logger.warn('未找到启用的通知方式');
        return { success: false, error: '未找到启用的通知方式' };
      }

      // 并发发送所有通知
      const results = await Promise.allSettled(
        enabledMethods.map(method => this.sendByMethod(method, alertData))
      );

      // 统计结果
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failCount = results.length - successCount;

      logger.info('通知发送完成:', {
        total: results.length,
        success: successCount,
        failed: failCount
      });

      return {
        success: true,
        total: results.length,
        successCount,
        failCount,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message })
      };
    } catch (error) {
      logger.error('发送告警通知失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 根据通知方式发送通知
   */
  async sendByMethod(method, alertData) {
    try {
      const config = method.recipientConfig || {};
      const template = method.messageTemplate || this.getDefaultTemplate(method.methodType);

      const message = this.renderTemplate(template, alertData);

      switch (method.methodType) {
        case 'sound':
          return await this.sendSoundNotification(config, alertData);
        case 'desktop':
          return await this.sendDesktopNotification(config, alertData, message);
        case 'wechat':
          return await this.sendWeChatNotification(config, alertData, message);
        case 'robot':
          return await this.sendRobotNotification(config, alertData, message);
        default:
          return { success: false, error: `不支持的通知方式: ${method.methodType}` };
      }
    } catch (error) {
      logger.error(`发送${method.methodType}通知失败:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 渲染消息模板
   */
  renderTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate(methodType) {
    const templates = {
      sound: '{level} 告警',
      desktop: '【{level}告警】{description}',
      wechat: '【告警通知】\n⚠️ 级别：{level}\n📋 描述：{description}\n👤 用户：{userName}\n⏰ 时间：{time}',
      robot: '【告警通知】\n⚠️ 级别：{level}\n📋 描述：{description}\n👤 用户：{userName}\n⏰ 时间：{time}'
    };
    return templates[methodType] || '{description}';
  }

  /**
   * 发送声音通知
   * 声音通知实际上是前端实现的，这里返回配置供前端使用
   */
  async sendSoundNotification(config, alertData) {
    return {
      success: true,
      method: 'sound',
      config: {
        enabled: config.enabled !== false,
        volume: config.volume || 0.8,
        level: alertData.level
      }
    };
  }

  /**
   * 发送桌面弹窗通知
   * 桌面通知也是前端实现的，这里返回配置
   */
  async sendDesktopNotification(config, alertData, message) {
    return {
      success: true,
      method: 'desktop',
      config: {
        enabled: config.enabled !== false,
        title: alertData.title || '告警通知',
        body: message,
        icon: config.icon || '/icons/alert.png',
        requireInteraction: config.requireInteraction || false
      }
    };
  }

  /**
   * 发送企业微信通知
   */
  async sendWeChatNotification(config, alertData, message) {
    try {
      if (!config.webhookUrl) {
        return { success: false, error: '企业微信 Webhook URL 未配置' };
      }

      // 构建企业微信消息
      const wechatMessage = {
        msgtype: 'markdown',
        markdown: {
          content: message
        }
      };

      // 如果配置了 @所有人
      if (config.mentionAll) {
        wechatMessage.markdown.content += '\n\n<@all>';
      }

      // 如果配置了 @特定用户
      if (config.mentionedList && config.mentionedList.length > 0) {
        wechatMessage.markdown.content += '\n\n' +
          config.mentionedList.map(id => `<@${id}>`).join(' ');
      }

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(wechatMessage)
      });

      const result = await response.json();

      if (result.errcode === 0) {
        logger.info('企业微信通知发送成功');
        return { success: true, method: 'wechat', messageId: result.msgid };
      } else {
        logger.error('企业微信通知发送失败:', result);
        return { success: false, error: result.errmsg, code: result.errcode };
      }
    } catch (error) {
      logger.error('企业微信通知发送异常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送机器人私聊通知
   */
  async sendRobotNotification(config, alertData, message) {
    try {
      const db = getDb();

      // 获取机器人信息
      const robot = await db
        .select()
        .from(robots)
        .where(eq(robots.id, config.robotId))
        .limit(1);

      if (!robot || robot.length === 0) {
        return { success: false, error: '机器人不存在' };
      }

      const robotConfig = robot[0].config || {};

      // 构建私聊消息
      const chatMessage = {
        content: message,
        conversation_id: config.conversationId || null,
        user_id: config.userId || null,
        msg_type: 'text'
      };

      // 调用机器人 API 发送消息
      const apiUrl = `${robotConfig.apiBaseUrl || process.env.COZE_API_BASE_URL}/v3/chat`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${robotConfig.botToken || process.env.COZE_BOT_TOKEN}`
        },
        body: JSON.stringify({
          bot_id: robot[0].robotId,
          user_id: config.userId || 'admin',
          additional_messages: [chatMessage],
          stream: false
        })
      });

      const result = await response.json();

      if (response.ok && result.code === 0) {
        logger.info('机器人私聊通知发送成功');
        return { success: true, method: 'robot', messageId: result.data?.id };
      } else {
        logger.error('机器人私聊通知发送失败:', result);
        return { success: false, error: result.msg || result.message };
      }
    } catch (error) {
      logger.error('机器人私聊通知发送异常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 测试通知
   */
  async testNotification(methodType, config) {
    const testAlertData = {
      level: 'warning',
      description: '这是一条测试告警',
      userName: '测试用户',
      time: new Date().toLocaleString('zh-CN')
    };

    const method = {
      methodType,
      recipientConfig: config,
      messageTemplate: this.getDefaultTemplate(methodType)
    };

    return await this.sendByMethod(method, testAlertData);
  }
}

module.exports = new NotificationService();
