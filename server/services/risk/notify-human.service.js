/**
 * 人工通知服务
 * 负责向工作人员发送通知（WebSocket、邮件、企微等）
 */

class NotifyHumanService {
  constructor() {
    this.wsClients = new Map(); // WebSocket客户端连接
  }

  /**
   * 注册WebSocket客户端
   * @param {string} userId - 用户ID
   * @param {WebSocket} ws - WebSocket连接
   */
  registerWSClient(userId, ws) {
    this.wsClients.set(userId, ws);

    ws.on('close', () => {
      this.wsClients.delete(userId);
    });
  }

  /**
   * 发送风险通知
   * @param {Object} notification - 通知对象
   * @returns {Promise<void>}
   */
  async sendRiskNotification(notification) {
    try {
      console.log('[NotifyHuman] 准备发送风险通知:', notification.riskId);

      // 1. 获取在线工作人员列表
      const onlineAgents = await this.getOnlineAgents();

      if (onlineAgents.length === 0) {
        console.log('[NotifyHuman] 没有在线工作人员，跳过通知');
        return;
      }

      console.log('[NotifyHuman] 在线工作人员数量:', onlineAgents.length);

      // 2. 通过WebSocket发送通知
      const notifiedCount = await this.sendWebSocketNotification(
        notification,
        onlineAgents
      );

      console.log('[NotifyHuman] WebSocket通知已发送:', notifiedCount, '人');

      // 3. 根据配置，通过其他渠道发送通知（邮件、企微等）
      const config = await this.getNotificationConfig();
      if (config.enableForRiskMessages) {
        await this.sendExternalNotification(notification, onlineAgents, config);
      }

    } catch (error) {
      console.error('[NotifyHuman] 发送风险通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送WebSocket通知
   * @param {Object} notification - 通知对象
   * @param {Array} agents - 工作人员列表
   * @returns {Promise<number>} - 返回通知成功的数量
   */
  async sendWebSocketNotification(notification, agents) {
    let notifiedCount = 0;

    const notificationMessage = {
      type: 'notification',
      data: {
        notificationType: 'risk_message',
        riskId: notification.riskId,
        sessionId: notification.sessionId,
        userId: notification.userId,
        userName: notification.userName,
        groupName: notification.groupName,
        message: notification.message,
        aiReply: notification.aiReply,
        priority: notification.priority || 'medium',
        timestamp: new Date().toISOString(),
        actions: [
          {
            label: '查看会话',
            action: 'view_session',
            sessionId: notification.sessionId
          },
          {
            label: '介入处理',
            action: 'intervene',
            riskId: notification.riskId
          },
          {
            label: '忽略',
            action: 'ignore',
            riskId: notification.riskId
          }
        ]
      }
    };

    for (const agent of agents) {
      const ws = this.wsClients.get(agent.id);
      if (ws && ws.readyState === 1) { // WebSocket.OPEN
        try {
          ws.send(JSON.stringify(notificationMessage));
          notifiedCount++;
        } catch (error) {
          console.error('[NotifyHuman] WebSocket发送失败:', agent.id, error);
        }
      }
    }

    return notifiedCount;
  }

  /**
   * 发送外部通知（邮件、企微等）
   * @param {Object} notification - 通知对象
   * @param {Array} agents - 工作人员列表
   * @param {Object} config - 通知配置
   * @returns {Promise<void>}
   */
  async sendExternalNotification(notification, agents, config) {
    const preferredMethod = config.preferredMethod || 'email';

    switch (preferredMethod) {
      case 'email':
        await this.sendEmailNotification(notification, agents, config);
        break;

      case 'wechat_work':
        await this.sendWeChatWorkNotification(notification, agents, config);
        break;

      case 'all':
        await Promise.all([
          this.sendEmailNotification(notification, agents, config),
          this.sendWeChatWorkNotification(notification, agents, config)
        ]);
        break;

      default:
        console.log('[NotifyHuman] 不支持的通知方式:', preferredMethod);
    }
  }

  /**
   * 发送邮件通知
   * @param {Object} notification - 通知对象
   * @param {Array} agents - 工作人员列表
   * @param {Object} config - 通知配置
   * @returns {Promise<void>}
   */
  async sendEmailNotification(notification, agents, config) {
    try {
      // 获取邮件服务
      const { emailService } = require('../../integrations/email.service');

      const emailAddresses = agents
        .map(agent => agent.email)
        .filter(Boolean);

      if (emailAddresses.length === 0) {
        console.log('[NotifyHuman] 没有有效的邮箱地址');
        return;
      }

      await emailService.send({
        to: emailAddresses,
        subject: '【风险消息预警】需要您关注',
        html: this.buildEmailContent(notification)
      });

      console.log('[NotifyHuman] 邮件通知已发送:', emailAddresses.length);

    } catch (error) {
      console.error('[NotifyHuman] 发送邮件通知失败:', error);
      // 不抛出错误，避免影响其他通知方式
    }
  }

  /**
   * 构建邮件内容
   * @param {Object} notification - 通知对象
   * @returns {string}
   */
  buildEmailContent(notification) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f44336; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fff; padding: 15px; margin: 10px 0; border-left: 4px solid #f44336; }
    .action-btn { display: inline-block; background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⚠️ 风险消息预警</h2>
    </div>
    <div class="content">
      <div class="info-box">
        <p><strong>用户：</strong>${notification.userName}</p>
        <p><strong>群聊：</strong>${notification.groupName}</p>
        <p><strong>时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
      </div>

      <h3>用户消息：</h3>
      <div class="info-box">
        <p>${notification.message}</p>
      </div>

      <h3>AI回复：</h3>
      <div class="info-box">
        <p>${notification.aiReply}</p>
      </div>

      <p style="margin-top: 20px;">AI正在处理中，请您关注会话进展，必要时可介入处理。</p>

      <p style="margin-top: 30px;">
        <a href="https://your-domain.com/sessions/${notification.sessionId}" class="action-btn">查看会话</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 发送企业微信通知
   * @param {Object} notification - 通知对象
   * @param {Array} agents - 工作人员列表
   * @param {Object} config - 通知配置
   * @returns {Promise<void>}
   */
  async sendWeChatWorkNotification(notification, agents, config) {
    try {
      // 获取企微服务
      const { wechatWorkService } = require('../../integrations/wechat-work.service');

      const userIds = agents
        .map(agent => agent.wechatWorkId)
        .filter(Boolean);

      if (userIds.length === 0) {
        console.log('[NotifyHuman] 没有有效的企微用户ID');
        return;
      }

      await wechatWorkService.sendText({
        touser: userIds.join('|'),
        msgtype: 'text',
        text: {
          content: `【风险消息预警】\n\n用户：${notification.userName}\n群聊：${notification.groupName}\n\n消息内容：${notification.message}\n\nAI回复：${notification.aiReply}\n\nAI正在处理中，请关注会话进展。`
        }
      });

      console.log('[NotifyHuman] 企微通知已发送:', userIds.length);

    } catch (error) {
      console.error('[NotifyHuman] 发送企微通知失败:', error);
      // 不抛出错误，避免影响其他通知方式
    }
  }

  /**
   * 获取在线工作人员列表
   * @returns {Promise<Array>}
   */
  async getOnlineAgents() {
    try {
      // 这里需要从数据库或缓存中获取在线工作人员
      // 暂时返回mock数据
      return [
        {
          id: 'agent1',
          name: '客服A',
          email: 'agent1@example.com',
          wechatWorkId: 'zhangsan'
        },
        {
          id: 'agent2',
          name: '客服B',
          email: 'agent2@example.com',
          wechatWorkId: 'lisi'
        }
      ];
    } catch (error) {
      console.error('[NotifyHuman] 获取在线工作人员失败:', error);
      return [];
    }
  }

  /**
   * 获取通知配置
   * @returns {Promise<Object>}
   */
  async getNotificationConfig() {
    try {
      // 这里需要从系统配置中获取
      // 暂时返回默认配置
      return {
        enableForRiskMessages: false,
        preferredMethod: 'email'
      };
    } catch (error) {
      console.error('[NotifyHuman] 获取通知配置失败:', error);
      return {
        enableForRiskMessages: false,
        preferredMethod: 'email'
      };
    }
  }
}

// 导出单例实例
const notifyHumanService = new NotifyHumanService();

// 导出类和实例
module.exports = {
  NotifyHumanService,
  notifyHumanService
};
