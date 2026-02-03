/**
 * WorkTool 服务
 * 负责与 WorkTool 平台的交互
 */

const axios = require('axios');
const robotService = require('./robot.service');
const logger = require('./system-logger.service');

class WorkToolService {
  /**
   * 发送文本消息
   * @param {string} robotId - 机器人ID
   * @param {string} toName - 接收者名称（好友昵称或群名）
   * @param {string} content - 消息内容
   * @param {string[]} atList - @的人（可选）
   */
  async sendTextMessage(robotId, toName, content, atList = []) {
    const sendId = `send-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      logger.info('WorkTool', '开始发送文本消息', {
        sendId,
        robotId,
        toName,
        contentLength: content.length,
        contentPreview: content.substring(0, 100),
        atList,
        timestamp: new Date().toISOString()
      });

      console.log(`[WorkTool] 开始发送消息:`, {
        sendId,
        robotId,
        toName,
        contentLength: content.length
      });

      // 获取机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);

      if (!robot) {
        logger.warn('WorkTool', '发送消息失败：机器人不存在', {
          sendId,
          robotId
        });
        throw new Error(`机器人不存在: ${robotId}`);
      }

      if (!robot.isActive) {
        logger.warn('WorkTool', '发送消息失败：机器人未启用', {
          sendId,
          robotId,
          robotName: robot.name
        });
        throw new Error(`机器人未启用: ${robotId}`);
      }

      logger.info('WorkTool', '机器人验证通过', {
        sendId,
        robotId,
        robotName: robot.name,
        apiBaseUrl: robot.apiBaseUrl
      });

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

      logger.info('WorkTool', '构建请求体', {
        sendId,
        requestBody: JSON.stringify(requestBody)
      });

      // 从 apiBaseUrl 提取基础地址
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wework/sendRawMessage`;

      logger.info('WorkTool', '调用 WorkTool API', {
        sendId,
        apiUrl,
        robotId,
        method: 'POST'
      });

      console.log(`[WorkTool] 调用 API:`, {
        sendId,
        apiUrl,
        robotId
      });

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

      const processingTime = Date.now() - startTime;

      logger.info('WorkTool', '收到 API 响应', {
        sendId,
        statusCode: response.status,
        responseData: JSON.stringify(response.data),
        processingTime
      });

      console.log(`[WorkTool] API 响应:`, {
        sendId,
        statusCode: response.status,
        responseData: response.data,
        processingTime
      });

      if (response.data && response.data.code === 0) {
        logger.info('WorkTool', '发送消息成功', {
          sendId,
          robotId,
          robotName: robot.name,
          toName,
          processingTime,
          responseData: response.data
        });

        console.log(`[WorkTool] 发送成功:`, {
          sendId,
          robotId,
          toName,
          processingTime
        });

        return {
          success: true,
          message: '发送成功',
          data: response.data.data,
          sendId,
          processingTime
        };
      } else if (response.data && response.data.message) {
        // WorkTool API 返回的某些消息实际上表示成功
        // 例如："指令已加入代发队列中！" 表示消息已经成功提交
        const successMessages = [
          '指令已加入代发队列中！',
          '消息已加入队列',
          '消息发送成功',
          '已加入发送队列'
        ];

        const isSuccess = successMessages.some(msg => 
          response.data.message.includes(msg)
        );

        if (isSuccess) {
          logger.info('WorkTool', '发送消息成功（通过消息判断）', {
            sendId,
            robotId,
            robotName: robot.name,
            toName,
            processingTime,
            apiMessage: response.data.message,
            apiCode: response.data.code
          });

          return {
            success: true,
            message: response.data.message || '发送成功',
            data: response.data.data,
            sendId,
            processingTime
          };
        } else {
          logger.warn('WorkTool', '发送消息失败：API 返回非成功状态', {
            sendId,
            robotId,
            robotName: robot.name,
            toName,
            apiCode: response.data?.code,
            apiMessage: response.data?.message,
            responseData: JSON.stringify(response.data),
            processingTime
          });

          return {
            success: false,
            message: response.data?.message || '发送失败',
            code: response.data?.code,
            sendId,
            processingTime
          };
        }
      } else {
        logger.warn('WorkTool', '发送消息失败：API 返回非成功状态', {
          sendId,
          robotId,
          robotName: robot.name,
          toName,
          apiCode: response.data?.code,
          apiMessage: response.data?.message,
          responseData: JSON.stringify(response.data),
          processingTime
        });

        console.log(`[WorkTool] 发送失败:`, {
          sendId,
          robotId,
          toName,
          apiCode: response.data?.code,
          apiMessage: response.data?.message
        });

        return {
          success: false,
          message: response.data?.message || '发送失败',
          code: response.data?.code,
          sendId,
          processingTime
        };
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('发送 WorkTool 消息失败:', error);

      logger.error('WorkTool', '发送消息异常', {
        sendId,
        robotId,
        toName,
        error: error.message,
        stack: error.stack,
        errorType: error.constructor.name,
        processingTime,
        timestamp: new Date().toISOString()
      });

      if (error.response) {
        logger.error('WorkTool', 'API 请求错误响应', {
          sendId,
          robotId,
          status: error.response.status,
          statusText: error.response.statusText,
          responseData: JSON.stringify(error.response.data),
          processingTime
        });

        return {
          success: false,
          message: error.response.data?.message || error.message,
          code: error.response.data?.code || error.response.status,
          sendId,
          processingTime,
          errorType: 'http_error'
        };
      }

      return {
        success: false,
        message: error.message,
        error: error.code,
        sendId,
        processingTime,
        errorType: 'network_error'
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

  /**
   * 获取机器人信息（从 WorkTool API）
   * @param {string} robotId - 机器人ID
   * @returns {Object} 机器人信息
   */
  async getRobotInfo(robotId) {
    const startTime = Date.now();

    try {
      logger.info('WorkTool', '开始获取机器人信息', {
        robotId,
        timestamp: new Date().toISOString()
      });

      // 获取机器人配置
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        throw new Error(`机器人不存在: ${robotId}`);
      }

      logger.info('WorkTool', '获取机器人配置成功', {
        robotId,
        robotKeys: Object.keys(robot),
        hasGetInfoApi: !!robot.getInfoApi,
        getInfoApiValue: robot.getInfoApi
      });

      // 使用机器人的 getInfoApi 字段，而不是自己拼接 URL
      const apiUrl = robot.getInfoApi || `${robot.apiBaseUrl}robot/robotInfo/get`;

      logger.info('WorkTool', '使用机器人 API URL', {
        robotId,
        getInfoApi: robot.getInfoApi,
        apiBaseUrl: robot.apiBaseUrl,
        finalApiUrl: apiUrl
      });

      const response = await axios.get(apiUrl, {
        timeout: 10000
      });

      const processingTime = Date.now() - startTime;

      if (response.data && response.data.code === 200) {
        logger.info('WorkTool', '获取机器人信息成功', {
          robotId,
          robotName: response.data.data?.name,
          corporation: response.data.data?.corporation,
          processingTime
        });

        return {
          success: true,
          data: response.data.data,
          processingTime
        };
      } else {
        logger.warn('WorkTool', '获取机器人信息失败', {
          robotId,
          apiCode: response.data?.code,
          apiMessage: response.data?.message,
          processingTime
        });

        return {
          success: false,
          message: response.data?.message || '获取机器人信息失败',
          code: response.data?.code,
          processingTime
        };
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('WorkTool', '获取机器人信息异常', {
        robotId,
        error: error.message,
        errorType: error.constructor.name,
        processingTime
      });

      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || error.message,
          code: error.response.data?.code || error.response.status,
          processingTime,
          errorType: 'http_error'
        };
      }

      return {
        success: false,
        message: error.message,
        error: error.code,
        processingTime,
        errorType: 'network_error'
      };
    }
  }
}

module.exports = new WorkToolService();
