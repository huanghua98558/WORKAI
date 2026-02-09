/**
 * JWT 认证中间件
 * 用于保护需要认证的路由
 */

const { verifyToken } = require('../lib/jwt');
const userCacheService = require('../services/user-cache.service');

/**
 * 验证 JWT 令牌的中间件
 * @param {Object} fastify - Fastify 实例
 * @param {Object} options - 中间件选项
 */
async function authMiddleware(fastify, options) {
  fastify.addHook('onRequest', async (request, reply) => {
    // 跳过 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return;
    }

    // 从请求头中获取令牌
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        code: 401,
        message: '未提供认证令牌',
        error: 'Unauthorized'
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证令牌
    const decoded = verifyToken(token);

    if (!decoded) {
      return reply.status(401).send({
        code: 401,
        message: '认证令牌无效或已过期',
        error: 'Unauthorized'
      });
    }

    // 将用户信息附加到请求对象
    request.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // 尝试从缓存获取完整的用户信息
    try {
      const cachedUser = await userCacheService.getUser(decoded.userId);
      if (cachedUser) {
        request.user.fullUser = cachedUser;
        request.user.isCached = true;
      } else {
        request.user.isCached = false;
      }
    } catch (error) {
      fastify.log.warn('[Auth] 获取用户缓存失败', {
        userId: decoded.userId,
        error: error.message
      });
      request.user.isCached = false;
    }

    fastify.log.info('[Auth] 用户认证成功', {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      isCached: request.user.isCached,
      path: request.url
    });
  });
}

/**
 * 可选的认证中间件（不强制要求认证）
 * 用于某些允许匿名访问但可以提供用户信息的路由
 */
async function optionalAuthMiddleware(fastify, options) {
  fastify.addHook('onRequest', async (request, reply) => {
    // 跳过 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return;
    }

    // 从请求头中获取令牌
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        request.user = {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          iat: decoded.iat,
          exp: decoded.exp
        };

        // 尝试从缓存获取完整的用户信息
        try {
          const cachedUser = await userCacheService.getUser(decoded.userId);
          if (cachedUser) {
            request.user.fullUser = cachedUser;
            request.user.isCached = true;
          } else {
            request.user.isCached = false;
          }
        } catch (error) {
          fastify.log.warn('[Auth] 获取用户缓存失败', {
            userId: decoded.userId,
            error: error.message
          });
          request.user.isCached = false;
        }

        fastify.log.info('[Auth] 用户认证成功', {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          isCached: request.user.isCached,
          path: request.url
        });
      }
    }
  });
}

/**
 * 角色检查中间件
 * 验证用户是否具有指定的角色
 * @param {Array<string>} allowedRoles - 允许的角色列表
 * @returns {Function} 中间件函数
 */
function checkRole(allowedRoles) {
  return async function (request, reply) {
    if (!request.user) {
      return reply.status(401).send({
        code: 401,
        message: '未认证',
        error: 'Unauthorized'
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        code: 403,
        message: '权限不足',
        error: 'Forbidden'
      });
    }
  };
}

/**
 * 管理员角色检查
 */
function checkAdmin(request, reply) {
  if (!request.user) {
    return reply.status(401).send({
      code: 401,
      message: '未认证',
      error: 'Unauthorized'
    });
  }

  if (request.user.role !== 'admin') {
    return reply.status(403).send({
      code: 403,
      message: '需要管理员权限',
      error: 'Forbidden'
    });
  }
}

/**
 * 验证 robotId 的 preHandler 函数
 * 用于 WorkTool API 路由，只验证 robotId 的有效性
 * @param {Object} request - Fastify 请求对象
 * @param {Object} reply - Fastify 响应对象
 */
async function robotAuthMiddleware(request, reply) {
  // 跳过 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return;
  }

  // 从请求参数中获取 robotId
  const robotId = request.body?.robotId || request.query?.robotId;

  if (!robotId) {
    return reply.status(400).send({
      code: 400,
      message: '缺少 robotId 参数',
      error: 'Bad Request'
    });
  }

  // 验证 robotId 是否存在于数据库中
  try {
    const { getDb } = require('coze-coding-dev-sdk');
    const { robots } = require('../database/schema');
    const { eq } = require('drizzle-orm');

    const db = await getDb();
    const robot = await db.select()
      .from(robots)
      .where(eq(robots.robotId, robotId))
      .limit(1);

    if (robot.length === 0) {
      return reply.status(404).send({
        code: 404,
        message: `机器人不存在: ${robotId}`,
        error: 'Not Found'
      });
    }

    if (!robot[0].isActive) {
      return reply.status(403).send({
        code: 403,
        message: '机器人已被禁用',
        error: 'Forbidden'
      });
    }

    // 将机器人信息附加到请求对象
    request.robot = {
      robotId: robot[0].robotId,
      name: robot[0].name,
      apiBaseUrl: robot[0].apiBaseUrl,
      isActive: robot[0].isActive,
      status: robot[0].status
    };

    request.log.info('[RobotAuth] 机器人认证成功', {
      robotId: robot[0].robotId,
      name: robot[0].name,
      path: request.url
    });
  } catch (error) {
    request.log.error('[RobotAuth] 验证 robotId 失败', {
      robotId,
      error: error.message
    });
    return reply.status(500).send({
      code: 500,
      message: '验证机器人失败',
      error: 'Internal Server Error'
    });
  }
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  checkRole,
  checkAdmin,
  robotAuthMiddleware
};
