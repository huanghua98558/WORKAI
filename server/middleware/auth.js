/**
 * 认证和授权中间件
 * 用于 Fastify 路由的认证和权限检查
 */

const authService = require('../services/auth.service');
const { auditLogManager } = require('../database/auditLogManager');
const { getLogger } = require('../lib/logger');

const logger = getLogger('AUTH_MIDDLEWARE');

// 定义角色
const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

/**
 * 认证中间件
 * 验证用户身份，将用户信息附加到 request 对象
 */
function authMiddleware(request, reply, done) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader) {
    return reply.code(401).send({
      success: false,
      error: '未提供认证信息',
      code: 'NO_TOKEN'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      success: false,
      error: '认证格式错误，应使用 Bearer Token',
      code: 'INVALID_TOKEN_FORMAT'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = authService.verifyToken(token);
    
    // 将用户信息附加到 request
    request.user = decoded;
    
    logger.debug('用户认证成功', { 
      userId: decoded.userId, 
      username: decoded.username,
      role: decoded.role 
    });
    
    done();
  } catch (error) {
    let code = 'INVALID_TOKEN';
    let message = 'Token 无效';
    
    if (error.message === 'Token 已过期') {
      code = 'TOKEN_EXPIRED';
      message = 'Token 已过期，请重新登录';
    }
    
    logger.warn('用户认证失败', { code, error: error.message });
    
    reply.code(401).send({
      success: false,
      error: message,
      code
    });
  }
}

/**
 * 角色检查中间件
 * 验证用户是否有指定角色
 */
function requireRole(...allowedRoles) {
  return function(request, reply, done) {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: '未认证',
        code: 'UNAUTHORIZED'
      });
    }

    const userRole = request.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      logger.warn('用户权限不足', { 
        userRole, 
        allowedRoles,
        userId: request.user.userId 
      });
      
      return reply.code(403).send({
        success: false,
        error: '权限不足',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: userRole
      });
    }

    done();
  };
}

/**
 * 仅管理员访问
 */
function requireAdmin(request, reply, done) {
  return requireRole(ROLES.ADMIN)(request, reply, done);
}

/**
 * 管理员或操作员访问
 */
function requireOperator(request, reply, done) {
  return requireRole(ROLES.ADMIN, ROLES.OPERATOR)(request, reply, done);
}

/**
 * 可选认证中间件
 * 如果提供了 Token 则验证，否则继续（用于需要用户信息但不强制认证的接口）
 */
function optionalAuthMiddleware(request, reply, done) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 没有 Token，继续执行
    done();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = authService.verifyToken(token);
    request.user = decoded;
  } catch (error) {
    // Token 无效，但不阻止请求
    logger.debug('可选认证 Token 无效', { error: error.message });
  }
  
  done();
}

/**
 * 记录 API 调用审计日志的中间件装饰器
 */
function withAuditLog(action, resource) {
  return function(request, reply, done) {
    // 记录原始 send 方法
    const originalSend = reply.send;
    
    // 拦截 send 方法
    reply.send = function(payload) {
      // 如果请求已认证且操作成功，记录审计日志
      if (request.user && reply.statusCode < 400) {
        const resourceId = request.params?.id || request.body?.id;
        
        auditLogManager.recordUserAction(
          request.user.userId,
          request.user.username,
          action,
          resource,
          resourceId,
          {
            method: request.method,
            url: request.url,
            body: request.body
          },
          request
        ).catch(err => {
          logger.error('记录审计日志失败', { error: err.message });
        });
      }
      
      return originalSend.call(this, payload);
    };
    
    done();
  };
}

/**
 * 错误码定义
 */
const ERROR_CODES = {
  NO_TOKEN: 'NO_TOKEN',
  INVALID_TOKEN_FORMAT: 'INVALID_TOKEN_FORMAT',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN'
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireAdmin,
  requireOperator,
  withAuditLog,
  ROLES,
  ERROR_CODES
};
