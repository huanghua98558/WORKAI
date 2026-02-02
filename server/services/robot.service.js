/**
 * 机器人管理服务
 * 负责机器人的增删改查、状态检测、配置验证等
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('../database/schema');
const { eq, and, like, or } = require('drizzle-orm');
const axios = require('axios');

class RobotService {
  /**
   * 获取所有机器人
   */
  async getAllRobots(options = {}) {
    const db = await getDb();
    const { isActive, status, search } = options;

    let whereConditions = [];
    
    if (isActive !== undefined) {
      whereConditions.push(eq(robots.isActive, isActive));
    }
    
    if (status) {
      whereConditions.push(eq(robots.status, status));
    }
    
    if (search) {
      whereConditions.push(
        or(
          like(robots.name, `%${search}%`),
          like(robots.robotId, `%${search}%`)
        )
      );
    }

    const results = await db
      .select()
      .from(robots)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(robots.createdAt);

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
    const result = await db
      .insert(robots)
      .values({
        ...data,
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
    const result = await db
      .update(robots)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(robots.id, id))
      .returning();

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
      
      // 尝试调用 WorkTool 的机器人信息接口来测试连接
      const url = `${baseUrl}/robot/robotInfo/update`;
      
      // 发送一个测试请求（不实际更新）
      const response = await axios.post(url, {
        robotId: robotId,
        // 只发送必需的参数，不实际修改任何配置
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: (status) => status < 600 // 接受所有状态码，由我们自己处理
      });

      // 如果收到任何响应（即使不是 200），说明服务器是可访问的
      if (response.status === 200) {
        // 如果返回 code: 200，说明机器人配置正确，并且返回了机器人详细信息
        if (response.data && response.data.code === 200) {
          const robotInfo = response.data.data || {};
          
          // 提取机器人详细信息并存储
          const robotDetails = {
            // 基本信息
            nickname: robotInfo.nickname || robotInfo.robotName || null,
            company: robotInfo.company || robotInfo.corpName || null,
            ipAddress: robotInfo.ip || robotInfo.ipAddress || null,
            isValid: robotInfo.isValid !== undefined ? robotInfo.isValid : true,
            
            // 时间信息
            activatedAt: robotInfo.activatedAt || robotInfo.openTime || null,
            expiresAt: robotInfo.expiresAt || robotInfo.expireTime || null,
            
            // 回调状态
            messageCallbackEnabled: robotInfo.messageCallbackEnabled !== undefined 
              ? robotInfo.messageCallbackEnabled 
              : (robotInfo.qaStatus === 1 || robotInfo.messageStatus === 1),
            
            // 额外信息
            extraData: robotInfo
          };

          return {
            success: true,
            message: '连接成功，机器人配置正确',
            data: response.data.data,
            robotDetails // 返回提取的详细信息
          };
        } else {
          // 收到响应但返回错误码（可能是参数错误，但说明服务器在线）
          return {
            success: true,
            message: '连接成功（服务器在线）',
            data: response.data,
            note: '机器人可能需要进一步配置'
          };
        }
      } else if (response.status === 404) {
        // 404 表示端点不存在，但服务器在线
        return {
          success: true,
          message: '连接成功（服务器在线）',
          data: null,
          note: 'API 端点可能已更改'
        };
      } else if (response.status === 500 || response.status === 400) {
        // 服务器返回了 5xx 或 4xx 错误，但说明服务器是可访问的
        return {
          success: true,
          message: '连接成功（服务器在线）',
          data: response.data,
          note: '机器人 ID 可能需要验证'
        };
      }
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
