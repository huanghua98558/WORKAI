/**
 * 机器人管理 API 路由
 */

const robotService = require('../services/robot.service');

const robotApiRoutes = async function (fastify, options) {
  console.log('[robot.api.js] 机器人管理 API 路由已加载');
  const config = require('../lib/config');
  
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

  // 获取机器人的回调地址
  fastify.get('/robots/:id/callback-url', async (request, reply) => {
    try {
      const { id } = request.params;
      const robot = await robotService.getRobotById(id);

      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 从请求头或配置获取回调基础地址
      let callbackBaseUrl = request.headers['x-callback-base-url'];

      if (!callbackBaseUrl) {
        // 尝试从环境变量或配置文件获取
        callbackBaseUrl = process.env.CALLBACK_BASE_URL || process.env.DEPLOYMENT_CALLBACK_BASE_URL;
      }

      if (!callbackBaseUrl) {
        return reply.status(400).send({
          code: -1,
          message: '未配置回调基础地址'
        });
      }

      // 生成回调地址
      const callbackUrl = `${callbackBaseUrl}/api/worktool/callback/message?robotId=${robot.robotId}`;

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          callbackUrl,
          robotId: robot.robotId
        }
      });
    } catch (error) {
      console.error('获取回调地址失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取回调地址失败',
        error: error.message
      });
    }
  });

  // 配置机器人回调地址到 WorkTool
  fastify.post('/robots/:id/config-callback', async (request, reply) => {
    try {
      const { id } = request.params;
      const robot = await robotService.getRobotById(id);

      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 获取回调基础地址
      let callbackBaseUrl = process.env.CALLBACK_BASE_URL || process.env.DEPLOYMENT_CALLBACK_BASE_URL;

      if (!callbackBaseUrl) {
        // 从请求体获取
        if (request.body.callbackBaseUrl) {
          callbackBaseUrl = request.body.callbackBaseUrl;
        } else {
          return reply.status(400).send({
            code: -1,
            message: '未配置回调基础地址'
          });
        }
      }

      // 生成回调地址
      const callbackUrl = `${callbackBaseUrl}/api/worktool/callback/message?robotId=${robot.robotId}`;

      // 调用 WorkTool 配置接口
      const axios = require('axios');

      // 从 apiBaseUrl 提取基础地址（去除 /wework/ 等路径）
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const updateUrl = `${baseUrl}/robot/robotInfo/update`;

      const response = await axios.post(updateUrl, {
        openCallback: 1,
        replyAll: '1',  // 注意：根据文档，replyAll 是字符串类型
        callbackUrl: callbackUrl
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          robotId: robot.robotId
        },
        timeout: 10000
      });

      // WorkTool API 返回 code=200 表示成功
      if (response.data && response.data.code === 200) {
        // 更新机器人状态
        await robotService.updateRobot(id, {
          status: 'online',
          lastCheckAt: new Date()
        });

        return reply.send({
          code: 0,
          message: '配置成功',
          data: {
            callbackUrl,
            robotId: robot.robotId
          }
        });
      } else {
        return reply.status(500).send({
          code: -1,
          message: '配置失败',
          error: response.data?.message || '未知错误'
        });
      }
    } catch (error) {
      console.error('配置回调地址失败:', error);

      if (error.response) {
        return reply.status(error.response.status).send({
          code: -1,
          message: '配置失败',
          error: error.response.data?.message || error.message
        });
      }

      return reply.status(500).send({
        code: -1,
        message: '配置失败',
        error: error.message
      });
    }
  });

  // 查询机器人回调配置
  fastify.get('/robots/:id/callback-config', async (request, reply) => {
    try {
      const { id } = request.params;
      const robot = await robotService.getRobotById(id);

      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 调用 WorkTool 查询接口
      const axios = require('axios');
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const queryUrl = `${baseUrl}/robot/robotInfo/callBack/get`;

      const response = await axios.get(queryUrl, {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          robotId: robot.robotId
        },
        timeout: 10000
      });

      // WorkTool API 返回 code=200 表示成功
      if (response.data && response.data.code === 200) {
        // 回调类型映射
        const callbackTypeMap = {
          0: '群二维码回调',
          1: '指令消息回调',
          5: '机器人上线回调',
          6: '机器人下线回调',
          11: '消息回调'
        };

        // 格式化回调配置数据
        const callbacks = (response.data.data || []).map(callback => ({
          callbackType: callback.type,
          callbackTypeName: callback.typeName || callbackTypeMap[callback.type] || `类型${callback.type}`,
          callbackUrl: callback.callBackUrl
        }));

        return reply.send({
          code: 0,
          message: '查询成功',
          data: callbacks
        });
      } else {
        return reply.status(500).send({
          code: -1,
          message: '查询失败',
          error: response.data?.message || '未知错误'
        });
      }
    } catch (error) {
      console.error('查询回调配置失败:', error);

      if (error.response) {
        return reply.status(error.response.status).send({
          code: -1,
          message: '查询失败',
          error: error.response.data?.message || error.message
        });
      }

      return reply.status(500).send({
        code: -1,
        message: '查询失败',
        error: error.message
      });
    }
  });
};

module.exports = robotApiRoutes;
