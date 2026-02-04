/**
 * 机器人管理 API 路由
 */

const robotService = require('../services/robot.service');
const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { callbackHistory, robots } = require('../database/schema');
const { eq, desc, and, gte, lte, count } = require('drizzle-orm');

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

      // 获取原始机器人数据
      const originalRobot = await robotService.getRobotById(id);
      if (!originalRobot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 验证配置 - 只对真正改变了的字段进行验证
      const fieldsToValidate = [];
      
      // 检查 robotId 是否改变
      if (data.robotId !== undefined && data.robotId !== originalRobot.robotId) {
        fieldsToValidate.push('robotId');
      }
      
      // 检查 apiBaseUrl 是否改变
      if (data.apiBaseUrl !== undefined && data.apiBaseUrl !== originalRobot.apiBaseUrl) {
        fieldsToValidate.push('apiBaseUrl');
      }

      // 如果有字段改变了，则进行验证
      if (fieldsToValidate.length > 0) {
        const validation = await robotService.validateRobotConfig(
          data.robotId !== undefined ? data.robotId : originalRobot.robotId,
          data.apiBaseUrl !== undefined ? data.apiBaseUrl : originalRobot.apiBaseUrl
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
      if (data.robotId && data.robotId !== originalRobot.robotId) {
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

  // 检查机器人状态（从 WorkTool API 获取最新信息）
  fastify.post('/robots/:robotId/check-status', async (request, reply) => {
    try {
      const { robotId } = request.params;

      // 查询机器人
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 检查机器人状态并更新详细信息
      const result = await robotService.checkRobotStatus(robotId);

      // 返回更新后的机器人信息
      const updatedRobot = await robotService.getRobotByRobotId(robotId);

      return reply.send({
        code: 0,
        message: '机器人状态已更新',
        data: {
          checkResult: result,
          robot: updatedRobot
        }
      });
    } catch (error) {
      console.error('检查机器人状态失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '检查机器人状态失败',
        error: error.message
      });
    }
  });

  // 批量检查所有启用的机器人状态
  fastify.post('/robots/check-status-all', async (request, reply) => {
    try {
      // 获取所有启用的机器人
      const activeRobots = await robotService.getAllRobots({ isActive: true });

      if (activeRobots.length === 0) {
        return reply.send({
          code: 0,
          message: '没有启用的机器人',
          data: {
            total: 0,
            success: 0,
            failed: 0,
            results: []
          }
        });
      }

      // 批量检查状态
      const results = [];
      let successCount = 0;
      let failedCount = 0;

      for (const robot of activeRobots) {
        try {
          const result = await robotService.checkRobotStatus(robot.robotId);
          results.push({
            robotId: robot.robotId,
            name: robot.name,
            success: true,
            message: result.message
          });
          successCount++;
        } catch (error) {
          results.push({
            robotId: robot.robotId,
            name: robot.name,
            success: false,
            message: error.message || '检查失败'
          });
          failedCount++;
        }
      }

      return reply.send({
        code: 0,
        message: `批量检查完成，成功 ${successCount} 个，失败 ${failedCount} 个`,
        data: {
          total: activeRobots.length,
          success: successCount,
          failed: failedCount,
          results
        }
      });
    } catch (error) {
      console.error('批量检查机器人状态失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '批量检查机器人状态失败',
        error: error.message
      });
    }
  });

  // 为机器人重新生成地址
  fastify.post('/robots/:id/regenerate-urls', async (request, reply) => {
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

      // 生成新的地址
      const callbackBaseUrl = request.body.callbackBaseUrl || process.env.CALLBACK_BASE_URL || 'http://localhost:5000';
      const urls = robotService.generateRobotUrls(
        robot.robotId,
        robot.apiBaseUrl,
        callbackBaseUrl
      );

      // 更新机器人
      const updatedRobot = await robotService.updateRobot(id, {
        ...urls,
        callbackBaseUrl
      });

      return reply.send({
        code: 0,
        message: '地址重新生成成功',
        data: updatedRobot
      });
    } catch (error) {
      console.error('重新生成地址失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '重新生成地址失败',
        error: error.message
      });
    }
  });

  // 测试单个 API 接口
  fastify.post('/robots/:id/api-endpoints/test', async (request, reply) => {
    try {
      const { id } = request.params;
      const { endpointType } = request.body;

      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 测试指定类型的接口
      const result = await robotService.testApiEndpoint(robot.robotId, endpointType);

      return reply.send({
        code: 0,
        message: '测试完成',
        data: result
      });
    } catch (error) {
      console.error('测试 API 接口失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '测试 API 接口失败',
        error: error.message
      });
    }
  });

  // 批量测试所有通讯地址接口
  fastify.post('/robots/:id/api-endpoints/test-all', async (request, reply) => {
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

      // 批量测试所有通讯地址接口
      const result = await robotService.testAllApiEndpoints(robot.robotId);

      return reply.send({
        code: 0,
        message: '批量测试完成',
        data: result
      });
    } catch (error) {
      console.error('批量测试 API 接口失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '批量测试 API 接口失败',
        error: error.message
      });
    }
  });

  // 获取接口调用日志
  fastify.get('/robots/:id/api-endpoints/logs', async (request, reply) => {
    try {
      const { id } = request.params;
      const { page = 1, pageSize = 20, endpointType, status } = request.query;

      // 查询机器人
      const robot = await robotService.getRobotById(id);
      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 获取接口调用日志
      const result = await robotService.getApiCallLogs(robot.robotId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        endpointType,
        status
      });

      return reply.send({
        code: 0,
        message: '获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取接口调用日志失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取接口调用日志失败',
        error: error.message
      });
    }
  });

  // 获取机器人监控数据（监控大屏）
  fastify.get('/robot-monitoring', async (request, reply) => {
    try {
      const { period = '1h' } = request.query;
      const db = await getDb();

      // 计算时间范围
      let startTime;
      const now = new Date();
      switch (period) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
      }

      const startTimeStr = startTime.toISOString();

      // 查询所有机器人
      const robotsResult = await db.execute(sql`
        SELECT
          r.robot_id,
          r.name as robot_name,
          rg.name as group_name,
          r.is_active,
          r.status as robot_status
        FROM robots r
        LEFT JOIN robot_groups rg ON r.group_id = rg.id
        ORDER BY r.name
      `);

      // 查询所有机器人的执行统计
      const statsResult = await db.execute(sql`
        SELECT
          robot_id,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
          COUNT(*) as total_count,
          AVG(processing_time) as avg_processing_time,
          MAX(created_at) as last_created_at
        FROM execution_tracking
        WHERE created_at >= ${startTimeStr}::timestamp
        GROUP BY robot_id
      `);

      // 创建统计数据的映射
      const statsMap = new Map();
      statsResult.rows.forEach(row => {
        statsMap.set(row.robot_id, row);
      });

      // 构建机器人监控列表
      const robotMonitorList = robotsResult.rows.map(row => {
        const stats = statsMap.get(row.robot_id) || {
          success_count: 0,
          error_count: 0,
          processing_count: 0,
          total_count: 0,
          avg_processing_time: 0
        };

        const total = stats.total_count || 0;
        const success = stats.success_count || 0;
        const error = stats.error_count || 0;
        const processing = stats.processing_count || 0;

        // 计算成功率
        const successRate = total > 0 ? Math.round((success / total) * 100) : 100;

        // 计算健康分数
        const healthScore = row.robot_status === 'online' 
          ? Math.min(100, total > 0 ? successRate : 100)
          : Math.min(100, total > 0 ? successRate - 20 : 80);

        // 确定健康等级
        let healthLevel = 'good';
        if (healthScore >= 90) healthLevel = 'excellent';
        else if (healthScore >= 70) healthLevel = 'good';
        else if (healthScore >= 50) healthLevel = 'fair';
        else healthLevel = 'poor';

        // 计算利用率
        const utilizationRate = total > 100 ? 80 : total > 10 ? 60 : 40;

        return {
          robot_id: row.robot_id,
          robot_name: row.robot_name,
          group_name: row.group_name,
          is_active: row.is_active,
          robot_status: row.robot_status,
          health_score: healthScore,
          success_rate: successRate,
          current_sessions: processing,
          max_sessions: 10,
          avg_response_time: Math.round(stats.avg_processing_time || 0),
          utilization_rate: utilizationRate,
          health_level: healthLevel,
          sessionStats: {
            total: total,
            active: processing,
            completed: success,
            failed: error,
            avgDuration: Math.round(stats.avg_processing_time || 0)
          },
          commandStats: {
            total: total,
            pending: 0,
            processing: processing,
            completed: success,
            failed: error,
            avgProcessing: Math.round(stats.avg_processing_time || 0)
          },
          topErrors: []
        };
      });

      // 计算总体统计
      const totalRobots = robotMonitorList.length;
      const activeRobots = robotMonitorList.filter(r => r.is_active).length;
      const totalSessions = robotMonitorList.reduce((sum, r) => sum + r.sessionStats.total, 0);
      const activeSessions = robotMonitorList.reduce((sum, r) => sum + r.sessionStats.active, 0);
      const totalCommands = robotMonitorList.reduce((sum, r) => sum + r.commandStats.total, 0);
      const avgHealthScore = totalRobots > 0 
        ? Math.round(robotMonitorList.reduce((sum, r) => sum + r.health_score, 0) / totalRobots)
        : 100;
      const avgSuccessRate = totalRobots > 0 
        ? Math.round(robotMonitorList.reduce((sum, r) => sum + r.success_rate, 0) / totalRobots)
        : 100;
      const overallUtilization = totalRobots > 0 
        ? Math.round(robotMonitorList.reduce((sum, r) => sum + r.utilization_rate, 0) / totalRobots)
        : 0;

      return reply.send({
        success: true,
        message: 'success',
        data: {
          robots: robotMonitorList,
          stats: {
            totalRobots,
            activeRobots,
            totalSessions,
            activeSessions,
            totalCommands,
            avgHealthScore,
            avgSuccessRate,
            overallUtilization
          },
          timeRange: {
            start: startTime.toISOString(),
            end: now.toISOString()
          }
        }
      });
    } catch (error) {
      console.error('获取机器人监控数据失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取机器人监控数据失败',
        error: error.message
      });
    }
  });
};

module.exports = robotApiRoutes;
