/**
 * 机器人指令管理 API 路由
 */

const { getDb } = require('coze-coding-dev-sdk');
const robotCommandService = require('../services/robot-command.service');
const logger = require('../services/system-logger.service');

const robotCommandApiRoutes = async function (fastify, options) {
  console.log('[robot-command.api.js] 机器人指令管理 API 路由已加载');

  // 获取指令列表
  fastify.get('/robot-commands', async (request, reply) => {
    try {
      const { robotId, status, commandType, limit = 20, offset = 0 } = request.query;
      
      const commands = await robotCommandService.getCommands({
        robotId,
        status,
        commandType,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return reply.send({
        code: 0,
        message: 'success',
        data: commands
      });
    } catch (error) {
      console.error('获取指令列表失败:', error);
      logger.error('RobotCommandAPI', '获取指令列表失败', {
        error: error.message
      });
      return reply.status(500).send({
        code: -1,
        message: '获取指令列表失败',
        error: error.message
      });
    }
  });

  // 获取指令详情
  fastify.get('/robot-commands/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const command = await robotCommandService.getCommandById(id);

      if (!command) {
        return reply.status(404).send({
          code: -1,
          message: '指令不存在'
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: command
      });
    } catch (error) {
      console.error('获取指令详情失败:', error);
      logger.error('RobotCommandAPI', '获取指令详情失败', {
        error: error.message
      });
      return reply.status(500).send({
        code: -1,
        message: '获取指令详情失败',
        error: error.message
      });
    }
  });

  // 创建指令
  fastify.post('/robot-commands', async (request, reply) => {
    try {
      const data = request.body;
      const { robotId, commandType, commandPayload, priority, maxRetries } = data;

      // 验证必填字段
      if (!robotId) {
        return reply.status(400).send({
          code: -1,
          message: '机器人ID不能为空'
        });
      }
      if (!commandType) {
        return reply.status(400).send({
          code: -1,
          message: '指令类型不能为空'
        });
      }
      if (!commandPayload) {
        return reply.status(400).send({
          code: -1,
          message: '指令数据不能为空'
        });
      }

      // 验证 JSON 格式
      if (typeof commandPayload === 'string') {
        try {
          JSON.parse(commandPayload);
        } catch (e) {
          return reply.status(400).send({
            code: -1,
            message: '指令数据必须是有效的 JSON'
          });
        }
      }

      const command = await robotCommandService.createCommand({
        robotId,
        commandType,
        commandPayload: typeof commandPayload === 'string' ? JSON.parse(commandPayload) : commandPayload,
        priority: priority || 5,
        maxRetries: maxRetries !== undefined ? maxRetries : 3
      });

      logger.info('RobotCommandAPI', '创建指令成功', {
        commandId: command.id,
        robotId,
        commandType
      });

      return reply.send({
        code: 0,
        message: '指令创建成功',
        data: command
      });
    } catch (error) {
      console.error('创建指令失败:', error);
      logger.error('RobotCommandAPI', '创建指令失败', {
        error: error.message,
        data: request.body
      });
      
      return reply.status(500).send({
        code: -1,
        message: error.message || '创建指令失败',
        error: error.message
      });
    }
  });

  // 重试指令
  fastify.post('/robot-commands/:id/retry', async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await robotCommandService.retryCommand(id);

      logger.info('RobotCommandAPI', '重试指令成功', {
        commandId: id
      });

      return reply.send({
        code: 0,
        message: '重试指令成功',
        data: result
      });
    } catch (error) {
      console.error('重试指令失败:', error);
      logger.error('RobotCommandAPI', '重试指令失败', {
        error: error.message,
        commandId: request.params.id
      });
      
      return reply.status(500).send({
        code: -1,
        message: error.message || '重试指令失败',
        error: error.message
      });
    }
  });

  // 获取队列统计信息
  fastify.get('/robot-commands/queue/stats', async (request, reply) => {
    try {
      const stats = await robotCommandService.getQueueStats();

      return reply.send({
        code: 0,
        message: 'success',
        data: stats
      });
    } catch (error) {
      console.error('获取队列统计失败:', error);
      logger.error('RobotCommandAPI', '获取队列统计失败', {
        error: error.message
      });
      
      return reply.status(500).send({
        code: -1,
        message: '获取队列统计失败',
        error: error.message
      });
    }
  });

  // 删除指令
  fastify.delete('/robot-commands/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { robotCommands, robotCommandQueue } = require('../database/schema');
      const { eq } = require('drizzle-orm');

      const db = await getDb();
      
      // 先删除队列记录
      await db.delete(robotCommandQueue).where(eq(robotCommandQueue.commandId, id));
      
      // 再删除指令记录
      const deleted = await db.delete(robotCommands).where(eq(robotCommands.id, id)).returning();

      if (deleted.length === 0) {
        return reply.status(404).send({
          code: -1,
          message: '指令不存在'
        });
      }

      logger.info('RobotCommandAPI', '删除指令成功', {
        commandId: id
      });

      return reply.send({
        code: 0,
        message: '删除指令成功',
        data: deleted[0]
      });
    } catch (error) {
      console.error('删除指令失败:', error);
      logger.error('RobotCommandAPI', '删除指令失败', {
        error: error.message
      });
      
      return reply.status(500).send({
        code: -1,
        message: '删除指令失败',
        error: error.message
      });
    }
  });
};

module.exports = robotCommandApiRoutes;
