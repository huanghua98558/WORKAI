/**
 * 机器人管理 API 路由
 */

const robotService = require('../services/robot.service');

const robotApiRoutes = async function (fastify, options) {
  console.log('[robot.api.js] 机器人管理 API 路由已加载');
  
  // 获取所有机器人
  fastify.get('/robots', async (request, reply) => {
    try {
      const { isActive, status, search } = request.query;
      const robotList = await robotService.getAllRobots({ isActive, status, search });
      
      return reply.send({
        code: 0,
        message: 'success',
        data: robotList
      });
    } catch (error) {
      console.error('获取机器人列表失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取机器人列表失败',
        error: error.message
      });
    }
  });

  // 根据 ID 获取机器人
  fastify.get('/robots/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const robot = await robotService.getRobotById(id);
      
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: robot
      });
    } catch (error) {
      console.error('获取机器人信息失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取机器人信息失败',
        error: error.message
      });
    }
  });

  // 根据 robotId 获取机器人
  fastify.get('/robots/by-robot-id/:robotId', async (request, reply) => {
    try {
      const { robotId } = request.params;
      const robot = await robotService.getRobotByRobotId(robotId);
      
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: robot
      });
    } catch (error) {
      console.error('获取机器人信息失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取机器人信息失败',
        error: error.message
      });
    }
  });

  // 添加机器人
  fastify.post('/robots', async (request, reply) => {
    try {
      const data = request.body;
      
      // 验证配置
      const validation = await robotService.validateRobotConfig(data.robotId, data.apiBaseUrl);
      if (!validation.valid) {
        return reply.status(400).send({
          code: -1,
          message: '配置验证失败',
          errors: validation.errors
        });
      }

      // 检查 robotId 是否已存在
      const existingRobot = await robotService.getRobotByRobotId(data.robotId);
      if (existingRobot) {
        return reply.status(400).send({
          code: -1,
          message: '机器人 ID 已存在'
        });
      }

      const robot = await robotService.addRobot(data);
      
      return reply.send({
        code: 0,
        message: '添加成功',
        data: robot
      });
    } catch (error) {
      console.error('添加机器人失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '添加机器人失败',
        error: error.message
      });
    }
  });

  // 更新机器人
  fastify.put('/robots/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;

      // 验证配置
      if (data.robotId || data.apiBaseUrl) {
        const validation = await robotService.validateRobotConfig(
          data.robotId,
          data.apiBaseUrl
        );
        if (!validation.valid) {
          return reply.status(400).send({
            code: -1,
            message: '配置验证失败',
            errors: validation.errors
          });
        }
      }

      // 检查 robotId 是否已被其他机器人使用
      if (data.robotId) {
        const existingRobot = await robotService.getRobotByRobotId(data.robotId);
        if (existingRobot && existingRobot.id !== id) {
          return reply.status(400).send({
            code: -1,
            message: '机器人 ID 已被其他机器人使用'
          });
        }
      }

      const robot = await robotService.updateRobot(id, data);
      
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      return reply.send({
        code: 0,
        message: '更新成功',
        data: robot
      });
    } catch (error) {
      console.error('更新机器人失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '更新机器人失败',
        error: error.message
      });
    }
  });

  // 删除机器人
  fastify.delete('/robots/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const robot = await robotService.deleteRobot(id);
      
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      return reply.send({
        code: 0,
        message: '删除成功',
        data: robot
      });
    } catch (error) {
      console.error('删除机器人失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '删除机器人失败',
        error: error.message
      });
    }
  });

  // 验证机器人配置
  fastify.post('/robots/validate', async (request, reply) => {
    try {
      const { robotId, apiBaseUrl } = request.body;
      
      const validation = await robotService.validateRobotConfig(robotId, apiBaseUrl);
      
      return reply.send({
        code: 0,
        message: validation.valid ? '配置有效' : '配置无效',
        data: validation
      });
    } catch (error) {
      console.error('验证配置失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '验证配置失败',
        error: error.message
      });
    }
  });

  // 测试机器人连接
  fastify.post('/robots/test', async (request, reply) => {
    try {
      const { robotId, apiBaseUrl } = request.body;
      
      const result = await robotService.testRobotConnection(robotId, apiBaseUrl);
      
      return reply.send({
        code: result.success ? 0 : -1,
        message: result.message,
        data: result
      });
    } catch (error) {
      console.error('测试连接失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '测试连接失败',
        error: error.message
      });
    }
  });

  // 检查机器人状态
  fastify.post('/robots/:robotId/check-status', async (request, reply) => {
    try {
      const { robotId } = request.params;
      
      const result = await robotService.checkRobotStatus(robotId);
      
      return reply.send({
        code: 0,
        message: '检查完成',
        data: result
      });
    } catch (error) {
      console.error('检查状态失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '检查状态失败',
        error: error.message
      });
    }
  });

  // 批量检查所有启用的机器人状态
  fastify.post('/robots/check-all', async (request, reply) => {
    try {
      const results = await robotService.checkAllActiveRobots();
      
      return reply.send({
        code: 0,
        message: '批量检查完成',
        data: results
      });
    } catch (error) {
      console.error('批量检查失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '批量检查失败',
        error: error.message
      });
    }
  });

  // 获取默认启用的机器人
  fastify.get('/robots/default', async (request, reply) => {
    try {
      const robot = await robotService.getDefaultActiveRobot();
      
      return reply.send({
        code: 0,
        message: 'success',
        data: robot
      });
    } catch (error) {
      console.error('获取默认机器人失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取默认机器人失败',
        error: error.message
      });
    }
  });
};

module.exports = robotApiRoutes;
