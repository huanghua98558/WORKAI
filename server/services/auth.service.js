/**
 * 认证服务
 * 负责用户登录、Token 生成和验证
 */

const jwt = require('jsonwebtoken');
const { userManager } = require('../database');
const { getLogger } = require('../lib/logger');

class AuthService {
  constructor() {
    this.logger = getLogger('AUTH_SERVICE');
    
    // JWT 配置
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production-min-32-chars';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = '7d';
    
    // 检查 JWT Secret 是否是默认值
    if (this.jwtSecret === 'your-secret-key-change-in-production-min-32-chars') {
      this.logger.warn('⚠️  使用默认 JWT Secret，生产环境请务必修改！');
    }
    
    if (this.jwtSecret.length < 32) {
      this.logger.error('❌ JWT Secret 长度不足 32 字符，请修改！建议使用随机字符串');
    }
  }

  /**
   * 用户登录
   */
  async login(username, password, request) {
    try {
      this.logger.info('用户登录请求', { username });

      // 验证用户
      const user = await userManager.validatePassword(username, password);
      if (!user) {
        // 暂时禁用审计日志
        // try {
        //   const auditLogManager = require('../database/auditLogManager');
        //   await auditLogManager.recordLogin(null, username, request, 'failure', '用户名或密码错误');
        // } catch (logError) {
        //   this.logger.warn('记录登录失败日志失败', { error: logError.message });
        // }
        
        throw new Error('用户名或密码错误');
      }

      // 检查用户是否被禁用
      if (!user.isActive) {
        // 暂时禁用审计日志
        // try {
        //   const auditLogManager = require('../database/auditLogManager');
        //   await auditLogManager.recordLogin(user.id, username, request, 'failure', '用户已被禁用');
        // } catch (logError) {
        //   this.logger.warn('记录登录失败日志失败', { error: logError.message });
        // }
        
        throw new Error('用户已被禁用');
      }

      // 生成 Token
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // 更新最后登录时间
      await userManager.updateLastLogin(user.id);

      // 记录成功日志（暂时禁用）
      // try {
      //   const auditLogManager = require('../database/auditLogManager');
      //   await auditLogManager.recordLogin(user.id, username, request);
      // } catch (logError) {
      //   this.logger.warn('记录登录成功日志失败', { error: logError.message });
      // }

      this.logger.info('用户登录成功', { userId: user.id, username: user.username });

      return {
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      };
    } catch (error) {
      this.logger.error('用户登录失败', { username, error: error.message });
      throw error;
    }
  }

  /**
   * 生成访问 Token
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.jwtExpiresIn 
    });
  }

  /**
   * 生成刷新 Token
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh'
    };
    
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.refreshTokenExpiresIn 
    });
  }

  /**
   * 验证 Token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token 已过期');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token 无效');
      }
      throw new Error('Token 验证失败');
    }
  }

  /**
   * 刷新 Token
   */
  async refresh(refreshToken, request) {
    try {
      this.logger.info('刷新 Token 请求');

      // 验证刷新 Token
      const decoded = this.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new Error('无效的刷新 Token');
      }

      // 获取用户信息
      const user = await userManager.getUserById(decoded.userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.isActive) {
        throw new Error('用户已被禁用');
      }

      // 生成新 Token
      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      this.logger.info('Token 刷新成功', { userId: user.id, username: user.username });

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      this.logger.error('Token 刷新失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 登出
   * JWT 是无状态的，登出主要是前端删除 Token
   * 这里可以记录登出日志
   */
  async logout(user, request) {
    try {
      if (user) {
        // 暂时禁用审计日志
        // try {
        //   const auditLogManager = require('../database/auditLogManager');
        //   await auditLogManager.recordLogout(user.userId, user.username, request);
        // } catch (logError) {
        //   this.logger.warn('记录登出日志失败', { error: logError.message });
        // }
        
        this.logger.info('用户登出', { userId: user.userId, username: user.username });
      }
      
      return { message: '登出成功' };
    } catch (error) {
      this.logger.error('用户登出失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 解析 Token（不验证过期时间）
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error('Token 解析失败');
    }
  }

  /**
   * 获取 Token 剩余时间（秒）
   */
  getTokenRemainingTime(token) {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp - now;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new AuthService();
