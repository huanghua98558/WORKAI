/**
 * 机器人信息同步 API
 * 从 WorkTool API 同步机器人信息到本地数据库
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('../database/schema');
const { eq, desc } = require('drizzle-orm');
const worktoolService = require('../services/worktool.service');
const logger = require('../services/system-logger.service');

async function robotSyncRoutes(fastify, options) {
  /**
   * 同步单个机器人信息
   * GET /api/admin/robots/:id/sync
   */
  fastify.get('/robots/:id/sync', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();

      // 获取机器人信息
      const robotList = await db
        .select()
        .from(robots)
        .where(eq(robots.id, id))
        .limit(1);

      if (robotList.length === 0) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      const robot = robotList[0];

      // 从 WorkTool API 获取最新信息
      const result = await worktoolService.getRobotInfo(robot.robotId);

      if (!result.success) {
        logger.error('RobotSync', '从 WorkTool API 获取信息失败', {
          robotId: robot.robotId,
          error: result.message
        });
        return reply.status(500).send({
          code: -1,
          message: result.message || '获取机器人信息失败'
        });
      }

      // 更新数据库
      const apiData = result.data;
      const updateData = {
        nickname: apiData.name || robot.nickname,
        company: apiData.corporation || robot.company,
        messageCallbackEnabled: apiData.openCallback === 1,
        updatedAt: new Date()
      };

      // 更新机器人信息
      await db
        .update(robots)
        .set(updateData)
        .where(eq(robots.id, id));

      logger.info('RobotSync', '机器人信息同步成功', {
        robotId: robot.robotId,
        updateData
      });

      // 返回更新后的信息
      const updatedRobot = await db
        .select()
        .from(robots)
        .where(eq(robots.id, id))
        .limit(1);

      return reply.send({
        code: 0,
        message: '同步成功',
        data: updatedRobot[0]
      });
    } catch (error) {
      logger.error('RobotSync', '同步机器人信息失败', {
        error: error.message,
        stack: error.stack
      });

      return reply.status(500).send({
        code: -1,
        message: error.message || '同步失败'
      });
    }
  });

  /**
   * 批量同步所有机器人信息
   * POST /api/admin/robots/sync-all
   */
  fastify.post('/robots/sync-all', async (request, reply) => {
    try {
      const db = await getDb();

      // 获取所有启用的机器人
      const robotList = await db
        .select()
        .from(robots)
        .where(eq(robots.isActive, true));

      const results = {
        total: robotList.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // 逐个同步
      for (const robot of robotList) {
        try {
          const result = await worktoolService.getRobotInfo(robot.robotId);

          if (result.success) {
            const apiData = result.data;
            const updateData = {
              nickname: apiData.name || robot.nickname,
              company: apiData.corporation || robot.company,
              messageCallbackEnabled: apiData.openCallback === 1,
              updatedAt: new Date()
            };

            await db
              .update(robots)
              .set(updateData)
              .where(eq(robots.id, robot.id));

            results.success++;
            logger.info('RobotSync', '机器人信息同步成功', {
              robotId: robot.robotId,
              robotName: robot.name
            });
          } else {
            results.failed++;
            results.errors.push({
              robotId: robot.robotId,
              robotName: robot.name,
              error: result.message
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            robotId: robot.robotId,
            robotName: robot.name,
            error: error.message
          });
          logger.error('RobotSync', '同步失败', {
            robotId: robot.robotId,
            error: error.message
          });
        }
      }

      logger.info('RobotSync', '批量同步完成', {
        total: results.total,
        success: results.success,
        failed: results.failed
      });

      return reply.send({
        code: 0,
        message: '批量同步完成',
        data: results
      });
    } catch (error) {
      logger.error('RobotSync', '批量同步失败', {
        error: error.message,
        stack: error.stack
      });

      return reply.status(500).send({
        code: -1,
        message: error.message || '批量同步失败'
      });
    }
  });
}

module.exports = robotSyncRoutes;
