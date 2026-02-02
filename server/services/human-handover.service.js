/**
 * 人工告警服务
 * 负责检测风险内容并发送告警消息给指定的微信用户
 */

const config = require('../lib/config');
const worktoolService = require('./worktool.service');
const logger = require('../lib/utils').logger;

class HumanHandoverService {
  constructor() {
    // worktoolService 已经是实例，不需要再 new
  }

  /**
   * 发送风险告警
   * @param {Object} params - 告警参数
   * @param {string} params.userId - 用户ID
   * @param {string} params.userName - 用户名称
   * @param {string} params.groupId - 群组ID
   * @param {string} params.groupName - 群组名称
   * @param {string} params.messageContent - 消息内容
   * @param {string} params.timestamp - 时间戳
   * @returns {Promise<Object>} - 发送结果
   */
  async sendRiskAlert(params) {
    const { userId, userName, groupId, groupName, messageContent, timestamp } = params;

    // 获取配置
    const handoverConfig = config.get('humanHandover');

    // 检查是否启用
    if (!handoverConfig || !handoverConfig.enabled) {
      logger.info('[人工告警] 人工告警未启用');
      return { success: false, reason: '人工告警未启用' };
    }

    // 检查模式
    if (handoverConfig.autoMode !== 'risk') {
      logger.info('[人工告警] 不在风险自动告警模式下');
      return { success: false, reason: '不在风险自动告警模式下' };
    }

    // 获取接收者列表
    const recipients = handoverConfig.alertRecipients || [];
    if (recipients.length === 0) {
      logger.warn('[人工告警] 没有配置告警接收者');
      return { success: false, reason: '没有配置告警接收者' };
    }

    // 过滤启用的接收者
    const enabledRecipients = recipients.filter(r => r.enabled);
    if (enabledRecipients.length === 0) {
      logger.warn('[人工告警] 没有启用的告警接收者');
      return { success: false, reason: '没有启用的告警接收者' };
    }

    // 生成告警消息
    const alertMessage = this.generateAlertMessage(handoverConfig.alertMessageTemplate, {
      userId,
      userName: userName || userId,
      groupId,
      groupName: groupName || groupId,
      messageContent,
      timestamp: timestamp || new Date().toLocaleString('zh-CN')
    });

    // 获取发送次数和间隔
    const alertCount = Math.min(Math.max(handoverConfig.alertCount || 1, 1), 10); // 限制在1-10次
    const alertInterval = Math.max(handoverConfig.alertInterval || 5000, 1000); // 最小1秒

    // 发送告警消息
    const results = [];
    for (const recipient of enabledRecipients) {
      try {
        // 发送指定次数的消息
        for (let i = 0; i < alertCount; i++) {
          const messageWithIndex = i === 0 ? alertMessage : `${alertMessage}\n\n（第 ${i + 1} 次提醒）`;
          
          await worktoolService.sendTextMessage(
            recipient.type, // 'private' 或 'group'
            recipient.userId,
            messageWithIndex
          );

          logger.info(`[人工告警] 已发送给 ${recipient.name} (${recipient.userId}) - 第 ${i + 1}/${alertCount} 次`);

          // 如果不是最后一次，等待间隔时间
          if (i < alertCount - 1) {
            await new Promise(resolve => setTimeout(resolve, alertInterval));
          }

          results.push({
            recipientId: recipient.id,
            recipientName: recipient.name,
            success: true,
            count: i + 1
          });
        }
      } catch (error) {
        logger.error(`[人工告警] 发送给 ${recipient.name} 失败:`, error);
        results.push({
          recipientId: recipient.id,
          recipientName: recipient.name,
          success: false,
          error: error.message
        });
      }
    }

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const totalRecipients = enabledRecipients.length;

    logger.info(`[人工告警] 发送完成：${successCount}/${totalRecipients} 个接收者成功`);

    return {
      success: successCount > 0,
      results,
      summary: {
        totalRecipients,
        successCount,
        failCount: totalRecipients - successCount,
        messageCount: alertCount
      }
    };
  }

