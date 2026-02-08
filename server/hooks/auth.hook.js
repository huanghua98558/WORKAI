/**
 * 认证 Hook - 用于保护需要认证的路由
 */

const sessionService = require('../services/session.service');
const permissionService = require('../services/permission.service');
const { getLogger } = require('../lib/logger');

const logger = getLogger('AUTH_HOOK');

/**
 * 验证用户身份
 * 从 Authorization header 中提取并验证 JWT token
 */
async function verifyAuth(request, reply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        code: 401,
        message: '未授权：缺少认证令牌',
        error: 'Unauthorized'
      });
    }

    const token = authHeader.substring(7);
    const sessionData = await sessionService.verifySession(token);

    if (!sessionData) {
      return reply.status(401).send({
        code: 401,
        message: '未授权：令牌无效或已过期',
        error: 'Unauthorized'
      });
    }

    // 检查用户状态
    if (!sessionData.user.isActive) {
      return reply.status(403).send({
        code: 403,
        message: '账户已被禁用',
        error: 'Forbidden'
      });
    }

    // 将用户信息和会话信息附加到request
    request.user = sessionData.user;
    request.session = sessionData.session;
    request.token = token;

    logger.debug('认证成功', {
      userId: request.user.id,
      username: request.user.username,
      sessionId: request.session.id
    });

    // 更新最后活动时间
    await sessionService.updateLastActivity(request.session.id);

    return;
  } catch (error) {
    logger.error('认证失败', {
      error: error.message,
      token: request.headers.authorization?.substring(7, 27)
    });

    return reply.status(401).send({
      code: 401,
      message: '认证失败',
      error: error.message
    });
  }
}

/**
 * 验证用户是否为超级管理员
 */
async function requireSuperAdmin(request, reply) {
  await verifyAuth(request, reply);

  if (reply.sent) {
    // verifyAuth 已经发送了响应
    return;
  }

  if (request.user.role !== 'superadmin') {
    logger.warn('权限不足：需要超级管理员权限', {
      userId: request.user.id,
      role: request.user.role
    });

    return reply.status(403).send({
      code: 403,
      message: '权限不足：需要超级管理员权限',
      error: 'Forbidden'
    });
  }
}

/**
 * 验证用户是否为管理员或超级管理员
 */
async function requireAdmin(request, reply) {
  await verifyAuth(request, reply);

  if (reply.sent) {
    return;
  }

  if (request.user.role !== 'admin' && request.user.role !== 'superadmin') {
    logger.warn('权限不足：需要管理员权限', {
      userId: request.user.id,
      role: request.user.role
    });

    return reply.status(403).send({
      code: 403,
      message: '权限不足：需要管理员权限',
      error: 'Forbidden'
    });
  }
}

/**
 * 验证用户是否有权限访问指定机器人
 */
function requireRobotAccess(robotIdParam = 'robotId') {
  return async (request, reply) => {
    await verifyAuth(request, reply);

    if (reply.sent) {
      return;
    }

    const robotId = request.params[robotIdParam] || request.body[robotIdParam];

    if (!robotId) {
      return reply.status(400).send({
        code: 400,
        message: '缺少机器人ID',
        error: 'Bad Request'
      });
    }

    const hasAccess = await permissionService.hasRobotAccess(request.user.id, robotId);

    if (!hasAccess) {
      logger.warn('权限不足：无权访问此机器人', {
        userId: request.user.id,
        robotId
      });

      return reply.status(403).send({
        code: 403,
        message: '权限不足：无权访问此机器人',
        error: 'Forbidden'
      });
    }

    // 将机器人ID附加到request，方便后续使用
    request.robotId = robotId;

    return;
  };
}

/**
 * 验证用户是否有权限删除指定机器人
 */
function requireRobotDelete(robotIdParam = 'robotId') {
  return async (request, reply) => {
    await verifyAuth(request, reply);

    if (reply.sent) {
      return;
    }

    const robotId = request.params[robotIdParam] || request.body[robotIdParam];

    if (!robotId) {
      return reply.status(400).send({
        code: 400,
        message: '缺少机器人ID',
        error: 'Bad Request'
      });
    }

    const canDelete = await permissionService.canDeleteRobot(request.user.id, robotId);

    if (!canDelete) {
      logger.warn('权限不足：无权删除此机器人', {
        userId: request.user.id,
        robotId
      });

      return reply.status(403).send({
        code: 403,
        message: '权限不足：无权删除此机器人',
        error: 'Forbidden'
      });
    }

    request.robotId = robotId;

    return;
  };
}

/**
 * 获取用户可访问的机器人ID列表
 * 并附加到 request
 */
async function filterAccessibleRobots(request, reply) {
  await verifyAuth(request, reply);

  if (reply.sent) {
    return;
  }

  const accessibleRobotIds = await permissionService.getAccessibleRobotIds(request.user.id);

  request.accessibleRobotIds = accessibleRobotIds;

  return;
}

module.exports = {
  verifyAuth,
  requireSuperAdmin,
  requireAdmin,
  requireRobotAccess,
  requireRobotDelete,
  filterAccessibleRobots
};
