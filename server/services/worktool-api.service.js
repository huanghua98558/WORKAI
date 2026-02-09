/**
 * WorkTool API 客户端服务
 * 用于调用 WorkTool 的 API 接口
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('WORKTOOL_API');

class WorkToolApiService {
  constructor() {
    this.apiBaseUrl = null;
  }

  /**
   * 获取 WorkTool API Base URL
   */
  async getApiBaseUrl(robotId) {
    try {
      const db = await getDb();
      const robot = await db.select()
        .from(robots)
        .where(eq(robots.robotId, robotId))
        .limit(1);

      if (robot.length === 0) {
        throw new Error(`机器人不存在: ${robotId}`);
      }

      // 从数据库获取 apiBaseUrl
      const apiBaseUrl = robot[0].apiBaseUrl;

      logger.info('获取到 API Base URL', { robotId, apiBaseUrl });

      if (!apiBaseUrl) {
        throw new Error(`机器人 ${robotId} 未配置 apiBaseUrl`);
      }

      // 从 apiBaseUrl 提取基础地址（移除 /wework/ 后缀）
      const baseUrl = apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');

      logger.info('处理后的 Base URL', { robotId, baseUrl });

      this.apiBaseUrl = baseUrl;
      return this.apiBaseUrl;
    } catch (error) {
      logger.error('获取 API Base URL 失败', { robotId, error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * 1. 发送消息
   * @param {string} robotId - 机器人ID
   * @param {object} message - 消息对象
   * @param {string} message.toName - 接收者姓名
   * @param {string} message.content - 消息内容
   * @param {number} message.messageType - 消息类型（1=文本 2=图片 3=视频等）
   * @returns {Promise<object>} 发送结果
   */
  async sendRawMessage(robotId, message) {
    try {
      const apiBaseUrl = await this.getApiBaseUrl(robotId);
      const url = `${apiBaseUrl}/wework/sendRawMessage?robotId=${robotId}`;

      logger.info('发送消息', { robotId, toName: message.toName, messageType: message.messageType });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`发送消息失败: ${result.message}`);
      }

      logger.info('发送消息成功', { robotId, messageId: result.data?.messageId });
      return result;
    } catch (error) {
      logger.error('发送消息失败', { robotId, error: error.message });
      throw error;
    }
  }

  /**
   * 2. 机器人后端通讯加密地址更新
   * @param {string} robotId - 机器人ID
   * @param {object} robotInfo - 机器人信息
   * @returns {Promise<object>} 更新结果
   */
  async updateRobotInfo(robotId, robotInfo) {
    try {
      const apiBaseUrl = await this.getApiBaseUrl(robotId);
      const url = `${apiBaseUrl}/robot/robotInfo/update?robotId=${robotId}`;

      logger.info('更新机器人信息', { robotId });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(robotInfo)
      });

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`更新机器人信息失败: ${result.message}`);
      }

      logger.info('更新机器人信息成功', { robotId });
      return result;
    } catch (error) {
      logger.error('更新机器人信息失败', { robotId, error: error.message });
      throw error;
    }
  }

  /**
   * 3. 获取机器人信息
   * @param {string} robotId - 机器人ID
   * @returns {Promise<object>} 机器人信息
   */
  async getRobotInfo(robotId) {
    logger.info('开始获取机器人信息', { robotId });

    try {
      logger.info('步骤1: 获取 API Base URL', { robotId });
      const apiBaseUrl = await this.getApiBaseUrl(robotId);
      
      logger.info('步骤2: 构建请求 URL', { robotId, apiBaseUrl });
      const url = `${apiBaseUrl}/robot/robotInfo/get?robotId=${robotId}`;

      logger.info('步骤3: 发起 fetch 请求', { robotId, url });

      const response = await fetch(url);
      
      logger.info('步骤4: 收到响应', { robotId, status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('WorkTool API 返回错误状态', { robotId, status: response.status, errorText });
        throw new Error(`获取机器人信息失败: HTTP ${response.status} - ${errorText}`);
      }

      logger.info('步骤5: 解析 JSON', { robotId });
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const errorText = await response.text();
        logger.error('解析 JSON 响应失败', { robotId, error: jsonError.message, responseText: errorText });
        throw new Error(`获取机器人信息失败: 无法解析响应 - ${errorText}`);
      }

      logger.info('步骤6: 检查响应码', { robotId, code: result.code, message: result.message });

      if (result.code !== 200) {
        throw new Error(`获取机器人信息失败: ${result.message}`);
      }

      logger.info('步骤7: 返回数据', { robotId });
      return result.data;
    } catch (error) {
      logger.error('获取机器人信息失败', { robotId, error: error.message, name: error.name, stack: error.stack });
      throw error;
    }
  }

  /**
   * 4. 查询机器人是否在线
   * @param {string} robotId - 机器人ID
   * @returns {Promise<boolean>} 是否在线
   */
  async isRobotOnline(robotId) {
    try {
      const apiBaseUrl = await this.getApiBaseUrl(robotId);
      const url = `${apiBaseUrl}/robot/robotInfo/online?robotId=${robotId}`;

      logger.info('查询机器人在线状态', { robotId });

      const response = await fetch(url);
      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`查询机器人在线状态失败: ${result.message}`);
      }

      // WorkTool API 返回的 data 直接是布尔值 true/false
      const isOnline = result.data === true;
      logger.info('查询机器人在线状态成功', { robotId, isOnline });
      return isOnline;
    } catch (error) {
      logger.error('查询机器人在线状态失败', { robotId, error: error.message });
      throw error;
    }
  }

  /**
   * 5. 查询机器人登录日志
   * @param {string} robotId - 机器人ID
   * @param {object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页数量
   * @returns {Promise<object>} 登录日志
   */
  async getRobotLoginLogs(robotId, options = {}) {
    try {
      const apiBaseUrl = await this.getApiBaseUrl(robotId);
      const { page = 1, pageSize = 10 } = options;
      const url = `${apiBaseUrl}/robot/robotInfo/onlineInfos?robotId=${robotId}&page=${page}&pageSize=${pageSize}`;

      logger.info('查询机器人登录日志', { robotId, page, pageSize });

      const response = await fetch(url);
      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`查询机器人登录日志失败: ${result.message}`);
      }

      logger.info('查询机器人登录日志成功', { robotId, count: result.data?.list?.length });
      return result.data;
    } catch (error) {
      logger.error('查询机器人登录日志失败', { robotId, error: error.message });
      throw error;
    }
  }

  /**
   * 6. 指令消息API调用查询
   * @param {string} robotId - 机器人ID
   * @param {object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页数量
   * @returns {Promise<object>} 指令消息列表
   */
  async listRawMessages(robotId, options = {}) {
    try {
      const apiBaseUrl = await this.getApiBaseUrl(robotId);
      const { page = 1, pageSize = 10 } = options;
      const url = `${apiBaseUrl}/wework/listRawMessage?robotId=${robotId}&page=${page}&pageSize=${pageSize}`;

      logger.info('查询指令消息', { robotId, page, pageSize });

      const response = await fetch(url);
      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`查询指令消息失败: ${result.message}`);
      }

      logger.info('查询指令消息成功', { robotId, count: result.data?.list?.length });
      return result.data;
    } catch (error) {
      logger.error('查询指令消息失败', { robotId, error: error.message });
      throw error;
    }
  }

  /**
   * 7. 指令执行结果查询
   * @param {string} robotId - 机器人ID
   * @param {object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页数量
   * @returns {Promise<object>} 指令执行结果列表
   */
  async getCommandResults(robotId, options = {}) {
    try {
      const apiBaseUrl = await this.getApiBaseUrl(robotId);
      const { page = 1, pageSize = 10 } = options;
      const url = `${apiBaseUrl}/robot/rawMsg/list?robotId=${robotId}&page=${page}&pageSize=${pageSize}`;

      logger.info('查询指令执行结果', { robotId, page, pageSize });

      const response = await fetch(url);
      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`查询指令执行结果失败: ${result.message}`);
      }

      logger.info('查询指令执行结果成功', { robotId, count: result.data?.list?.length });
      return result.data;
    } catch (error) {
      logger.error('查询指令执行结果失败', { robotId, error: error.message });
      throw error;
    }
  }

  /**
   * 8. 机器人消息回调日志列表查询
   * @param {string} robotId - 机器人ID
   * @param {object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页数量
   * @returns {Promise<object>} 消息回调日志列表
   */
  async getMessageCallbackLogs(robotId, options = {}) {
    try {
      const apiBaseUrl = await this.getApiBaseUrl(robotId);
      const { page = 1, pageSize = 10 } = options;
      const url = `${apiBaseUrl}/robot/qaLog/list?robotId=${robotId}&page=${page}&pageSize=${pageSize}`;

      logger.info('查询消息回调日志', { robotId, page, pageSize });

      const response = await fetch(url);
      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`查询消息回调日志失败: ${result.message}`);
      }

      logger.info('查询消息回调日志成功', { robotId, count: result.data?.list?.length });
      return result.data;
    } catch (error) {
      logger.error('查询消息回调日志失败', { robotId, error: error.message });
      throw error;
    }
  }
}

// 导出单例
const workToolApiService = new WorkToolApiService();

module.exports = workToolApiService;
