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
   * 测试机器人连接
   */
  async testRobotConnection(robotId, apiBaseUrl) {
    try {
      const url = `${apiBaseUrl.replace(/\/$/, '')}/getRobotStatus?robotId=${robotId}`;
      
      const response = await axios.get(url, {
        timeout: 10000
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          message: '连接成功',
          data: response.data.data
        };
      } else {
        return {
          success: false,
          message: response.data?.message || '连接失败',
          code: response.data?.code
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || '网络连接失败',
        error: error.code
      };
    }
  }

  /**
   * 检查机器人状态
   */
  async checkRobotStatus(robotId) {
    const robot = await this.getRobotByRobotId(robotId);
    
    if (!robot) {
      throw new Error('机器人不存在');
    }

    const result = await this.testRobotConnection(robot.robotId, robot.apiBaseUrl);
    
    // 更新机器人状态
    await this.updateRobot(robot.id, {
      status: result.success ? 'online' : 'offline',
      lastCheckAt: new Date(),
      lastError: result.success ? null : result.message
    });

    return {
      robotId: robot.robotId,
      status: result.success ? 'online' : 'offline',
      message: result.message,
      checkedAt: new Date()
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
