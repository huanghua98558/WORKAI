/**
 * 认证 API 路由
 * 提供用户登录、Token 刷新、登出等认证相关接口
 */

const authService = require('../services/auth.service');
const { authMiddleware } = require('../middleware/auth');
const { getLogger } = require('../lib/logger');

const logger = getLogger('AUTH_API');

async function authApiRoutes(fastify, options) {
  /**
   * 健康检查
   */
  fastify.get('/health', async (request, reply) => {
    return { 
      success: true, 
      service: 'auth-api',
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });

  /**
   * 用户登录
   * POST /api/auth/login
   * 
   * 请求体:
   * {
   *   "username": "admin",
   *   "password": "password123"
   * }
   * 
   * 响应:
   * {
   *   "success": true,
   *   "data": {
   *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *     "user": {
   *       "id": "xxx",
   *       "username": "admin",
   *       "email": "admin@example.com",
   *       "role": "admin",
   *       "isActive": true
   *     }
   *   }
   * }
   */
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body;

    // 验证必填字段
    if (!username || !password) {
      return reply.code(400).send({
        success: false,
        error: '用户名和密码不能为空',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // 验证字段类型
    if (typeof username !== 'string' || typeof password !== 'string') {
      return reply.code(400).send({
        success: false,
        error: '用户名和密码必须是字符串',
        code: 'INVALID_CREDENTIALS_TYPE'
      });
    }

    try {
      const result = await authService.login(username, password, request);
      
      logger.info('用户登录成功', { 
        userId: result.user.id, 
        username: result.user.username 
      });
      
      return { success: true, data: result };
    } catch (error) {
      logger.warn('用户登录失败', { 
        username, 
        error: error.message 
      });
      
      return reply.code(401).send({
        success: false,
        error: error.message,
        code: 'LOGIN_FAILED'
      });
    }
  });

  /**
   * 刷新 Token
   * POST /api/auth/refresh
   * 
   * 请求体:
   * {
   *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   * 
   * 响应:
   * {
   *   "success": true,
   *   "data": {
   *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *   }
   * }
   */
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.code(400).send({
        success: false,
        error: '刷新 Token 不能为空',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    if (typeof refreshToken !== 'string') {
      return reply.code(400).send({
        success: false,
        error: '刷新 Token 必须是字符串',
        code: 'INVALID_REFRESH_TOKEN_TYPE'
      });
    }

    try {
      const result = await authService.refresh(refreshToken, request);
      
      logger.info('Token 刷新成功');
      
      return { success: true, data: result };
    } catch (error) {
      logger.warn('Token 刷新失败', { 
        error: error.message 
      });
      
      return reply.code(401).send({
        success: false,
        error: error.message,
        code: 'REFRESH_FAILED'
      });
    }
  });

  /**
   * 登出
   * POST /api/auth/logout
   * 
   * 需要认证
   */
  fastify.post('/logout', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const result = await authService.logout(request.user, request);
      
      logger.info('用户登出成功', { 
        userId: request.user?.userId, 
        username: request.user?.username 
      });
      
      return { success: true, data: result };
    } catch (error) {
      logger.error('用户登出失败', { 
        userId: request.user?.userId, 
        error: error.message 
      });
      
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'LOGOUT_FAILED'
      });
    }
  });

  /**
   * 验证 Token
   * GET /api/auth/verify
   * 
   * 需要认证
   * 用于前端定期验证 Token 有效性
   */
  fastify.get('/verify', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      // Token 验证通过，返回用户信息
      return {
        success: true,
        data: {
          valid: true,
          user: request.user,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Token 验证失败', { 
        userId: request.user?.userId, 
        error: error.message 
      });
      
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'VERIFY_FAILED'
      });
    }
  });

  /**
   * 获取当前用户信息
   * GET /api/auth/me
   * 
   * 需要认证
   */
  fastify.get('/me', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { userManager } = require('../database');
      
      // 获取完整用户信息
      const user = await userManager.getUserById(request.user.userId);
      
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: '用户不存在',
          code: 'USER_NOT_FOUND'
        });
      }

      // 不返回密码
      const { password, ...userWithoutPassword } = user;
      
      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      logger.error('获取用户信息失败', { 
        userId: request.user?.userId, 
        error: error.message 
      });
      
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'GET_USER_FAILED'
      });
    }
  });
}

module.exports = authApiRoutes;
