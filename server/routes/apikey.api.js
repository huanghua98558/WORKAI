/**
 * API Key 管理 API 路由
 * 提供 API Key 的创建、删除、列表等功能
 */

const { generateApiKeyWithName } = require('../lib/apikey');

async function apiKeyRoutes(fastify, options) {
  // 创建 API Key
  fastify.post('/keys', {
    onRequest: [async (request, reply) => {
      // TODO: 验证 JWT 令牌（需要登录用户）
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '需要登录',
          error: 'Unauthorized'
        });
      }

      const { verifyToken } = require('../lib/jwt');
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (!decoded) {
        return reply.status(401).send({
          code: 401,
          message: '认证令牌无效',
          error: 'Unauthorized'
        });
      }

      request.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
    }]
  }, async (request, reply) => {
    try {
      const { name } = request.body;

      // 生成 API Key
      const apiKeyInfo = generateApiKeyWithName(name);

      // TODO: 将 API Key 存储到数据库
      // 示例：
      // await db.insert(apiKeys).values({
      //   id: apiKeyInfo.id,
      //   userId: request.user.userId,
      //   name: apiKeyInfo.name,
      //   hashedKey: apiKeyInfo.hashedApiKey,
      //   createdAt: apiKeyInfo.createdAt
      // });

      fastify.log.info('[API Key] 创建成功', {
        id: apiKeyInfo.id,
        name: apiKeyInfo.name,
        userId: request.user.userId
      });

      return reply.send({
        code: 0,
        message: 'API Key 创建成功',
        data: {
          id: apiKeyInfo.id,
          name: apiKeyInfo.name,
          apiKey: apiKeyInfo.apiKey, // 仅在创建时返回
          createdAt: apiKeyInfo.createdAt
        }
      });
    } catch (error) {
      fastify.log.error('[API Key] 创建失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: 'API Key 创建失败',
        error: error.message
      });
    }
  });

  // 列出 API Keys
  fastify.get('/keys', {
    onRequest: [async (request, reply) => {
      // TODO: 验证 JWT 令牌
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '需要登录',
          error: 'Unauthorized'
        });
      }

      const { verifyToken } = require('../lib/jwt');
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (!decoded) {
        return reply.status(401).send({
          code: 401,
          message: '认证令牌无效',
          error: 'Unauthorized'
        });
      }

      request.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
    }]
  }, async (request, reply) => {
    try {
      // TODO: 从数据库中获取用户的 API Keys
      // 示例：
      // const apiKeys = await db.query.apiKeys.findMany({
      //   where: eq(apiKeys.userId, request.user.userId)
      // });

      // 临时返回空数组（开发环境）
      const apiKeys = [];

      return reply.send({
        code: 0,
        message: '获取 API Keys 成功',
        data: {
          keys: apiKeys,
          total: apiKeys.length
        }
      });
    } catch (error) {
      fastify.log.error('[API Key] 获取列表失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '获取 API Keys 失败',
        error: error.message
      });
    }
  });

  // 删除 API Key
  fastify.delete('/keys/:id', {
    onRequest: [async (request, reply) => {
      // TODO: 验证 JWT 令牌
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '需要登录',
          error: 'Unauthorized'
        });
      }

      const { verifyToken } = require('../lib/jwt');
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (!decoded) {
        return reply.status(401).send({
          code: 401,
          message: '认证令牌无效',
          error: 'Unauthorized'
        });
      }

      request.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
    }]
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // TODO: 从数据库中删除 API Key
      // 示例：
      // await db.delete(apiKeys)
      //   .where(and(
      //     eq(apiKeys.id, id),
      //     eq(apiKeys.userId, request.user.userId)
      //   ));

      fastify.log.info('[API Key] 删除成功', {
        id: id,
        userId: request.user.userId
      });

      return reply.send({
        code: 0,
        message: 'API Key 删除成功'
      });
    } catch (error) {
      fastify.log.error('[API Key] 删除失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: 'API Key 删除失败',
        error: error.message
      });
    }
  });

  // 验证 API Key（用于测试）
  fastify.post('/validate', async (request, reply) => {
    try {
      const { apiKey } = request.body;

      if (!apiKey) {
        return reply.status(400).send({
          code: 400,
          message: 'API Key 不能为空',
          error: 'Bad Request'
        });
      }

      const { validateApiKeyFormat } = require('../lib/apikey');
      const isValid = validateApiKeyFormat(apiKey);

      if (!isValid) {
        return reply.status(401).send({
          code: 401,
          message: 'API Key 格式无效',
          error: 'Unauthorized'
        });
      }

      // TODO: 从数据库中验证 API Key
      // 临时：只要格式正确就返回成功
      return reply.send({
        code: 0,
        message: 'API Key 格式有效',
        data: {
          apiKey: apiKey.substring(0, 10) + '...', // 只返回前10个字符
          validated: true
        }
      });
    } catch (error) {
      fastify.log.error('[API Key] 验证失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: 'API Key 验证失败',
        error: error.message
      });
    }
  });
}

module.exports = apiKeyRoutes;
