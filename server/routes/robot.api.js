/**
 * 机器人管理 API 路由
 */

const robotService = require('../services/robot.service');
const { db } = require('../database');
const { callbackHistory, robots } = require('../database/schema');
const { eq, desc, and, gte, lte, sql, count } = require('drizzle-orm');

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
      
      if (validation.valid) {
        return reply.send({
          code: 0,
          message: '配置验证成功',
          data: validation
        });
      } else {
        return reply.status(400).send({
          code: -1,
          message: '配置验证失败',
          errors: validation.errors
        });
      }
    } catch (error) {
      console.error('验证机器人配置失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '验证机器人配置失败',
        error: error.message
      });
    }
  });

  // 测试机器人连接
  fastify.post('/robots/test', async (request, reply) => {
    try {
      const { robotId, apiBaseUrl } = request.body;
      
      if (!robotId || !apiBaseUrl) {
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数: robotId 或 apiBaseUrl'
        });
      }

      const result = await robotService.testRobotConnection(robotId, apiBaseUrl);
      
      return reply.send({
        code: result.success ? 0 : -1,
        message: result.message,
        data: result.data || null,
        robotDetails: result.robotDetails || null
      });
    } catch (error) {
      console.error('测试机器人连接失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '测试机器人连接失败',
        error: error.message
      });
    }
  });

  // 测试机器人连接并保存详细信息
  fastify.post('/robots/:id/test-and-save', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 检查机器人状态并保存详细信息
      const result = await robotService.checkRobotStatus(robot.robotId);
      
      // 返回更新后的机器人信息
      const updatedRobot = await robotService.getRobotById(id);
      
      return reply.send({
        code: 0,
        message: '测试成功，机器人信息已更新',
        data: {
          testResult: result,
          robot: updatedRobot
        }
      });
    } catch (error) {
      console.error('测试机器人连接并保存失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '测试机器人连接并保存失败',
        error: error.message
      });
    }
  });

  // 配置消息回调
  fastify.post('/robots/:id/config-callback', async (request, reply) => {
    try {
      const { id } = request.params;
      const { callbackUrl, callbackBaseType, callbackTypes, replyAll } = request.body;

      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      if (!robot.robotId) {
        return reply.status(400).send({
          code: -1,
          message: '机器人未配置 robotId'
        });
      }

      // 从请求头或环境变量获取回调基础 URL
      const xBackendUrl = request.headers['x-backend-url'];
      let callbackBaseUrl = xBackendUrl || process.env.CALLBACK_BASE_URL;

      // 如果都没有，则使用当前请求的基础路径
      if (!callbackBaseUrl) {
        const protocol = request.protocol;
        const host = request.headers.host;
        callbackBaseUrl = `${protocol}://${host}`;
      }

      // 生成回调地址
      const callbackAddress = `${callbackBaseUrl}/api/worktool/callback/message?robotId=${robot.robotId}`;

      // 获取 replyAll 参数，默认为 '1'
      const replyAllParam = replyAll || '1';

      // 调用 WorkTool 配置接口
      const axios = require('axios');

      // 从 apiBaseUrl 提取基础地址（去除 /wework/ 等路径）
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const updateUrl = `${baseUrl}/robot/robotInfo/update`;

      const response = await axios.post(updateUrl, {
        openCallback: 1,
        replyAll: String(replyAllParam),
        callbackUrl: callbackAddress
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.code === 200) {
        // 更新本地配置
        const updatedRobot = await robotService.updateRobot(id, {
          callbackUrl: callbackAddress,
          callbackConfigured: true,
          replyAll: String(replyAllParam)
        });

        return reply.send({
          code: 0,
          message: '消息回调配置成功',
          data: updatedRobot
        });
      } else {
        return reply.status(400).send({
          code: -1,
          message: 'WorkTool 配置失败',
          error: response.data
        });
      }
    } catch (error) {
      console.error('配置消息回调失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '配置消息回调失败',
        error: error.message
      });
    }
  });

  // 配置非消息回调类型（群二维码、指令结果、上线、下线）
  fastify.post('/robots/:id/config-callback-type', async (request, reply) => {
    try {
      const { id } = request.params;
      const { callbackType, callbackUrl } = request.body;

      // 验证回调类型
      const validTypes = ['0', '1', '5', '6']; // 0=群二维码, 1=指令结果, 5=上线, 6=下线
      if (!validTypes.includes(String(callbackType))) {
        return reply.status(400).send({
          code: -1,
          message: `无效的回调类型，支持的类型: ${validTypes.join(', ')}`
        });
      }

      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      if (!robot.robotId) {
        return reply.status(400).send({
          code: -1,
          message: '机器人未配置 robotId'
        });
      }

      // 如果没有提供 callbackUrl，则生成默认的回调地址
      let callbackAddress = callbackUrl;
      if (!callbackAddress) {
        const xBackendUrl = request.headers['x-backend-url'];
        let callbackBaseUrl = xBackendUrl || process.env.CALLBACK_BASE_URL;

        if (!callbackBaseUrl) {
          const protocol = request.protocol;
          const host = request.headers.host;
          callbackBaseUrl = `${protocol}://${host}`;
        }

        // 根据回调类型生成不同的回调地址
        const typeEndpoints = {
          '0': '/api/worktool/callback/group-qrcode',
          '1': '/api/worktool/callback/result',
          '5': '/api/worktool/callback/robot-status',
          '6': '/api/worktool/callback/robot-status'
        };

        callbackAddress = `${callbackBaseUrl}${typeEndpoints[callbackType]}?robotId=${robot.robotId}`;
      }

      // 调用 WorkTool 配置接口
      const axios = require('axios');

      // 从 apiBaseUrl 提取基础地址
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const updateUrl = `${baseUrl}/robot/robotInfo/update`;

      // 构建请求参数
      const params = {
        robotId: robot.robotId,
        robotType: String(callbackType),
        robotTypeUrl: callbackAddress
      };

      const response = await axios.post(updateUrl, params, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.code === 200) {
        // 更新本地配置
        const currentConfig = robot.callbackConfig || {};
        const updatedConfig = {
          ...currentConfig,
          [callbackType]: callbackAddress
        };

        const updatedRobot = await robotService.updateRobot(id, {
          callbackConfig: updatedConfig
        });

        return reply.send({
          code: 0,
          message: '回调类型配置成功',
          data: updatedRobot
        });
      } else {
        return reply.status(400).send({
          code: -1,
          message: 'WorkTool 配置失败',
          error: response.data
        });
      }
    } catch (error) {
      console.error('配置回调类型失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '配置回调类型失败',
        error: error.message
      });
    }
  });

  // 删除回调类型配置
  fastify.post('/robots/:id/delete-callback-type', async (request, reply) => {
    try {
      const { id } = request.params;
      const { callbackType } = request.body;

      // 验证回调类型
      const validTypes = ['0', '1', '5', '6'];
      if (!validTypes.includes(String(callbackType))) {
        return reply.status(400).send({
          code: -1,
          message: `无效的回调类型，支持的类型: ${validTypes.join(', ')}`
        });
      }

      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 调用 WorkTool 删除接口
      const axios = require('axios');

      // 从 apiBaseUrl 提取基础地址
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const updateUrl = `${baseUrl}/robot/robotInfo/update`;

      const response = await axios.post(updateUrl, {
        robotId: robot.robotId,
        robotType: String(callbackType),
        robotTypeUrl: ''
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.code === 200) {
        // 更新本地配置
        const currentConfig = robot.callbackConfig || {};
        delete currentConfig[callbackType];

        const updatedRobot = await robotService.updateRobot(id, {
          callbackConfig: currentConfig
        });

        return reply.send({
          code: 0,
          message: '回调类型删除成功',
          data: updatedRobot
        });
      } else {
        return reply.status(400).send({
          code: -1,
          message: 'WorkTool 删除失败',
          error: response.data
        });
      }
    } catch (error) {
      console.error('删除回调类型失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '删除回调类型失败',
        error: error.message
      });
    }
  });

  // 获取回调配置
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

      // 回调类型映射
      const callbackTypeMap = {
        '0': { name: '群二维码回调', endpoint: '/api/worktool/callback/group-qrcode' },
        '1': { name: '指令结果回调', endpoint: '/api/worktool/callback/result' },
        '5': { name: '上线回调', endpoint: '/api/worktool/callback/robot-status' },
        '6': { name: '下线回调', endpoint: '/api/worktool/callback/robot-status' },
        '11': { name: '消息回调', endpoint: '/api/worktool/callback/message' }
      };

      // 构建回调配置列表
      const callbackConfigList = [];

      // 消息回调
      if (robot.callbackConfigured && robot.callbackUrl) {
        callbackConfigList.push({
          callbackType: '11',
          callbackTypeName: callbackTypeMap['11'].name,
          callbackUrl: robot.callbackUrl,
          configured: true
        });
      } else {
        callbackConfigList.push({
          callbackType: '11',
          callbackTypeName: callbackTypeMap['11'].name,
          callbackUrl: null,
          configured: false
        });
      }

      // 其他回调类型
      const callbackConfig = robot.callbackConfig || {};
      ['0', '1', '5', '6'].forEach(type => {
        const configured = !!callbackConfig[type];
        callbackConfigList.push({
          callbackType: type,
          callbackTypeName: callbackTypeMap[type].name,
          callbackUrl: callbackConfig[type] || null,
          configured
        });
      });

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          robotId: robot.robotId,
          robotName: robot.robotName,
          callbackConfigList
        }
      });
    } catch (error) {
      console.error('获取回调配置失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取回调配置失败',
        error: error.message
      });
    }
  });

  // 获取回调历史记录
  fastify.get('/robots/:id/callback-history', async (request, reply) => {
    try {
      const { id } = request.params;
      const { type, startTime, endTime, page = 1, pageSize = 20 } = request.query;

      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 构建查询条件
      const conditions = [eq(callbackHistory.robotId, robot.robotId)];

      if (type) {
        conditions.push(eq(callbackHistory.type, String(type)));
      }

      if (startTime) {
        conditions.push(gte(callbackHistory.createdAt, new Date(startTime)));
      }

      if (endTime) {
        conditions.push(lte(callbackHistory.createdAt, new Date(endTime)));
      }

      // 计算分页
      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);

      // 查询总数
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(callbackHistory)
        .where(and(...conditions));

      // 查询数据
      const history = await db
        .select()
        .from(callbackHistory)
        .where(and(...conditions))
        .orderBy(desc(callbackHistory.createdAt))
        .limit(limit)
        .offset(offset);

      // 解析 extraData
      const formattedHistory = history.map(item => ({
        ...item,
        extraData: item.extraData ? JSON.parse(item.extraData) : null
      }));

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          list: formattedHistory,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('获取回调历史记录失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取回调历史记录失败',
        error: error.message
      });
    }
  });

  // 获取回调统计数据
  fastify.get('/robots/:id/callback-stats', async (request, reply) => {
    try {
      const { id } = request.params;
      const { timeRange = '24h' } = request.query;

      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 计算时间范围
      let startTime;
      const now = new Date();
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // 查询总数统计
      const stats = await db
        .select({
          type: callbackHistory.type,
          count: count(),
          successCount: count(sql`CASE WHEN ${callbackHistory.errorCode} = 0 THEN 1 END`),
          errorCount: count(sql`CASE WHEN ${callbackHistory.errorCode} > 0 THEN 1 END`),
          avgResponseTime: sql`AVG(${callbackHistory.responseTime})`
        })
        .from(callbackHistory)
        .where(and(
          eq(callbackHistory.robotId, robot.robotId),
          gte(callbackHistory.createdAt, startTime)
        ))
        .groupBy(callbackHistory.type);

      // 查询趋势数据（按小时）
      const trendData = await db
        .select({
          hour: sql`EXTRACT(HOUR FROM ${callbackHistory.createdAt})`,
          date: sql`DATE(${callbackHistory.createdAt})`,
          count: count(),
          errorCount: count(sql`CASE WHEN ${callbackHistory.errorCode} > 0 THEN 1 END`)
        })
        .from(callbackHistory)
        .where(and(
          eq(callbackHistory.robotId, robot.robotId),
          gte(callbackHistory.createdAt, startTime)
        ))
        .orderBy(sql`DATE(${callbackHistory.createdAt})`, sql`EXTRACT(HOUR FROM ${callbackHistory.createdAt})`);

      // 格式化统计结果
      const callbackTypeMap = {
        '0': '群二维码回调',
        '1': '指令结果回调',
        '5': '上线回调',
        '6': '下线回调',
        '11': '消息回调'
      };

      const formattedStats = stats.map(stat => ({
        type: stat.type,
        typeName: callbackTypeMap[stat.type] || `类型${stat.type}`,
        count: Number(stat.count),
        successCount: Number(stat.successCount),
        errorCount: Number(stat.errorCount),
        errorRate: stat.count > 0 ? (stat.errorCount / stat.count * 100).toFixed(2) : 0,
        avgResponseTime: stat.avgResponseTime ? Number(stat.avgResponseTime).toFixed(2) : 0
      }));

      // 计算总统计
      const totalCount = formattedStats.reduce((sum, stat) => sum + stat.count, 0);
      const totalSuccess = formattedStats.reduce((sum, stat) => sum + stat.successCount, 0);
      const totalError = formattedStats.reduce((sum, stat) => sum + stat.errorCount, 0);
      const overallErrorRate = totalCount > 0 ? (totalError / totalCount * 100).toFixed(2) : 0;
      const overallAvgResponseTime = formattedStats.length > 0 
        ? (formattedStats.reduce((sum, stat) => sum + parseFloat(stat.avgResponseTime), 0) / formattedStats.length).toFixed(2)
        : 0;

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          timeRange,
          total: {
            totalCount,
            totalSuccess,
            totalError,
            errorRate: overallErrorRate,
            avgResponseTime: overallAvgResponseTime
          },
          stats: formattedStats,
          trend: trendData.map(item => ({
            date: item.date,
            hour: item.hour,
            count: Number(item.count),
            errorCount: Number(item.errorCount)
          }))
        }
      });
    } catch (error) {
      console.error('获取回调统计数据失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取回调统计数据失败',
        error: error.message
      });
    }
  });

  // 发送测试消息
  fastify.post('/robots/:id/send-test', async (request, reply) => {
    try {
      const { id } = request.params;
      const { toWxId, content } = request.body;

      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      if (!robot.isActive) {
        return reply.status(400).send({
          code: -1,
          message: '机器人未启用'
        });
      }

      // 调用 WorkTool 发送消息接口
      const worktoolService = require('../services/worktool.service');
      const result = await worktoolService.sendMessage({
        robotId: robot.robotId,
        toWxId,
        content
      });

      return reply.send({
        code: 0,
        message: '发送成功',
        data: result
      });
    } catch (error) {
      console.error('发送测试消息失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '发送测试消息失败',
        error: error.message
      });
    }
  });
};

module.exports = robotApiRoutes;
