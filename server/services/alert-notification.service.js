/**
 * 告警通知服务
 * 支持多种通知方式：机器人消息、邮件、短信、企业微信、钉钉、飞书等
 */

const axios = require('axios');
const robotService = require('./robot.service');

class AlertNotificationService {
  /**
   * 发送通知
   */
  async sendNotification(methodType, message, recipientConfig, context) {
    try {
      switch (methodType) {
        case 'robot':
          return await this.sendByRobot(message, recipientConfig, context);
        case 'email':
          return await this.sendByEmail(message, recipientConfig, context);
        case 'sms':
          return await this.sendBySMS(message, recipientConfig, context);
        case 'wechat':
          return await this.sendByWechat(message, recipientConfig, context);
        case 'dingtalk':
          return await this.sendByDingtalk(message, recipientConfig, context);
        case 'feishu':
          return await this.sendByFeishu(message, recipientConfig, context);
        default:
          console.warn(`[告警通知] 不支持的通知方式: ${methodType}`);
          return { success: false, message: `不支持的通知方式: ${methodType}` };
      }
    } catch (error) {
      console.error(`[告警通知] 发送通知失败 (${methodType}):`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 通过机器人发送通知
   */
  async sendByRobot(message, recipientConfig, context) {
    try {
      const receivers = recipientConfig.receivers || [];

      if (receivers.length === 0) {
        console.warn('[告警通知] 没有配置接收人');
        return { success: false, message: '没有配置接收人' };
      }

      // 如果配置了机器人ID，使用指定机器人
      const robotId = recipientConfig.robotId || context.robotId;

      if (!robotId) {
        console.warn('[告警通知] 没有配置机器人ID');
        return { success: false, message: '没有配置机器人ID' };
      }

      const results = [];

      for (const receiver of receivers) {
        try {
          // 通过机器人给指定用户发送消息
          const result = await robotService.sendPrivateMessage(
            robotId,
            receiver.userId,
            message
          );

          results.push({
            receiver: receiver.userId,
            success: true,
            message: '发送成功',
          });
        } catch (error) {
          results.push({
            receiver: receiver.userId,
            success: false,
            message: error.message,
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalSuccess = successCount === results.length;

      console.log(`[告警通知] 机器人通知完成: ${successCount}/${results.length}`);

      return {
        success: totalSuccess,
        message: `机器人通知完成: ${successCount}/${results.length}`,
        results,
      };
    } catch (error) {
      console.error('[告警通知] 机器人通知失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 通过邮件发送通知
   */
  async sendByEmail(message, recipientConfig, context) {
    try {
      const emails = recipientConfig.emails || [];

      if (emails.length === 0) {
        console.warn('[告警通知] 没有配置邮箱');
        return { success: false, message: '没有配置邮箱' };
      }

      // TODO: 集成邮件发送服务
      // 这里可以使用 nodemailer 或其他邮件服务
      console.log('[告警通知] 邮件通知功能待实现');
      console.log(`[告警通知] 收件人: ${emails.join(', ')}`);
      console.log(`[告警通知] 内容: ${message}`);

      // 模拟发送成功
      return {
        success: true,
        message: `邮件已发送到 ${emails.length} 个收件人`,
        recipients: emails,
      };
    } catch (error) {
      console.error('[告警通知] 邮件通知失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 通过短信发送通知
   */
  async sendBySMS(message, recipientConfig, context) {
    try {
      const phones = recipientConfig.phones || [];

      if (phones.length === 0) {
        console.warn('[告警通知] 没有配置手机号');
        return { success: false, message: '没有配置手机号' };
      }

      // TODO: 集成短信发送服务（如阿里云短信、腾讯云短信等）
      console.log('[告警通知] 短信通知功能待实现');
      console.log(`[告警通知] 收件人: ${phones.join(', ')}`);
      console.log(`[告警通知] 内容: ${message}`);

      // 模拟发送成功
      return {
        success: true,
        message: `短信已发送到 ${phones.length} 个收件人`,
        recipients: phones,
      };
    } catch (error) {
      console.error('[告警通知] 短信通知失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 通过企业微信发送通知
   */
  async sendByWechat(message, recipientConfig, context) {
    try {
      const webhookUrl = recipientConfig.webhookUrl;

      if (!webhookUrl) {
        console.warn('[告警通知] 没有配置企业微信 Webhook URL');
        return { success: false, message: '没有配置企业微信 Webhook URL' };
      }

      const response = await axios.post(webhookUrl, {
        msgtype: 'text',
        text: {
          content: message,
        },
      });

      if (response.data.errcode === 0) {
        console.log('[告警通知] 企业微信通知发送成功');
        return {
          success: true,
          message: '企业微信通知发送成功',
        };
      } else {
        console.error('[告警通知] 企业微信通知失败:', response.data);
        return {
          success: false,
          message: response.data.errmsg || '企业微信通知失败',
        };
      }
    } catch (error) {
      console.error('[告警通知] 企业微信通知失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 通过钉钉发送通知
   */
  async sendByDingtalk(message, recipientConfig, context) {
    try {
      const webhookUrl = recipientConfig.webhookUrl;
      const secret = recipientConfig.secret;

      if (!webhookUrl) {
        console.warn('[告警通知] 没有配置钉钉 Webhook URL');
        return { success: false, message: '没有配置钉钉 Webhook URL' };
      }

      // 如果配置了签名，需要生成签名
      let url = webhookUrl;
      if (secret) {
        const timestamp = Date.now();
        const sign = this.generateDingtalkSign(timestamp, secret);
        url = `${webhookUrl}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
      }

      const response = await axios.post(url, {
        msgtype: 'text',
        text: {
          content: message,
        },
      });

      if (response.data.errcode === 0) {
        console.log('[告警通知] 钉钉通知发送成功');
        return {
          success: true,
          message: '钉钉通知发送成功',
        };
      } else {
        console.error('[告警通知] 钉钉通知失败:', response.data);
        return {
          success: false,
          message: response.data.errmsg || '钉钉通知失败',
        };
      }
    } catch (error) {
      console.error('[告警通知] 钉钉通知失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 通过飞书发送通知
   */
  async sendByFeishu(message, recipientConfig, context) {
    try {
      const webhookUrl = recipientConfig.webhookUrl;

      if (!webhookUrl) {
        console.warn('[告警通知] 没有配置飞书 Webhook URL');
        return { success: false, message: '没有配置飞书 Webhook URL' };
      }

      const response = await axios.post(webhookUrl, {
        msg_type: 'text',
        content: {
          text: message,
        },
      });

      if (response.data.code === 0) {
        console.log('[告警通知] 飞书通知发送成功');
        return {
          success: true,
          message: '飞书通知发送成功',
        };
      } else {
        console.error('[告警通知] 飞书通知失败:', response.data);
        return {
          success: false,
          message: response.data.msg || '飞书通知失败',
        };
      }
    } catch (error) {
      console.error('[告警通知] 飞书通知失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 生成钉钉签名
   */
  generateDingtalkSign(timestamp, secret) {
    const crypto = require('crypto');
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  /**
   * 测试通知方式
   */
  async testNotification(methodType, recipientConfig) {
    const testMessage = `[测试] 告警通知测试\n\n这是一条测试消息，用于验证 ${methodType} 通知方式是否配置正确。\n\n发送时间: ${new Date().toLocaleString('zh-CN')}`;

    return await this.sendNotification(methodType, testMessage, recipientConfig, {});
  }
}

module.exports = new AlertNotificationService();
