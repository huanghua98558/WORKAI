/**
 * 用户缓存服务
 * 用于缓存用户认证信息、权限等，减少数据库查询
 */

const cacheService = require('../lib/cache');
const userManager = require('../database/userManager');
const { getLogger } = require('../lib/logger');

class UserCacheService {
  constructor() {
    this.logger = getLogger('USER_CACHE');
    this.cachePrefix = 'user:';
    this.cacheTTL = 1800; // 30 分钟（30 * 60）
  }

  /**
   * 生成用户缓存键
   * @param {string} userId - 用户 ID
   * @returns {string} 缓存键
   */
  getCacheKey(userId) {
    return `${this.cachePrefix}${userId}`;
  }

  /**
   * 生成用户会话缓存键
   * @param {string} userId - 用户 ID
   * @param {string} token - JWT Token
   * @returns {string} 缓存键
   */
  getSessionCacheKey(userId, token) {
    return `${this.cachePrefix}session:${userId}:${this.hashToken(token)}`;
  }

  /**
   * 对 Token 进行简单哈希（用于生成缓存键）
   */
  hashToken(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取用户信息（优先从缓存）
   * @param {string} userId - 用户 ID
   * @returns {Object|null} 用户信息
   */
  async getUser(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        this.logger.info('[用户缓存] 命中缓存', { userId });
        return cached;
      }

      // 缓存未命中，从数据库查询
      const user = await userManager.getUserById(userId);
      
      if (user) {
        // 存入缓存
        await cacheService.set(cacheKey, user, this.cacheTTL);
        this.logger.info('[用户缓存] 缓存未命中，已缓存', { userId, username: user.username });
      }

      return user;
    } catch (error) {
      this.logger.error('[用户缓存] 获取用户失败', { userId, error: error.message });
      return null;
    }
  }

  /**
   * 通过用户名获取用户信息（优先从缓存）
   * @param {string} username - 用户名
   * @returns {Object|null} 用户信息
   */
  async getUserByUsername(username) {
    try {
      // 先从数据库查询用户 ID
      const user = await userManager.getUserByUsername(username);
      
      if (!user) {
        return null;
      }

      // 然后通过缓存服务获取完整信息
      return await this.getUser(user.id);
    } catch (error) {
      this.logger.error('[用户缓存] 通过用户名获取失败', { username, error: error.message });
      return null;
    }
  }

  /**
   * 缓存用户信息
   * @param {Object} user - 用户信息
   * @param {number} ttl - 缓存时间（秒）
   */
  async setUser(user, ttl = this.cacheTTL) {
    try {
      const cacheKey = this.getCacheKey(user.id);
      await cacheService.set(cacheKey, user, ttl);
      this.logger.info('[用户缓存] 用户信息已缓存', { userId: user.id, username: user.username });
      return true;
    } catch (error) {
      this.logger.error('[用户缓存] 缓存用户失败', { userId: user.id, error: error.message });
      return false;
    }
  }

  /**
   * 删除用户缓存
   * @param {string} userId - 用户 ID
   */
  async deleteUser(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      await cacheService.del(cacheKey);
      
      // 同时删除用户会话缓存
      await cacheService.delPattern(`${this.cachePrefix}session:${userId}:*`);
      
      this.logger.info('[用户缓存] 用户缓存已删除', { userId });
      return true;
    } catch (error) {
      this.logger.error('[用户缓存] 删除用户缓存失败', { userId, error: error.message });
      return false;
    }
  }

  /**
   * 更新用户缓存
   * @param {string} userId - 用户 ID
   * @param {Object} updates - 更新内容
   */
  async updateUser(userId, updates) {
    try {
      const user = await this.getUser(userId);
      
      if (user) {
        const updated = { ...user, ...updates };
        await this.setUser(updated);
        
        // 同时更新数据库
        await userManager.updateUser(userId, updates);
        
        this.logger.info('[用户缓存] 用户缓存已更新', { userId });
        return updated;
      }
      
      return null;
    } catch (error) {
      this.logger.error('[用户缓存] 更新用户缓存失败', { userId, error: error.message });
      return null;
    }
  }

  /**
   * 缓存用户会话信息（登录时调用）
   * @param {Object} user - 用户信息
   * @param {string} token - JWT Token
   * @param {Object} sessionInfo - 会话信息（IP、User-Agent 等）
   */
  async setUserSession(user, token, sessionInfo = {}) {
    try {
      const sessionKey = this.getSessionCacheKey(user.id, token);
      const sessionData = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        ...sessionInfo,
        loginTime: new Date().toISOString()
      };

      // 会话缓存时间较长（与 Token 过期时间一致）
      const sessionTTL = 7200; // 2 小时（与 JWT Token 过期时间一致）
      await cacheService.set(sessionKey, sessionData, sessionTTL);
      
      this.logger.info('[用户缓存] 用户会话已缓存', {
        userId: user.id,
        username: user.username
      });
      
      return sessionData;
    } catch (error) {
      this.logger.error('[用户缓存] 缓存用户会话失败', {
        userId: user.id,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 获取用户会话信息
   * @param {string} userId - 用户 ID
   * @param {string} token - JWT Token
   * @returns {Object|null} 会话信息
   */
  async getUserSession(userId, token) {
    try {
      const sessionKey = this.getSessionCacheKey(userId, token);
      const session = await cacheService.get(sessionKey);
      
      if (session) {
        this.logger.info('[用户缓存] 会话命中缓存', { userId });
      }
      
      return session;
    } catch (error) {
      this.logger.error('[用户缓存] 获取用户会话失败', {
        userId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 删除用户会话（登出时调用）
   * @param {string} userId - 用户 ID
   * @param {string} token - JWT Token
   */
  async deleteUserSession(userId, token) {
    try {
      const sessionKey = this.getSessionCacheKey(userId, token);
      await cacheService.del(sessionKey);
      
      this.logger.info('[用户缓存] 用户会话已删除', { userId });
      return true;
    } catch (error) {
      this.logger.error('[用户缓存] 删除用户会话失败', {
        userId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 删除用户所有会话（强制登出时调用）
   * @param {string} userId - 用户 ID
   */
  async deleteUserAllSessions(userId) {
    try {
      await cacheService.delPattern(`${this.cachePrefix}session:${userId}:*`);
      
      this.logger.info('[用户缓存] 用户所有会话已删除', { userId });
      return true;
    } catch (error) {
      this.logger.error('[用户缓存] 删除用户所有会话失败', {
        userId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 批量缓存用户列表
   * @param {Array<Object>} users - 用户列表
   */
  async setUserList(users) {
    try {
      const promises = users.map(user => this.setUser(user));
      await Promise.all(promises);
      
      this.logger.info('[用户缓存] 批量缓存用户完成', { count: users.length });
      return true;
    } catch (error) {
      this.logger.error('[用户缓存] 批量缓存用户失败', { error: error.message });
      return false;
    }
  }

  /**
   * 清空所有用户缓存（谨慎使用）
   */
  async clearAllUserCache() {
    try {
      await cacheService.delPattern(`${this.cachePrefix}*`);
      
      this.logger.warn('[用户缓存] 所有用户缓存已清空');
      return true;
    } catch (error) {
      this.logger.error('[用户缓存] 清空用户缓存失败', { error: error.message });
      return false;
    }
  }
}

exports.userCacheService = new UserCacheService();
