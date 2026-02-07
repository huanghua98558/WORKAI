/**
 * 认证相关 API 路由
 * 提供登录、注册、刷新令牌等功能
 */

const { generateTokenPair, refreshToken, verifyToken } = require('../lib/jwt');
const { userCacheService } = require('../services/user-cache.service');
const { userManager } = require('../database/userManager');

async function authRoutes(fastify, options) {
  // 登录接口
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body;

      // 验证用户名和密码
      const user = await userManager.validatePassword(username, password);

      if (!user) {
        fastify.log.warn('[Auth] 登录失败：用户名或密码错误', { username });
        return reply.status(401).send({
          code: 401,
          message: '用户名或密码错误',
          error: 'Unauthorized'
        });
      }

      // 检查用户是否激活
      if (!user.isActive) {
        fastify.log.warn('[Auth] 登录失败：用户已禁用', { userId: user.id, username: user.username });
        return reply.status(403).send({
          code: 403,
          message: '账户已被禁用',
          error: 'Forbidden'
        });
      }

      // 生成 Token
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role
      };

      const tokens = generateTokenPair(tokenPayload);

      // 更新最后登录时间
      await userManager.updateLastLogin(user.id);

      // 缓存用户信息和会话
      await userCacheService.setUser(user);
      await userCacheService.setUserSession(
        user,
        tokens.accessToken,
        {
          ip: request.ip,
          userAgent: request.headers['user-agent']
        }
      );

      fastify.log.info('[Auth] 用户登录成功', {
        userId: user.id,
        username: user.username
      });

      return reply.send({
        code: 0,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLoginAt: user.lastLoginAt
          },
          ...tokens
        }
      });
    } catch (error) {
      fastify.log.error('[Auth] 登录失败', { error: error.message, stack: error.stack });
      return reply.status(500).send({
        code: 500,
        message: '登录失败',
        error: error.message
      });
    }
  });

  // 注册接口
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, password, email } = request.body;

      // TODO: 验证输入
      if (!username || !password || !email) {
        return reply.status(400).send({
          code: 400,
          message: '用户名、密码和邮箱不能为空',
          error: 'Bad Request'
        });
      }

      // TODO: 检查用户名是否已存在
      // const existingUser = await db.query.users.findFirst({ where: eq(users.username, username) });
      // if (existingUser) {
      //   return reply.status(409).send({
      //     code: 409,
      //     message: '用户名已存在',
      //     error: 'Conflict'
      //   });
      // }

      // TODO: 创建用户（密码应该使用 bcrypt 加密）
      // const hashedPassword = await bcrypt.hash(password, 10);
      // const user = await db.insert(users).values({
      //   username,
      //   password: hashedPassword,
      //   email,
      //   role: 'user'
      // }).returning();

      fastify.log.info('[Auth] 用户注册成功', { username, email });

      return reply.send({
        code: 0,
        message: '注册成功',
        data: {
          username,
          email
        }
      });
    } catch (error) {
      fastify.log.error('[Auth] 注册失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '注册失败',
        error: error.message
      });
    }
  });

  // 刷新令牌接口
  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken: refreshTokenValue } = request.body;

      if (!refreshTokenValue) {
        return reply.status(400).send({
          code: 400,
          message: '刷新令牌不能为空',
          error: 'Bad Request'
        });
      }

      const tokens = refreshToken(refreshTokenValue);

      if (!tokens) {
        return reply.status(401).send({
          code: 401,
          message: '刷新令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      fastify.log.info('[Auth] 令牌刷新成功');

      return reply.send({
        code: 0,
        message: '令牌刷新成功',
        data: tokens
      });
    } catch (error) {
      fastify.log.error('[Auth] 令牌刷新失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '令牌刷新失败',
        error: error.message
      });
    }
  });

  // 验证令牌接口
  fastify.post('/verify', async (request, reply) => {
    try {
      const { token } = request.body;

      if (!token) {
        return reply.status(400).send({
          code: 400,
          message: '令牌不能为空',
          error: 'Bad Request'
        });
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return reply.status(401).send({
          code: 401,
          message: '令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      return reply.send({
        code: 0,
        message: '令牌有效',
        data: {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          exp: decoded.exp
        }
      });
    } catch (error) {
      fastify.log.error('[Auth] 令牌验证失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '令牌验证失败',
        error: error.message
      });
    }
  });

  // 获取当前用户信息
  fastify.get('/me', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '未提供认证令牌',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (!decoded) {
        return reply.status(401).send({
          code: 401,
          message: '认证令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      request.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
      request.token = token;
    }]
  }, async (request, reply) => {
    try {
      // 优先从缓存获取用户信息
      let user = await userCacheService.getUser(request.user.userId);

      // 如果缓存未命中，从数据库查询
      if (!user) {
        user = await userManager.getUserById(request.user.userId);
        if (user) {
          await userCacheService.setUser(user);
        }
      }

      if (!user) {
        return reply.status(404).send({
          code: 404,
          message: '用户不存在',
          error: 'Not Found'
        });
      }

      return reply.send({
        code: 0,
        message: '获取用户信息成功',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt
        }
      });
    } catch (error) {
      fastify.log.error('[Auth] 获取用户信息失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '获取用户信息失败',
        error: error.message
      });
    }
  });

  // 登出接口
  fastify.post('/logout', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '未提供认证令牌',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (!decoded) {
        return reply.status(401).send({
          code: 401,
          message: '认证令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      request.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
      request.token = token;
    }]
  }, async (request, reply) => {
    try {
      // 删除用户会话缓存
      await userCacheService.deleteUserSession(request.user.userId, request.token);

      fastify.log.info('[Auth] 用户登出成功', {
        userId: request.user.userId,
        username: request.user.username
      });

      return reply.send({
        code: 0,
        message: '登出成功'
      });
    } catch (error) {
      fastify.log.error('[Auth] 登出失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '登出失败',
        error: error.message
      });
    }
  });
}

module.exports = authRoutes;
