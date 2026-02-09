/**
 * WorkTool 机器人管理 API 路由
 * 用于调用 WorkTool 的机器人管理 API
 */

const worktoolRobotRoutes = async function (fastify, options) {
  const { authMiddleware, checkAdmin } = require('../middleware/auth.middleware');
  const worktoolApiService = require('../services/worktool-api.service');
  const robotService = require('../services/robot.service');

  const successResponse = (data = {}, message = 'success') => ({
    code: 0,
    message: message,
    data
  });

  const errorResponse = (code = -1, message = 'error', data = null) => ({
    code,
    message: message,
    data
  });

  /**
   * 1. 发送消息给企业微信用户
   * POST /api/worktool/robot/send-message
   */
  fastify.post('/send-message', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId, toName, content, messageType = 1 } = request.body;

      if (!robotId) {
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      if (!toName) {
        return reply.status(400).send(errorResponse(400, '缺少 toName 参数'));
      }

      if (!content) {
        return reply.status(400).send(errorResponse(400, '缺少 content 参数'));
      }

      // 调用 WorkTool API 发送消息
      const result = await worktoolApiService.sendRawMessage(robotId, {
        toName,
        content,
        messageType
      });

      reply.send(successResponse(result, '消息发送成功'));
    } catch (error) {
      console.error('发送消息失败:', error);
      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 2. 获取机器人信息
   * GET /api/worktool/robot/info
   */
  fastify.get('/info', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId } = request.query;

      if (!robotId) {
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 调用 WorkTool API 获取机器人信息
      const robotInfo = await worktoolApiService.getRobotInfo(robotId);

      reply.send(successResponse(robotInfo, '获取机器人信息成功'));
    } catch (error) {
      console.error('获取机器人信息失败:', error);
      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 3. 查询机器人是否在线
   * GET /api/worktool/robot/online-status
   */
  fastify.get('/online-status', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId } = request.query;

      if (!robotId) {
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 调用 WorkTool API 查询机器人在线状态
      const isOnline = await worktoolApiService.isRobotOnline(robotId);

      reply.send(successResponse({ isOnline }, '查询机器人在线状态成功'));
    } catch (error) {
      console.error('查询机器人在线状态失败:', error);
      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 4. 查询机器人登录日志
   * GET /api/worktool/robot/login-logs
   */
  fastify.get('/login-logs', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId, page = 1, pageSize = 10 } = request.query;

      if (!robotId) {
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 调用 WorkTool API 查询登录日志
      const logs = await worktoolApiService.getRobotLoginLogs(robotId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });

      reply.send(successResponse(logs, '查询登录日志成功'));
    } catch (error) {
      console.error('查询登录日志失败:', error);
      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 5. 查询指令消息列表
   * GET /api/worktool/robot/command-messages
   */
  fastify.get('/command-messages', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId, page = 1, pageSize = 10 } = request.query;

      if (!robotId) {
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 调用 WorkTool API 查询指令消息
      const messages = await worktoolApiService.listRawMessages(robotId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });

      reply.send(successResponse(messages, '查询指令消息成功'));
    } catch (error) {
      console.error('查询指令消息失败:', error);
      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 6. 查询指令执行结果
   * GET /api/worktool/robot/command-results
   */
  fastify.get('/command-results', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId, page = 1, pageSize = 10 } = request.query;

      if (!robotId) {
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 调用 WorkTool API 查询指令执行结果
      const results = await worktoolApiService.getCommandResults(robotId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });

      reply.send(successResponse(results, '查询指令执行结果成功'));
    } catch (error) {
      console.error('查询指令执行结果失败:', error);
      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 7. 查询消息回调日志
   * GET /api/worktool/robot/message-logs
   */
  fastify.get('/message-logs', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId, page = 1, pageSize = 10 } = request.query;

      if (!robotId) {
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      // 调用 WorkTool API 查询消息回调日志
      const logs = await worktoolApiService.getMessageCallbackLogs(robotId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });

      reply.send(successResponse(logs, '查询消息回调日志成功'));
    } catch (error) {
      console.error('查询消息回调日志失败:', error);
      reply.status(500).send(errorResponse(500, error.message));
    }
  });

  /**
   * 8. 更新机器人信息（后端通讯加密地址）
   * POST /api/worktool/robot/update-info
   */
  fastify.post('/update-info', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId, robotInfo } = request.body;

      if (!robotId) {
        return reply.status(400).send(errorResponse(400, '缺少 robotId 参数'));
      }

      if (!robotInfo) {
        return reply.status(400).send(errorResponse(400, '缺少 robotInfo 参数'));
      }

      // 调用 WorkTool API 更新机器人信息
      const result = await worktoolApiService.updateRobotInfo(robotId, robotInfo);

      reply.send(successResponse(result, '更新机器人信息成功'));
    } catch (error) {
      console.error('更新机器人信息失败:', error);
      reply.status(500).send(errorResponse(500, error.message));
    }
  });
};

module.exports = worktoolRobotRoutes;
