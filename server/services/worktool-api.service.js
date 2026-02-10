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
   * 1. 发送消息（基础方法）
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
   * 1.1 发送消息（带重试机制）
   * @param {string} robotId - 机器人ID
   * @param {object} message - 消息对象
   * @param {object} retryOptions - 重试选项
   * @param {number} retryOptions.maxRetries - 最大重试次数（默认 3）
   * @param {number} retryOptions.initialDelay - 初始延迟（毫秒，默认 1000）
   * @param {number} retryOptions.maxDelay - 最大延迟（毫秒，默认 10000）
   * @param {number} retryOptions.backoffFactor - 退避因子（默认 2）
   * @param {Array<number>} retryOptions.retryableStatusCodes - 可重试的HTTP状态码（默认 [408, 429, 500, 502, 503, 504]）
   * @returns {Promise<object>} 发送结果
   */
  async sendRawMessageWithRetry(robotId, message, retryOptions = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryableStatusCodes = [408, 429, 500, 502, 503, 504]
    } = retryOptions;

    let lastError = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;

      try {
        logger.info('[重试发送消息] 开始尝试', {
          robotId,
          attempt,
          maxRetries,
          toName: message.toName
        });

        // 调用基础发送方法
        const result = await this.sendRawMessage(robotId, message);

        logger.info('[重试发送消息] 尝试成功', {
          robotId,
          attempt,
          messageId: result.data?.messageId
        });

        // 如果重试成功，调用 robotService 的记录成功方法
        if (attempt > 1) {
          try {
            const robotService = require('./robot.service');
            await robotService.recordRobotSendSuccess(robotId);
            logger.info('[重试发送消息] 重试成功，已更新健康状态', { robotId });
          } catch (recordError) {
            logger.warn('[重试发送消息] 记录发送成功失败', { robotId, error: recordError.message });
          }
        }

        return result;
      } catch (error) {
        lastError = error;

        // 判断是否可重试
        const isRetryable = this.isRetryableError(error, retryableStatusCodes);

        logger.warn('[重试发送消息] 尝试失败', {
          robotId,
          attempt,
          maxRetries,
          isRetryable,
          error: error.message,
          statusCode: error.response?.status
        });

        // 如果不可重试或已达最大重试次数，抛出错误
        if (!isRetryable || attempt >= maxRetries) {
          logger.error('[重试发送消息] 最终失败，停止重试', {
            robotId,
            attempt,
            maxRetries,
            error: error.message
          });

          // 如果是最终失败，调用 robotService 的记录失败方法
          try {
            const robotService = require('./robot.service');
            await robotService.recordRobotSendFailure(robotId, error);
            logger.info('[重试发送消息] 已记录发送失败', { robotId });
          } catch (recordError) {
            logger.warn('[重试发送消息] 记录发送失败失败', { robotId, error: recordError.message });
          }

          throw error;
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(
          initialDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );

        // 添加随机抖动（±20%），避免重试风暴
        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        const finalDelay = Math.round(delay + jitter);

        logger.info('[重试发送消息] 等待重试', {
          robotId,
          attempt,
          delay: finalDelay,
          nextAttempt: attempt + 1
        });

        // 延迟等待
        await new Promise(resolve => setTimeout(resolve, finalDelay));
      }
    }

    // 理论上不应该到这里
    throw lastError;
  }

  /**
   * 判断错误是否可重试
   * @param {Error} error - 错误对象
   * @param {Array<number>} retryableStatusCodes - 可重试的HTTP状态码
   * @returns {boolean} 是否可重试
   */
  isRetryableError(error, retryableStatusCodes) {
    // 网络错误（超时、连接失败等）
    if (error.name === 'AbortError' || 
        error.name === 'ETIMEDOUT' || 
        error.name === 'ECONNRESET' ||
        error.name === 'ENOTFOUND' ||
        error.name === 'ECONNREFUSED') {
      return true;
    }

    // HTTP 错误
    if (error.response?.status) {
      return retryableStatusCodes.includes(error.response.status);
    }

    // 其他错误不重试
    return false;
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

  /**
   * 计算回复延迟（模拟人工响应时间）
   * @param {object} options - 延迟计算参数
   * @param {string} options.intent - 意图类型（chat, service, help, risk, spam, welcome, admin）
   * @param {string} options.priority - 优先级（P0, P1, P2, P3）
   * @param {string} options.sentiment - 情感类型（positive, neutral, negative）
   * @param {string} options.sentimentIntensity - 情感强度（low, medium, high）
   * @returns {number} 延迟时间（毫秒）
   */
  calculateReplyDelay(options = {}) {
    const { intent = 'chat', priority = 'P3', sentiment = 'neutral', sentimentIntensity = 'medium' } = options;

    // 基础延迟（根据优先级）
    const priorityDelay = {
      'P0': 1000,   // 紧急：1秒
      'P1': 2000,   // 高优先级：2秒
      'P2': 3000,   // 中优先级：3秒
      'P3': 5000    // 低优先级：5秒
    };

    // 意图类型延迟系数
    const intentFactor = {
      'risk': 0.5,      // 风险内容：快速响应
      'spam': 0.8,      // 垃圾信息：略快
      'admin': 0.3,     // 管理指令：最快
      'service': 1.0,   // 服务咨询：正常
      'help': 1.0,      // 帮助请求：正常
      'welcome': 0.8,   // 欢迎：快速
      'chat': 1.2       // 闲聊：略慢，更像人工
    };

    // 情感强度延迟系数
    const sentimentFactor = {
      'low': 1.0,
      'medium': 1.0,
      'high': 0.8      // 强烈情感：快速响应
    };

    // 基础延迟
    let delay = priorityDelay[priority] || 3000;

    // 应用意图系数
    delay *= intentFactor[intent] || 1.0;

    // 应用情感系数
    delay *= sentimentFactor[sentimentIntensity] || 1.0;

    // 负面情感需要更快的响应
    if (sentiment === 'negative') {
      delay *= 0.7;
    }

    // 添加随机波动（±20%），模拟人类响应的随机性
    const randomFactor = 0.8 + Math.random() * 0.4;
    delay *= randomFactor;

    // 四舍五入到整数
    delay = Math.round(delay);

    // 确保延迟在合理范围内
    delay = Math.max(500, Math.min(delay, 10000));

    logger.info('[回复延迟计算] 计算结果', {
      intent,
      priority,
      sentiment,
      sentimentIntensity,
      delay
    });

    return delay;
  }

  /**
   * 带延迟发送消息
   * @param {string} robotId - 机器人ID
   * @param {object} message - 消息对象
   * @param {object} delayOptions - 延迟选项
   * @returns {Promise<object>} 发送结果
   */
  async sendRawMessageWithDelay(robotId, message, delayOptions = {}) {
    const delay = this.calculateReplyDelay(delayOptions);

    logger.info('[带延迟发送] 准备延迟发送', {
      robotId,
      delay,
      delayOptions
    });

    // 延迟指定时间
    await new Promise(resolve => setTimeout(resolve, delay));

    // 发送消息
    return await this.sendRawMessage(robotId, message);
  }
}

// 导出单例
const workToolApiService = new WorkToolApiService();

module.exports = workToolApiService;