  /**
   * 手动发送告警
   * @param {Object} params - 手动告警参数
   * @param {string} params.recipientId - 接收者ID
   * @param {string} params.message - 消息内容
   * @returns {Promise<Object>} - 发送结果
   */
  async sendManualAlert(params) {
    const { recipientId, message } = params;

    // 获取配置
    const handoverConfig = config.get('humanHandover');

    // 检查是否启用
    if (!handoverConfig || !handoverConfig.enabled) {
      return { success: false, reason: '人工告警未启用' };
    }

    // 查找接收者
    const recipient = handoverConfig.alertRecipients.find(r => r.id === recipientId);
    if (!recipient) {
      return { success: false, reason: '找不到指定的接收者' };
    }

    if (!recipient.enabled) {
      return { success: false, reason: '接收者未启用' };
    }

    try {
      await worktoolService.sendTextMessage(
        recipient.type,
        recipient.userId,
        message
      );

      logger.info(`[人工告警] 手动发送给 ${recipient.name} 成功`);

      return {
        success: true,
        recipientId: recipient.id,
        recipientName: recipient.name
      };
    } catch (error) {
      logger.error(`[人工告警] 手动发送失败:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取接收者列表
   * @returns {Array} - 接收者列表
   */
  getRecipients() {
    const handoverConfig = config.get('humanHandover');
    return handoverConfig?.alertRecipients || [];
  }

  /**
   * 添加接收者
   * @param {Object} recipient - 接收者信息
   * @returns {Object} - 添加结果
   */
  addRecipient(recipient) {
    const handoverConfig = config.get('humanHandover');

    if (!handoverConfig) {
      return { success: false, reason: '配置不存在' };
    }

    if (!handoverConfig.alertRecipients) {
      handoverConfig.alertRecipients = [];
    }

    // 检查是否已存在
    const exists = handoverConfig.alertRecipients.some(r => r.userId === recipient.userId);
    if (exists) {
      return { success: false, reason: '该用户ID已存在' };
    }

    // 添加新接收者
    const newRecipient = {
      id: `recipient${Date.now()}`,
      name: recipient.name,
      userId: recipient.userId,
      type: recipient.type || 'private',
      enabled: true
    };

    handoverConfig.alertRecipients.push(newRecipient);
    config.save();

    logger.info(`[人工告警] 添加接收者: ${newRecipient.name}`);

    return { success: true, recipient: newRecipient };
  }

  /**
   * 更新接收者
   * @param {string} id - 接收者ID
   * @param {Object} updates - 更新内容
   * @returns {Object} - 更新结果
   */
  updateRecipient(id, updates) {
    const handoverConfig = config.get('humanHandover');

    if (!handoverConfig || !handoverConfig.alertRecipients) {
      return { success: false, reason: '配置不存在' };
    }

    const index = handoverConfig.alertRecipients.findIndex(r => r.id === id);
    if (index === -1) {
      return { success: false, reason: '找不到指定的接收者' };
    }

    // 更新接收者
    handoverConfig.alertRecipients[index] = {
      ...handoverConfig.alertRecipients[index],
      ...updates
    };

    config.save();

    logger.info(`[人工告警] 更新接收者: ${id}`);

    return { success: true, recipient: handoverConfig.alertRecipients[index] };
  }

  /**
   * 删除接收者
   * @param {string} id - 接收者ID
   * @returns {Object} - 删除结果
   */
  deleteRecipient(id) {
    const handoverConfig = config.get('humanHandover');

    if (!handoverConfig || !handoverConfig.alertRecipients) {
      return { success: false, reason: '配置不存在' };
    }

    const index = handoverConfig.alertRecipients.findIndex(r => r.id === id);
    if (index === -1) {
      return { success: false, reason: '找不到指定的接收者' };
    }

    const deleted = handoverConfig.alertRecipients.splice(index, 1)[0];
    config.save();

    logger.info(`[人工告警] 删除接收者: ${deleted.name}`);

    return { success: true, recipient: deleted };
  }

  /**
   * 生成告警消息
   * @param {string} template - 消息模板
   * @param {Object} params - 参数对象
   * @returns {string} - 生成的消息
   */
  generateAlertMessage(template, params) {
    let message = template || '⚠️ 检测到风险内容\n\n{messageContent}';

    // 替换变量
    Object.keys(params).forEach(key => {
      const placeholder = `{${key}}`;
      if (message.includes(placeholder)) {
        message = message.replace(new RegExp(placeholder, 'g'), params[key]);
      }
    });

    return message;
  }

  /**
   * 更新配置
   * @param {Object} updates - 更新内容
   * @returns {Object} - 更新结果
   */
  updateConfig(updates) {
    const handoverConfig = config.get('humanHandover');

    if (!handoverConfig) {
      return { success: false, reason: '配置不存在' };
    }

    // 更新配置
    Object.assign(handoverConfig, updates);
    config.save();

    logger.info('[人工告警] 更新配置');

    return { success: true, config: handoverConfig };
  }

  /**
   * 获取配置
   * @returns {Object} - 配置信息
   */
  getConfig() {
    return config.get('humanHandover') || {};
  }
}

module.exports = new HumanHandoverService();
