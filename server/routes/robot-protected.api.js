/**
 * 机器人管理 API 路由（带权限控制）
 * 集成认证、权限检查和数据隔离
 */

const robotService = require('../services/robot.service');
const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { robots } = require('../database/schema');
const { eq, desc, and, gte, lte, count } = require('drizzle-orm');
const {
  verifyAuth,
  requireSuperAdmin,
  requireAdmin,
  requireRobotAccess,
  requireRobotDelete,
  filterAccessibleRobots
} = require('../hooks/auth.hook');
const permissionService = require('../services/permission.service');
const { auditLogService } = require('../services/audit-log.service');
const { getLogger } = require('../lib/logger');

const logger = getLogger('ROBOT_API');

const robotProtectedRoutes = async function (fastify, options) {
  console.log('[robot-protected.api.js] 机器人管理 API 路由已加载（带权限控制）');

  // ========== GET 请求 ==========

  /**
   * 获取机器人列表（智能权限判断）
   * - 管理员：可以看到所有机器人
   * - 普通用户：只能看到自己创建或被授权的机器人
   */
  fastify.get('/', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
    try {
      const { isActive, status, search } = request.query;
      const { user } = request;

      logger.info('[ROBOT] 获取机器人列表', {
        userId: user.id,
        role: user.role
      });

      // 判断用户角色
      const isAdmin = user.role === 'admin' || user.role === 'superAdmin';

      if (isAdmin) {
        // 管理员：返回所有机器人，不进行权限过滤
        logger.info('[ROBOT] 管理员请求，返回所有机器人');
        const robotList = await robotService.getAllRobots({
          isActive,
          status,
          search
          // 不传入 accessibleRobotIds，返回所有机器人
        });

        return reply.send({
          code: 0,
          message: 'success',
          data: robotList
        });
      } else {
        // 普通用户：获取用户可访问的机器人列表
        const accessibleRobotIds = await permissionService.getAccessibleRobotIds(user.id);

        logger.info('[ROBOT] 普通用户请求，返回可访问的机器人', {
          userId: user.id,
          accessibleCount: accessibleRobotIds.length
        });

        // 传入 accessibleRobotIds 进行过滤
        const robotList = await robotService.getAllRobots({
          isActive,
          status,
          search,
          accessibleRobotIds
        });

        return reply.send({
          code: 0,
          message: 'success',
          data: robotList
        });
      }
    } catch (error) {
      logger.error('[ROBOT] 获取机器人列表失败', {
        userId: request.user?.id,
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '获取机器人列表失败',
        error: error.message
      });
    }
  });

  /**
   * 根据 ID 获取机器人（需要访问权限）
   */
  fastify.get('/:id', {
    onRequest: [requireRobotAccess('id')],
  }, async (request, reply) => {
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
      logger.error('[ROBOT] 获取机器人信息失败', {
        userId: request.user?.id,
        robotId: request.params.id,
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '获取机器人信息失败',
        error: error.message
      });
    }
  });

  /**
   * 根据 robotId 获取机器人（需要访问权限）
   */
  fastify.get('/by-robot-id/:robotId', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
    try {
      const { robotId } = request.params;
      const { user } = request;

      // 先获取机器人
      const robot = await robotService.getRobotByRobotId(robotId);

      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 检查权限
      const hasAccess = await permissionService.hasRobotAccess(user.id, robot.id);
      if (!hasAccess) {
        logger.warn('[ROBOT] 无权限访问机器人', {
          userId: user.id,
          robotId: robot.id
        });

        return reply.status(403).send({
          code: -1,
          message: '无权限访问此机器人'
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: robot
      });
    } catch (error) {
      logger.error('[ROBOT] 根据robotId获取机器人失败', {
        userId: request.user?.id,
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '获取机器人信息失败',
        error: error.message
      });
    }
  });

  /**
   * 获取用户的机器人权限列表
   */
  fastify.get('/:id/permissions', {
    onRequest: [requireRobotAccess('id')],
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();

      // 获取机器人的所有权限记录
      const { robotPermissions } = require('../database/schema');

      // TODO: 实现获取机器人权限列表
      return reply.send({
        code: 0,
        message: 'success',
        data: []
      });
    } catch (error) {
      logger.error('[ROBOT] 获取机器人权限失败', {
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '获取机器人权限失败',
        error: error.message
      });
    }
  });

  // ========== POST 请求 ==========

  /**
   * 添加机器人（需要认证）
   * 创建的机器人自动属于当前用户
   */
  fastify.post('/', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
    try {
      const data = request.body;
      const { user } = request;

      logger.info('[ROBOT] 创建机器人', {
        userId: user.id,
        robotId: data.robotId
      });

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

      // 设置 owner_id 为当前用户，is_system 为 false
      const robotData = {
        ...data,
        ownerId: user.id,
        isSystem: false
      };

      const robot = await robotService.addRobot(robotData);

      // 记录审计日志
      await auditLogService.logAction({
        userId: user.id,
        action: 'create_robot',
        actionType: 'write',
        resourceType: 'robot',
        resourceId: robot.id,
        resourceName: robot.robotId,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: {
          name: robot.name,
          robotId: robot.robotId
        }
      });

      logger.info('[ROBOT] 机器人创建成功', {
        userId: user.id,
        robotId: robot.id,
        robotName: robot.name
      });

      return reply.send({
        code: 0,
        message: '添加成功',
        data: robot
      });
    } catch (error) {
      const { user } = request;

      logger.error('[ROBOT] 添加机器人失败', {
        userId: user?.id,
        error: error.message
      });

      // 记录审计日志
      if (user) {
        await auditLogService.logAction({
          userId: user.id,
          action: 'create_robot',
          actionType: 'write',
          resourceType: 'robot',
          status: 'failed',
          errorMessage: error.message,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        });
      }

      return reply.status(500).send({
        code: -1,
        message: '添加机器人失败',
        error: error.message
      });
    }
  });

  /**
   * 验证机器人配置（需要认证）
   */
  fastify.post('/validate', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
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
      logger.error('[ROBOT] 验证机器人配置失败', {
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '验证机器人配置失败',
        error: error.message
      });
    }
  });

  /**
   * 测试机器人连接（需要认证）
   */
  fastify.post('/test', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
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
      logger.error('[ROBOT] 测试机器人连接失败', {
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '测试机器人连接失败',
        error: error.message
      });
    }
  });

  /**
   * 测试机器人连接并保存详细信息（需要访问权限）
   */
  fastify.post('/:id/test-and-save', {
    onRequest: [requireRobotAccess('id')],
  }, async (request, reply) => {
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
      logger.error('[ROBOT] 测试机器人连接并保存失败', {
        robotId: request.params.id,
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '测试机器人连接并保存失败',
        error: error.message
      });
    }
  });

  /**
   * 配置消息回调（需要访问权限）
   */
  fastify.post('/:id/config-callback', {
    onRequest: [requireRobotAccess('id')],
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { callbackUrl, callbackBaseType, callbackTypes, replyAll } = request.body;
      const { user } = request;

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

      // 从 apiBaseUrl 提取基础地址
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

        // 记录审计日志
        await auditLogService.logAction({
          userId: user.id,
          action: 'config_callback',
          actionType: 'update',
          resourceType: 'robot',
          resourceId: robot.id,
          resourceName: robot.robotId,
          status: 'success',
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          details: {
            callbackAddress,
            replyAll: replyAllParam
          }
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
      logger.error('[ROBOT] 配置消息回调失败', {
        robotId: request.params.id,
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '配置消息回调失败',
        error: error.message
      });
    }
  });

  // ========== PUT 请求 ==========

  /**
   * 更新机器人（需要访问权限）
   */
  fastify.put('/:id', {
    onRequest: [requireRobotAccess('id')],
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const { user } = request;

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

      // 记录审计日志
      await auditLogService.logAction({
        userId: user.id,
        action: 'update_robot',
        actionType: 'update',
        resourceType: 'robot',
        resourceId: robot.id,
        resourceName: robot.robotId,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: {
          changes: data
        }
      });

      logger.info('[ROBOT] 机器人更新成功', {
        userId: user.id,
        robotId: robot.id,
        robotName: robot.name
      });

      return reply.send({
        code: 0,
        message: '更新成功',
        data: robot
      });
    } catch (error) {
      const { user } = request;

      logger.error('[ROBOT] 更新机器人失败', {
        userId: user?.id,
        robotId: request.params.id,
        error: error.message
      });

      // 记录审计日志
      if (user) {
        await auditLogService.logAction({
          userId: user.id,
          action: 'update_robot',
          actionType: 'update',
          resourceType: 'robot',
          resourceId: request.params.id,
          status: 'failed',
          errorMessage: error.message,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        });
      }

      return reply.status(500).send({
        code: -1,
        message: '更新机器人失败',
        error: error.message
      });
    }
  });

  // ========== DELETE 请求 ==========

  /**
   * 删除机器人（需要删除权限）
   */
  fastify.delete('/:id', {
    onRequest: [requireRobotDelete('id')],
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { user } = request;

      const robot = await robotService.getRobotById(id);

      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: '机器人不存在'
        });
      }

      // 删除机器人
      await robotService.deleteRobot(id);

      // 记录审计日志
      await auditLogService.logAction({
        userId: user.id,
        action: 'delete_robot',
        actionType: 'delete',
        resourceType: 'robot',
        resourceId: robot.id,
        resourceName: robot.robotId,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: {
          name: robot.name
        }
      });

      logger.info('[ROBOT] 机器人删除成功', {
        userId: user.id,
        robotId: robot.id,
        robotName: robot.name
      });

      return reply.send({
        code: 0,
        message: '删除成功',
        data: robot
      });
    } catch (error) {
      const { user } = request;

      logger.error('[ROBOT] 删除机器人失败', {
        userId: user?.id,
        robotId: request.params.id,
        error: error.message
      });

      // 记录审计日志
      if (user) {
        await auditLogService.logAction({
          userId: user.id,
          action: 'delete_robot',
          actionType: 'delete',
          resourceType: 'robot',
          resourceId: request.params.id,
          status: 'failed',
          errorMessage: error.message,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        });
      }

      return reply.status(500).send({
        code: -1,
        message: '删除机器人失败',
        error: error.message
      });
    }
  });
};

module.exports = robotProtectedRoutes;
