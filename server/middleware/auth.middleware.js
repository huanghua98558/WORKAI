/**
 * JWT 认证中间件
 * 用于保护需要认证的路由
 */

const { verifyToken } = require('./lib/jwt');

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

    fastify.log.info('[Auth] 用户认证成功', {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
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

        fastify.log.info('[Auth] 用户认证成功', {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
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

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  checkRole,
  checkAdmin
};
