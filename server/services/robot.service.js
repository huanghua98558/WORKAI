/**
 * 机器人管理服务
 * 负责机器人的增删改查、状态检测、配置验证等
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robots, apiCallLogs } = require('../database/schema');
const { eq, and, like, or, desc } = require('drizzle-orm');
const axios = require('axios');
const { getLogger } = require('../lib/logger');
const cacheService = require('../lib/cache');

class RobotService {
  constructor() {
    this.logger = getLogger('ROBOT');
    this.cachePrefix = 'robots:'; // 缓存前缀
    this.cacheTTL = 300; // 5分钟过期
  }
  /**
   * 生成机器人的回调地址和通讯地址
   */
  generateRobotUrls(robotId, apiBaseUrl, callbackBaseUrl) {
    // 从 apiBaseUrl 提取基础地址
    const baseUrl = apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');

    // 回调地址（5个）
    const messageCallbackUrl = `${callbackBaseUrl}/api/worktool/callback/message?robotId=${robotId}`;
    const resultCallbackUrl = `${callbackBaseUrl}/api/worktool/callback/result?robotId=${robotId}`;
    const qrcodeCallbackUrl = `${callbackBaseUrl}/api/worktool/callback/qrcode?robotId=${robotId}`;
    const onlineCallbackUrl = `${callbackBaseUrl}/api/worktool/callback/status?robotId=${robotId}`;
    const offlineCallbackUrl = `${callbackBaseUrl}/api/worktool/callback/status?robotId=${robotId}`;

    // 通讯地址（8个）
    const sendMessageApi = `${baseUrl}/wework/sendRawMessage?robotId=${robotId}`;
    const updateApi = `${baseUrl}/robot/robotInfo/update?robotId=${robotId}`;
    const getInfoApi = `${baseUrl}/robot/robotInfo/get?robotId=${robotId}`;
    const onlineApi = `${baseUrl}/robot/robotInfo/online?robotId=${robotId}`;
    const onlineInfosApi = `${baseUrl}/robot/robotInfo/onlineInfos?robotId=${robotId}`;
    const listRawMessageApi = `${baseUrl}/wework/listRawMessage?robotId=${robotId}`;
    const rawMsgListApi = `${baseUrl}/robot/rawMsg/list?robotId=${robotId}`;
    const qaLogListApi = `${baseUrl}/robot/qaLog/list?robotId=${robotId}`;

    return {
      // 回调地址
      messageCallbackUrl,
      resultCallbackUrl,
      qrcodeCallbackUrl,
      onlineCallbackUrl,
      offlineCallbackUrl,

      // 通讯地址
      sendMessageApi,
      updateApi,
      getInfoApi,
      onlineApi,
      onlineInfosApi,
      listRawMessageApi,
      rawMsgListApi,
      qaLogListApi,

      callbackBaseUrl
    };
  }

  /**
   * 测试API接口
   */
  async testApiEndpoint(robotId, apiType, apiUrl, httpMethod = 'GET', requestParams = {}, requestBody = {}) {
    const startTime = Date.now();
    let responseStatus, responseData, errorMessage, success;

    this.logger.debug('开始测试API接口', {
      robotId,
      apiType,
      httpMethod,
      url: apiUrl
    });

    try {
      let response;

      if (httpMethod === 'GET') {
        response = await axios.get(apiUrl, {
          params: requestParams,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
      } else if (httpMethod === 'POST') {
        response = await axios.post(apiUrl, requestBody, {
          params: requestParams,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
      } else {
        throw new Error(`不支持的 HTTP 方法: ${httpMethod}`);
      }

      responseStatus = response.status;
      responseData = response.data;
      success = response.data?.code === 200 || response.data?.code === 0;

      if (!success) {
        errorMessage = responseData?.message || 'API 返回错误';
      }

      this.logger.debug('API接口测试成功', {
        robotId,
        apiType,
        status: responseStatus,
        success
      });
    } catch (error) {
      responseStatus = error.response?.status || 0;
      errorMessage = error.message;
      success = false;
      responseData = error.response?.data || null;

      this.logger.warn('API接口测试失败', {
        robotId,
        apiType,
        httpMethod,
        error: error.message,
        status: responseStatus
      });
    }

    const responseTime = Date.now() - startTime;

    // 记录日志
    try {
      const db = await getDb();
      await db.insert(apiCallLogs).values({
        robotId,
        apiType,
        apiUrl,
        httpMethod,
        requestParams,
        requestBody,
        responseStatus,
        responseData,
        responseTime,
        success,
        errorMessage,
        createdAt: new Date()
      });

      // 记录性能日志
      await this.logger.performance('API调用', responseTime, {
        robotId,
        apiType,
        httpMethod,
        success,
        statusCode: responseStatus
      });
    } catch (logError) {
      this.logger.error('记录API调用日志失败', {
        error: logError.message,
        robotId,
        apiType
      });
    }

    return {
      success,
      responseStatus,
      responseData,
      errorMessage,
      responseTime
    };
  }

  /**
   * 获取所有机器人（带缓存）
   * @param {Object} options - 查询选项
   * @param {boolean} options.isActive - 是否激活
   * @param {string} options.status - 状态
   * @param {string} options.search - 搜索关键词
   * @param {number} options.limit - 限制数量
   * @param {number} options.offset - 偏移量
   * @param {Array<string>} options.accessibleRobotIds - 可访问的机器人ID列表（权限过滤）
   */
  async getAllRobots(options = {}) {
    // 生成缓存键
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(options)}`;

    // 尝试从缓存获取
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('从缓存获取机器人列表', { cacheKey });
      return cached;
    }

    // 从数据库查询
    const db = await getDb();
    const { isActive, status, search, limit = 100, offset = 0, accessibleRobotIds } = options;

    let whereConditions = [];

    // 添加激活状态过滤
    if (isActive !== undefined) {
      whereConditions.push(eq(robots.isActive, isActive));
    }

    // 添加状态过滤
    if (status) {
      whereConditions.push(eq(robots.status, status));
    }

    // 添加搜索过滤
    if (search) {
      whereConditions.push(
        or(
          like(robots.name, `%${search}%`),
          like(robots.robotId, `%${search}%`)
        )
      );
    }

    // 添加权限过滤（只返回可访问的机器人）
    if (accessibleRobotIds && Array.isArray(accessibleRobotIds) && accessibleRobotIds.length > 0) {
      const { sql } = require('drizzle-orm');
      whereConditions.push(sql`${robots.id} IN ${accessibleRobotIds}`);
    }

    const results = await db
      .select()
      .from(robots)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(robots.createdAt))
      .limit(limit)
      .offset(offset);

    // 写入缓存
    await cacheService.set(cacheKey, results, this.cacheTTL);
    this.logger.debug('机器人列表已缓存', { cacheKey, count: results.length });

    return results;
  }

  /**
   * 根据 ID 获取机器人
   */
  async getRobotById(id) {
    const db = await getDb();
    const results = await db
      .select()
      .from(robots)
      .where(eq(robots.id, id))
      .limit(1);

    return results[0] || null;
  }

  /**
   * 根据 robotId 获取机器人
   */
  async getRobotByRobotId(robotId) {
    const db = await getDb();
    const results = await db
      .select()
      .from(robots)
      .where(eq(robots.robotId, robotId))
      .limit(1);

    return results[0] || null;
  }

  /**
   * 添加机器人
   */
  async addRobot(data) {
    const db = await getDb();

    // 生成回调地址和通讯地址
    const urls = this.generateRobotUrls(
      data.robotId,
      data.apiBaseUrl,
      data.callbackBaseUrl || process.env.CALLBACK_BASE_URL || 'http://localhost:5000'
    );

    const result = await db
      .insert(robots)
      .values({
        ...data,
        ...urls,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return result[0];
  }

  /**
   * 更新机器人
   */
  async updateRobot(id, data) {
    const db = await getDb();

    let updateData = {
      ...data,
      updatedAt: new Date()
    };

    // 如果更新了 robotId 或 apiBaseUrl，重新生成地址
    const existingRobot = await this.getRobotById(id);
    if (existingRobot) {
      if (data.robotId !== undefined && data.robotId !== existingRobot.robotId ||
          data.apiBaseUrl !== undefined && data.apiBaseUrl !== existingRobot.apiBaseUrl ||
          data.callbackBaseUrl !== undefined && data.callbackBaseUrl !== existingRobot.callbackBaseUrl) {
        const urls = this.generateRobotUrls(
          data.robotId || existingRobot.robotId,
          data.apiBaseUrl || existingRobot.apiBaseUrl,
          data.callbackBaseUrl || existingRobot.callbackBaseUrl || process.env.CALLBACK_BASE_URL || 'http://localhost:5000'
        );
        updateData = {
          ...updateData,
          ...urls
        };
      }
    }

    const result = await db
      .update(robots)
      .set(updateData)
      .where(eq(robots.id, id))
      .returning();

    // 清除机器人列表缓存
    await cacheService.delPattern(`${this.cachePrefix}list:*`);
    this.logger.info('机器人列表缓存已清除', { robotId: id });

    return result[0];
  }

  /**
   * 删除机器人
   */
  async deleteRobot(id) {
    const db = await getDb();
    
    const result = await db
      .delete(robots)
      .where(eq(robots.id, id))
      .returning();

    // 清除机器人列表缓存
    await cacheService.delPattern(`${this.cachePrefix}list:*`);
    this.logger.info('机器人列表缓存已清除', { robotId: id });

    return result[0];
  }

  /**
   * 验证机器人配置
   */
  async validateRobotConfig(robotId, apiBaseUrl) {
    const errors = [];

    // 验证 robotId
    if (!robotId || robotId.trim().length === 0) {
      errors.push('机器人 ID 不能为空');
    } else if (robotId.length > 64) {
      errors.push('机器人 ID 长度不能超过 64 个字符');
    }

    // 验证 apiBaseUrl
    if (!apiBaseUrl || apiBaseUrl.trim().length === 0) {
      errors.push('API Base URL 不能为空');
    } else {
      try {
        const url = new URL(apiBaseUrl);
        if (!url.protocol.startsWith('http')) {
          errors.push('API Base URL 必须使用 HTTP 或 HTTPS 协议');
        }
      } catch (error) {
        errors.push('API Base URL 格式无效');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 测试机器人连接并获取完整信息
   */
  async testRobotConnection(robotId, apiBaseUrl) {
    try {
      // 从 apiBaseUrl 提取基础地址（去除 /wework/ 等路径）
      const baseUrl = apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      
      // 使用正确的 WorkTool API 端点
      const apiUrl = `${baseUrl}/robot/robotInfo/get`;
      
      try {
        const response = await axios.get(apiUrl, {
          params: { robotId },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
          validateStatus: (status) => status < 600
        });

        // 检查响应状态
        if (response.status === 200 || response.status === 201) {
          // 检查业务状态码
          const responseCode = response.data?.code;
          const responseMessage = response.data?.message;
          
          if (responseCode === 0 || responseCode === 200) {
            // 成功响应，提取机器人信息
            const robotInfo = response.data?.data || {};
            
            const robotDetails = {
              // 基本信息
              nickname: robotInfo.name || null,
              company: robotInfo.corporation || null,
              ipAddress: robotInfo.ip || robotInfo.ipAddress || robotInfo.serverIp || null,
              isValid: true, // API 没有返回有效性字段，默认为有效
              
              // 时间信息
              activatedAt: robotInfo.firstLogin ? new Date(robotInfo.firstLogin) : null,
              expiresAt: robotInfo.authExpir ? new Date(robotInfo.authExpir) : null,
              
              // 回调状态（openCallback: 1=开启, 0=关闭）
              messageCallbackEnabled: robotInfo.openCallback === 1,
              
              // 额外信息
              extraData: robotInfo
            };

            return {
              success: true,
              message: '连接成功，机器人信息已获取',
              data: robotInfo,
              robotDetails
            };
          } else if (responseCode === 404 || responseCode === 401) {
            // 机器人不存在或未授权
            return {
              success: false,
              message: responseMessage || '机器人不存在或未授权',
              data: response.data
            };
          } else {
            // 其他错误码
            return {
              success: false,
              message: responseMessage || `服务器返回错误: ${responseCode}`,
              data: response.data
            };
          }
        }
      } catch (apiError) {
        // API 调用失败，检查是否是网络错误
        if (apiError.code === 'ECONNREFUSED' || apiError.code === 'ETIMEDOUT' || apiError.code === 'ENOTFOUND') {
          return {
            success: false,
            message: '无法连接到 WorkTool 服务器，请检查网络和 URL 配置',
            error: apiError.message
          };
        } else if (apiError.response) {
          return {
            success: false,
            message: `服务器错误: ${apiError.response.status}`,
            data: apiError.response.data
          };
        }
      }

      // 降级处理：返回基本的连接状态
      return {
        success: false,
        message: '无法获取机器人详细信息',
        error: 'API 调用失败'
      };

    } catch (error) {
      // 检查是否是网络错误
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          message: '无法连接到服务器，请检查网络和 URL 配置',
          error: error.message
        };
      } else if (error.response) {
        // 服务器返回了错误响应
        return {
          success: false,
          message: `服务器错误: ${error.response.status}`,
          data: error.response.data
        };
      } else {
        // 其他错误
        return {
          success: false,
          message: error.message || '连接测试失败',
          error: error.code
        };
      }
    }
  }

  /**
   * 检查机器人状态并更新详细信息
   */
  async checkRobotStatus(robotId) {
    const robot = await this.getRobotByRobotId(robotId);
    
    if (!robot) {
      throw new Error('机器人不存在');
    }

    const result = await this.testRobotConnection(robot.robotId, robot.apiBaseUrl);
    
    // 更新机器人状态和详细信息
    const updateData = {
      status: result.success ? 'online' : 'offline',
      lastCheckAt: new Date(),
      lastError: result.success ? null : result.message
    };

    // 如果连接成功且返回了详细信息，则保存这些信息
    if (result.success && result.robotDetails) {
      Object.assign(updateData, result.robotDetails);
    }

    await this.updateRobot(robot.id, updateData);

    return {
      robotId: robot.robotId,
      status: result.success ? 'online' : 'offline',
      message: result.message,
      checkedAt: new Date(),
      robotDetails: result.robotDetails
    };
  }

  /**
   * 批量检查所有启用的机器人状态
   */
  async checkAllActiveRobots() {
    const activeRobots = await this.getAllRobots({ isActive: true });
    const results = [];

    for (const robot of activeRobots) {
      try {
        const result = await this.checkRobotStatus(robot.robotId);
        results.push(result);
      } catch (error) {
        results.push({
          robotId: robot.robotId,
          status: 'error',
          message: error.message
        });
      }
    }

    return results;
  }

  /**
   * 批量测试机器人的所有通讯地址
   */
  async testAllApiEndpoints(robotId) {
    const robot = await this.getRobotByRobotId(robotId);

    if (!robot) {
      throw new Error('机器人不存在');
    }

    const tests = [
      {
        apiType: 'sendMessage',
        apiUrl: robot.sendMessageApi,
        httpMethod: 'POST',
        requestBody: { socketType: 2, list: [{ type: 203, titleList: ['测试'], receivedContent: '测试消息' }] }
      },
      {
        apiType: 'update',
        apiUrl: robot.updateApi,
        httpMethod: 'POST',
        requestBody: { test: true }
      },
      {
        apiType: 'getInfo',
        apiUrl: robot.getInfoApi,
        httpMethod: 'GET'
      },
      {
        apiType: 'online',
        apiUrl: robot.onlineApi,
        httpMethod: 'GET'
      },
      {
        apiType: 'onlineInfos',
        apiUrl: robot.onlineInfosApi,
        httpMethod: 'GET'
      },
      {
        apiType: 'listRawMessage',
        apiUrl: robot.listRawMessageApi,
        httpMethod: 'GET',
        requestParams: { pageNum: 1, pageSize: 10 }
      },
      {
        apiType: 'rawMsgList',
        apiUrl: robot.rawMsgListApi,
        httpMethod: 'GET'
      },
      {
        apiType: 'qaLogList',
        apiUrl: robot.qaLogListApi,
        httpMethod: 'GET',
        requestParams: { pageNum: 1, pageSize: 10 }
      }
    ];

    const results = {};

    for (const test of tests) {
      try {
        results[test.apiType] = await this.testApiEndpoint(
          robotId,
          test.apiType,
          test.apiUrl,
          test.httpMethod,
          test.requestParams || {},
          test.requestBody || {}
        );
      } catch (error) {
        results[test.apiType] = {
          success: false,
          errorMessage: error.message,
          responseTime: 0
        };
      }
    }

    return results;
  }

  /**
   * 获取接口调用日志
   */
  async getApiCallLogs(robotId, options = {}) {
    const db = await getDb();
    const { apiType, success, limit = 50 } = options;

    let whereConditions = [eq(apiCallLogs.robotId, robotId)];

    if (apiType) {
      whereConditions.push(eq(apiCallLogs.apiType, apiType));
    }

    if (success !== undefined) {
      whereConditions.push(eq(apiCallLogs.success, success));
    }

    const results = await db
      .select()
      .from(apiCallLogs)
      .where(and(...whereConditions))
      .orderBy(apiCallLogs.createdAt)
      .limit(limit);

    return results;
  }

  /**
   * 获取默认启用的机器人
   */
  async getDefaultActiveRobot() {
    const db = await getDb();
    const results = await db
      .select()
      .from(robots)
      .where(and(eq(robots.isActive, true), eq(robots.status, 'online')))
      .orderBy(robots.createdAt)
      .limit(1);

    return results[0] || null;
  }
}

module.exports = new RobotService();
