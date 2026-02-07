/**
 * 获取转化客服机器人
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('../../database/schema');
const { eq, and } = require('drizzle-orm');
const { successResponse, errorResponse } = require('../lib/utils');
const logger = require('../services/system-logger.service');

/**
 * 获取转化客服机器人（用于发送视频号二维码）
 */
async function getConversionRobotRoute(fastify) {
  fastify.get('/api/worktool/conversion-robot', async (request, reply) => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('WorkTool', '开始获取转化客服机器人', {
        requestId,
        timestamp: new Date().toISOString()
      });

      const db = await getDb();

      // 查询转化客服机器人
      // 假设机器人的config中包含role信息，role为'conversion'的是转化客服
      const robotList = await db
        .select()
        .from(robots)
        .where(
          and(
            eq(robots.status, 'active'),
            eq(robots.robotType, 'wechat')
          )
        )
        .limit(10);

      // 从机器人列表中找到转化客服机器人
      const conversionRobot = robotList.find(robot => {
        const config = robot.config || {};
        return config.role === 'conversion' || robot.name.includes('转化') || robot.name.includes('客服');
      });

      if (!conversionRobot) {
        logger.warn('WorkTool', '未找到转化客服机器人', {
          requestId,
          availableRobots: robotList.map(r => ({ id: r.id, name: r.name, config: r.config }))
        });

        return reply.status(404).send(errorResponse(404, '未找到转化客服机器人，请在系统中配置转化客服机器人'));
      }

      // 获取机器人的WorkTool配置
      const config = conversionRobot.config || {};
      const worktoolConfig = config.worktool || {};

      // 确保有apiBaseUrl和robotId
      if (!worktoolConfig.apiBaseUrl || !worktoolConfig.robotId) {
        logger.warn('WorkTool', '转化客服机器人配置不完整', {
          requestId,
          robotId: conversionRobot.id,
          hasApiBaseUrl: !!worktoolConfig.apiBaseUrl,
          hasRobotId: !!worktoolConfig.robotId
        });

        return reply.status(500).send(errorResponse(500, '转化客服机器人配置不完整，缺少apiBaseUrl或robotId'));
      }

      logger.info('WorkTool', '获取转化客服机器人成功', {
        requestId,
        robotId: conversionRobot.id,
        robotName: conversionRobot.name,
        worktoolRobotId: worktoolConfig.robotId
      });

      return reply.send(successResponse({
        id: conversionRobot.id,
        name: conversionRobot.name,
        worktoolRobotId: worktoolConfig.robotId,
        apiBaseUrl: worktoolConfig.apiBaseUrl,
        defaultGroupName: worktoolConfig.defaultGroupName || '' // 默认发送的群名
      }, '获取成功'));
    } catch (error) {
      logger.error('WorkTool', '获取转化客服机器人异常', {
        requestId,
        error: error.message,
        stack: error.stack,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      });

      return reply.status(500).send(errorResponse(500, error.message));
    }
  });
}

module.exports = getConversionRobotRoute;
