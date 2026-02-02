/**
 * WorkTool 服务
 * 负责与 WorkTool 平台的交互
 */

const axios = require('axios');
const robotService = require('./robot.service');

class WorkToolService {
  /**
   * 发送文本消息
   * @param {string} robotId - 机器人ID
   * @param {string} toName - 接收者名称（好友昵称或群名）
   * @param {string} content - 消息内容
   * @param {string[]} atList - @的人（可选）
   */
  async sendTextMessage(robotId, toName, content, atList = []) {
    try {
      // 获取机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);

      if (!robot) {
        throw new Error(`机器人不存在: ${robotId}`);
      }

      if (!robot.isActive) {
        throw new Error(`机器人未启用: ${robotId}`);
      }

      // 构建请求体
      const requestBody = {
        socketType: 2,
        list: [
          {
            type: 203,
            titleList: [toName],
            receivedContent: content,
            ...(atList.length > 0 && { atList })
          }
        ]
      };

      // 从 apiBaseUrl 提取基础地址
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wework/sendRawMessage`;

      // 发送请求
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          robotId: robotId
        },
        timeout: 10000
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          message: '发送成功',
          data: response.data.data
        };
      } else {
        return {
          success: false,
          message: response.data?.message || '发送失败',
          code: response.data?.code
        };
      }
    } catch (error) {
      console.error('发送 WorkTool 消息失败:', error);

      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || error.message,
          code: error.response.data?.code || error.response.status
        };
      }

      return {
        success: false,
        message: error.message,
        error: error.code
      };
    }
  }

  /**
   * 发送群消息
   * @param {string} robotId - 机器人ID
   * @param {string} groupName - 群名称
   * @param {string} content - 消息内容
   * @param {string[]} atList - @的人（可选）
   */
  async sendGroupMessage(robotId, groupName, content, atList = []) {
    return this.sendTextMessage(robotId, groupName, content, atList);
  }

  /**
   * 发送私聊消息
   * @param {string} robotId - 机器人ID
   * @param {string} userName - 用户昵称
   * @param {string} content - 消息内容
   */
  async sendPrivateMessage(robotId, userName, content) {
    return this.sendTextMessage(robotId, userName, content);
  }

  /**
   * 批量发送消息
   * @param {string} robotId - 机器人ID
   * @param {Array} messages - 消息数组，格式：[{ toName: string, content: string, atList?: string[] }]
   */
  async sendBatchMessages(robotId, messages) {
    try {
      // 获取机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);

      if (!robot) {
        throw new Error(`机器人不存在: ${robotId}`);
      }

      // 构建批量请求
      const list = messages.map(msg => ({
        type: 203,
        titleList: [msg.toName],
        receivedContent: msg.content,
        ...(msg.atList && msg.atList.length > 0 && { atList: msg.atList })
      }));

      const requestBody = {
        socketType: 2,
        list
      };

      // 从 apiBaseUrl 提取基础地址
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wework/sendRawMessage`;

      // 发送请求
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          robotId: robotId
        },
        timeout: 10000
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          message: '发送成功',
          data: response.data.data,
          sentCount: messages.length
        };
      } else {
        return {
          success: false,
          message: response.data?.message || '发送失败',
          code: response.data?.code
        };
      }
    } catch (error) {
      console.error('批量发送 WorkTool 消息失败:', error);

      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || error.message,
          code: error.response.data?.code || error.response.status
        };
      }

      return {
        success: false,
        message: error.message,
        error: error.code
      };
    }
  }
}

module.exports = new WorkToolService();
