/**
 * API Key 认证中间件
 * 用于保护需要 API Key 认证的路由
 */

const { compareApiKey, validateApiKeyFormat } = require('../lib/apikey');

/**
 * 验证 API Key 的中间件
 * @param {Object} fastify - Fastify 实例
 * @param {Object} options - 中间件选项
 * @param {boolean} options.optional - 是否可选（不强制要求）
 */
async function apiKeyMiddleware(fastify, options = {}) {
  const { optional = false } = options;

  fastify.addHook('onRequest', async (request, reply) => {
    // 跳过 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return;
    }

    // 从请求头中获取 API Key
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      if (optional) {
        // 可选认证，没有 API Key 也不阻止请求
        return;
      }

      return reply.status(401).send({
        code: 401,
        message: '未提供 API Key',
        error: 'Unauthorized'
      });
    }

    // 验证 API Key 格式
    if (!validateApiKeyFormat(apiKey)) {
      return reply.status(401).send({
        code: 401,
        message: 'API Key 格式无效',
        error: 'Unauthorized'
      });
    }

    // TODO: 从数据库中验证 API Key
    // 示例：
    // const storedApiKey = await db.query.apiKeys.findFirst({
    //   where: eq(apiKeys.hashedKey, hashApiKey(apiKey))
    // });
    //
    // if (!storedApiKey || !storedApiKey.active) {
    //   return reply.status(401).send({
    //     code: 401,
    //     message: 'API Key 无效或已失效',
    //     error: 'Unauthorized'
    //   });
    // }
    //
    // // 更新最后使用时间
    // await db.update(apiKeys)
    //   .set({ lastUsedAt: new Date() })
    //   .where(eq(apiKeys.id, storedApiKey.id));

    // 临时：允许所有符合格式的 API Key（开发环境）
    // 生产环境必须从数据库验证
    request.apiKey = {
      key: apiKey,
      validated: true
    };

    fastify.log.info('[API Key] 认证成功', {
      apiKey: apiKey.substring(0, 10) + '...', // 只记录前10个字符
      path: request.url
    });
  });
}

/**
 * 双重认证中间件（JWT 或 API Key）
 * 允许使用 JWT 或 API Key 进行认证
 * @param {Object} fastify - Fastify 实例
 * @param {Object} options - 中间件选项
 */
async function dualAuthMiddleware(fastify, options) {
  fastify.addHook('onRequest', async (request, reply) => {
    // 跳过 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return;
    }

    // 尝试 JWT 认证
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const { verifyToken } = require('../lib/jwt');
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        request.user = {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          authType: 'jwt'
        };

        fastify.log.info('[Auth] JWT 认证成功', {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          path: request.url
        });
        return;
      }
    }

    // 尝试 API Key 认证
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      if (!validateApiKeyFormat(apiKey)) {
        return reply.status(401).send({
          code: 401,
          message: 'API Key 格式无效',
          error: 'Unauthorized'
        });
      }

      // TODO: 从数据库中验证 API Key
      request.user = {
        userId: 'api-key-user',
        username: 'api-key',
        role: 'service',
        authType: 'apikey'
      };

      fastify.log.info('[Auth] API Key 认证成功', {
        apiKey: apiKey.substring(0, 10) + '...',
        path: request.url
      });
      return;
    }

    // 两种认证方式都失败
    return reply.status(401).send({
      code: 401,
      message: '未提供有效的认证信息（JWT 或 API Key）',
      error: 'Unauthorized'
    });
  });
}

module.exports = {
  apiKeyMiddleware,
  dualAuthMiddleware
};
