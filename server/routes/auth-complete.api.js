/**
 * 认证相关 API 路由（完整版）
 * 提供登录、注册、刷新令牌、登出等功能
 */

const { userManager } = require('../database/userManager');
const sessionService = require('../services/session.service');
const { getLogger } = require('../lib/logger');
const { auditLogService } = require('../services/audit-log.service');

async function authRoutes(fastify, options) {
  const logger = getLogger('AUTH_API');

  /**
   * 登录接口
   */
  fastify.post('/login', async (request, reply) => {
    const startTime = Date.now();
    const { username, password } = request.body;
    const clientIp = request.ip;
    const userAgent = request.headers['user-agent'];

    logger.info('[Auth] 登录请求', { username, ip: clientIp });

    try {
      // 验证输入
      if (!username || !password) {
        await auditLogService.logAction({
          userId: null,
          action: 'login_failed',
          actionType: 'auth',
          resourceType: 'user',
          resourceName: username,
          status: 'failed',
          errorMessage: '用户名或密码为空',
          ipAddress: clientIp,
          userAgent
        });

        return reply.status(400).send({
          code: 400,
          message: '用户名和密码不能为空',
          error: 'Bad Request'
        });
      }

      // 验证用户名和密码
      const user = await userManager.validatePassword(username, password);

      if (!user) {
        await auditLogService.logAction({
          userId: null,
          action: 'login_failed',
          actionType: 'auth',
          resourceType: 'user',
          resourceName: username,
          status: 'failed',
          errorMessage: '用户名或密码错误',
          ipAddress: clientIp,
          userAgent
        });

        logger.warn('[Auth] 登录失败：用户名或密码错误', { username, ip: clientIp });
        return reply.status(401).send({
          code: 401,
          message: '用户名或密码错误',
          error: 'Unauthorized'
        });
      }

      // 检查用户是否激活
      if (!user.isActive) {
        await auditLogService.logAction({
          userId: user.id,
          action: 'login_failed',
          actionType: 'auth',
          resourceType: 'user',
          resourceName: username,
          status: 'failed',
          errorMessage: '账户已被禁用',
          ipAddress: clientIp,
          userAgent
        });

        logger.warn('[Auth] 登录失败：账户已禁用', { userId: user.id, username });
        return reply.status(403).send({
          code: 403,
          message: '账户已被禁用，请联系管理员',
          error: 'Forbidden'
        });
      }

      // 创建会话
      const sessionResult = await sessionService.createSession(user, {
        ip: clientIp,
        userAgent,
        deviceType: parseDeviceType(userAgent)
      });

      // 记录审计日志
      await auditLogService.logAction({
        userId: user.id,
        action: 'login_success',
        actionType: 'auth',
        resourceType: 'user',
        resourceName: username,
        status: 'success',
        ipAddress: clientIp,
        userAgent,
        details: {
          sessionId: sessionResult.session.id,
          deviceType: sessionResult.session.deviceType
        }
      });

      // 更新最后登录信息
      await userManager.updateLastLogin(user.id);

      logger.info('[Auth] 用户登录成功', {
        userId: user.id,
        username: user.username,
        ip: clientIp,
        deviceType: sessionResult.session.deviceType,
        responseTime: Date.now() - startTime
      });

      return reply.send({
        code: 0,
        message: '登录成功',
        data: sessionResult
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await auditLogService.logAction({
        userId: null,
        action: 'login_failed',
        actionType: 'auth',
        resourceType: 'user',
        resourceName: username,
        status: 'failed',
        errorMessage: error.message,
        ipAddress: clientIp,
        userAgent
      });

      logger.error('[Auth] 登录失败', {
        username,
        ip: clientIp,
        error: error.message,
        stack: error.stack,
        responseTime
      });

      return reply.status(500).send({
        code: 500,
        message: '登录失败，请稍后重试',
        error: error.message
      });
    }
  });

  /**
   * 注册接口
   */
  fastify.post('/register', async (request, reply) => {
    const { username, password, email, fullName } = request.body;
    const clientIp = request.ip;
    const userAgent = request.headers['user-agent'];

    logger.info('[Auth] 注册请求', { username, email, ip: clientIp });

    try {
      // 验证输入
      if (!username || !password || !email) {
        return reply.status(400).send({
          code: 400,
          message: '用户名、密码和邮箱不能为空',
          error: 'Bad Request'
        });
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          code: 400,
          message: '邮箱格式不正确',
          error: 'Bad Request'
        });
      }

      // 验证用户名格式（3-20个字符，只能包含字母、数字、下划线）
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return reply.status(400).send({
          code: 400,
          message: '用户名必须是3-20个字符，只能包含字母、数字和下划线',
          error: 'Bad Request'
        });
      }

      // 创建用户（userManager会自动加密密码）
      const user = await userManager.createUser({
        username,
        password,
        email,
        fullName,
        role: 'operator' // 默认角色
      });

      // 记录审计日志
      await auditLogService.logAction({
        userId: user.id,
        action: 'register',
        actionType: 'auth',
        resourceType: 'user',
        resourceName: username,
        status: 'success',
        ipAddress: clientIp,
        userAgent,
        details: {
          email,
          fullName
        }
      });

      logger.info('[Auth] 用户注册成功', {
        userId: user.id,
        username,
        email,
        ip: clientIp
      });

      return reply.send({
        code: 0,
        message: '注册成功',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      await auditLogService.logAction({
        userId: null,
        action: 'register_failed',
        actionType: 'auth',
        resourceType: 'user',
        resourceName: username,
        status: 'failed',
        errorMessage: error.message,
        ipAddress: clientIp,
        userAgent
      });

      logger.error('[Auth] 注册失败', {
        username,
        email,
        ip: clientIp,
        error: error.message
      });

      // 返回具体的错误信息
      let statusCode = 500;
      let message = '注册失败，请稍后重试';

      if (error.message.includes('用户名已存在')) {
        statusCode = 409;
        message = '用户名已存在';
      } else if (error.message.includes('邮箱已被使用')) {
        statusCode = 409;
        message = '邮箱已被使用';
      } else if (error.message.includes('密码强度不足')) {
        statusCode = 400;
        message = error.message;
      }

      return reply.status(statusCode).send({
        code: statusCode,
        message,
        error: error.message
      });
    }
  });

  /**
   * 登出接口
   */
  fastify.post('/logout', async (request, reply) => {
    try {
      // 从请求中获取token
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '未授权',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.substring(7);
      const clientIp = request.ip;
      const userAgent = request.headers['user-agent'];

      // 销毁会话
      const success = await sessionService.destroySession(token);

      // 记录审计日志
      const sessionData = await sessionService.verifySession(token);
      if (sessionData) {
        await auditLogService.logAction({
          userId: sessionData.user.id,
          action: 'logout',
          actionType: 'auth',
          resourceType: 'session',
          resourceId: sessionData.session.id,
          status: 'success',
          ipAddress: clientIp,
          userAgent
        });
      }

      logger.info('[Auth] 用户登出', {
        success,
        ip: clientIp,
        token: token.substring(0, 20) + '...'
      });

      return reply.send({
        code: 0,
        message: '登出成功'
      });
    } catch (error) {
      logger.error('[Auth] 登出失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '登出失败',
        error: error.message
      });
    }
  });

  /**
   * 刷新令牌接口
   */
  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken: refreshTokenValue } = request.body;
      const clientIp = request.ip;
      const userAgent = request.headers['user-agent'];

      if (!refreshTokenValue) {
        return reply.status(400).send({
          code: 400,
          message: '刷新令牌不能为空',
          error: 'Bad Request'
        });
      }

      const tokens = await sessionService.refreshTokens(refreshTokenValue);

      if (!tokens) {
        logger.warn('[Auth] 刷新令牌失败：令牌无效或已过期', {
          ip: clientIp,
          token: refreshTokenValue.substring(0, 20) + '...'
        });

        return reply.status(401).send({
          code: 401,
          message: '刷新令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      logger.info('[Auth] 令牌刷新成功', { ip: clientIp });

      return reply.send({
        code: 0,
        message: '令牌刷新成功',
        data: tokens
      });
    } catch (error) {
      logger.error('[Auth] 令牌刷新失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '令牌刷新失败',
        error: error.message
      });
    }
  });

  /**
   * 验证令牌接口
   */
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

      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
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
          user: sessionData.user,
          expiresAt: sessionData.session.expiresAt
        }
      });
    } catch (error) {
      logger.error('[Auth] 令牌验证失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '令牌验证失败',
        error: error.message
      });
    }
  });

  /**
   * 获取当前用户信息接口
   */
  fastify.get('/me', {
    onRequest: [async (request, reply) => {
      // 从Authorization header获取token
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '未授权',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({
          code: 401,
          message: '令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      // 将用户信息附加到request
      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    try {
      // 获取用户的所有活跃会话
      const sessions = await sessionService.getUserSessions(request.user.id);

      return reply.send({
        code: 0,
        message: '获取成功',
        data: {
          user: request.user,
          sessions: sessions.map(s => ({
            id: s.id,
            deviceType: s.deviceType,
            ipAddress: s.ipAddress,
            location: s.location,
            createdAt: s.createdAt,
            lastActivityAt: s.lastActivityAt,
            expiresAt: s.expiresAt,
            isCurrent: s.id === request.session.id
          }))
        }
      });
    } catch (error) {
      logger.error('[Auth] 获取用户信息失败', { error: error.message });
      return reply.status(500).send({
        code: 500,
        message: '获取用户信息失败',
        error: error.message
      });
    }
  });
}

/**
 * 解析设备类型
 */
function parseDeviceType(userAgent) {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    return 'desktop';
  } else {
    return 'unknown';
  }
}

module.exports = authRoutes;
