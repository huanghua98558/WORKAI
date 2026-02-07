/**
 * 消息缓存服务
 * 用于缓存会话消息、消息统计等高频查询数据
 */

const cacheService = require('../lib/cache');
const { getLogger } = require('../lib/logger');

class MessageCacheService {
  constructor() {
    this.logger = getLogger('MESSAGE_CACHE');
    this.prefix = 'message:';
    this.defaultTTL = 120; // 默认 2 分钟
    this.messageListTTL = 60; // 消息列表 1 分钟
    this.statsTTL = 180; // 统计数据 3 分钟
  }

  /**
   * 生成会话消息缓存键
   */
  getSessionKey(sessionId) {
    return `${this.prefix}session:${sessionId}`;
  }

  /**
   * 生成用户消息缓存键
   */
  getUserKey(userId) {
    return `${this.prefix}user:${userId}`;
  }

  /**
   * 生成消息搜索缓存键
   */
  getSearchKey(keyword, limit) {
    const hash = this.hashKeyword(keyword);
    return `${this.prefix}search:${hash}:${limit}`;
  }

  /**
   * 生成会话统计缓存键
   */
  getStatsKey(sessionId) {
    return `${this.prefix}stats:${sessionId}`;
  }

  /**
   * 关键词哈希（用于缓存键）
   */
  hashKeyword(keyword) {
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      const char = keyword.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取会话消息列表（带缓存）
   */
  async getSessionMessages(sessionId, limit = 100) {
    try {
      const cacheKey = this.getSessionKey(sessionId);
      
      // 尝试从缓存获取
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        this.logger.info('[消息缓存] 会话消息命中缓存', { sessionId, count: cached.length });
        return cached;
      }

      // 缓存未命中，返回 null（由调用者从数据库查询）
      this.logger.debug('[消息缓存] 会话消息未命中缓存', { sessionId });
      return null;
    } catch (error) {
      this.logger.error('[消息缓存] 获取会话消息失败', { sessionId, error: error.message });
      return null;
    }
  }

  /**
   * 设置会话消息列表缓存
   */
  async setSessionMessages(sessionId, messages, limit = 100) {
    try {
      const cacheKey = this.getSessionKey(sessionId);
      const success = await cacheService.set(cacheKey, messages, this.messageListTTL);
      
      if (success) {
        this.logger.info('[消息缓存] 会话消息已缓存', { sessionId, count: messages.length });
      }
      
      return success;
    } catch (error) {
      this.logger.error('[消息缓存] 设置会话消息缓存失败', { sessionId, error: error.message });
      return false;
    }
  }

  /**
   * 删除会话消息缓存
   */
  async deleteSessionMessages(sessionId) {
    try {
      const cacheKey = this.getSessionKey(sessionId);
      await cacheService.del(cacheKey);
      this.logger.info('[消息缓存] 会话消息缓存已删除', { sessionId });
      return true;
    } catch (error) {
      this.logger.error('[消息缓存] 删除会话消息缓存失败', { sessionId, error: error.message });
      return false;
    }
  }

  /**
   * 获取用户消息列表（带缓存）
   */
  async getUserMessages(userId, limit = 50) {
    try {
      const cacheKey = this.getUserKey(userId);
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        this.logger.info('[消息缓存] 用户消息命中缓存', { userId, count: cached.length });
        return cached;
      }

      this.logger.debug('[消息缓存] 用户消息未命中缓存', { userId });
      return null;
    } catch (error) {
      this.logger.error('[消息缓存] 获取用户消息失败', { userId, error: error.message });
      return null;
    }
  }

  /**
   * 设置用户消息列表缓存
   */
  async setUserMessages(userId, messages, limit = 50) {
    try {
      const cacheKey = this.getUserKey(userId);
      const success = await cacheService.set(cacheKey, messages, this.messageListTTL);
      
      if (success) {
        this.logger.info('[消息缓存] 用户消息已缓存', { userId, count: messages.length });
      }
      
      return success;
    } catch (error) {
      this.logger.error('[消息缓存] 设置用户消息缓存失败', { userId, error: error.message });
      return false;
    }
  }

  /**
   * 删除用户消息缓存
   */
  async deleteUserMessages(userId) {
    try {
      const cacheKey = this.getUserKey(userId);
      await cacheService.del(cacheKey);
      this.logger.info('[消息缓存] 用户消息缓存已删除', { userId });
      return true;
    } catch (error) {
      this.logger.error('[消息缓存] 删除用户消息缓存失败', { userId, error: error.message });
      return false;
    }
  }

  /**
   * 获取搜索消息结果（带缓存）
   */
  async getSearchMessages(keyword, limit = 50) {
    try {
      const cacheKey = this.getSearchKey(keyword, limit);
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        this.logger.info('[消息缓存] 消息搜索命中缓存', { keyword, count: cached.length });
        return cached;
      }

      this.logger.debug('[消息缓存] 消息搜索未命中缓存', { keyword });
      return null;
    } catch (error) {
      this.logger.error('[消息缓存] 获取搜索消息失败', { keyword, error: error.message });
      return null;
    }
  }

  /**
   * 设置搜索消息缓存
   */
  async setSearchMessages(keyword, messages, limit = 50) {
    try {
      const cacheKey = this.getSearchKey(keyword, limit);
      const success = await cacheService.set(cacheKey, messages, this.messageListTTL);
      
      if (success) {
        this.logger.info('[消息缓存] 消息搜索已缓存', { keyword, count: messages.length });
      }
      
      return success;
    } catch (error) {
      this.logger.error('[消息缓存] 设置消息搜索缓存失败', { keyword, error: error.message });
      return false;
    }
  }

  /**
   * 获取会话统计（带缓存）
   */
  async getSessionStats(sessionId) {
    try {
      const cacheKey = this.getStatsKey(sessionId);
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        this.logger.info('[消息缓存] 会话统计命中缓存', { sessionId });
        return cached;
      }

      this.logger.debug('[消息缓存] 会话统计未命中缓存', { sessionId });
      return null;
    } catch (error) {
      this.logger.error('[消息缓存] 获取会话统计失败', { sessionId, error: error.message });
      return null;
    }
  }

  /**
   * 设置会话统计缓存
   */
  async setSessionStats(sessionId, stats) {
    try {
      const cacheKey = this.getStatsKey(sessionId);
      const success = await cacheService.set(cacheKey, stats, this.statsTTL);
      
      if (success) {
        this.logger.info('[消息缓存] 会话统计已缓存', { sessionId, stats });
      }
      
      return success;
    } catch (error) {
      this.logger.error('[消息缓存] 设置会话统计缓存失败', { sessionId, error: error.message });
      return false;
    }
  }

  /**
   * 删除会话统计缓存
   */
  async deleteSessionStats(sessionId) {
    try {
      const cacheKey = this.getStatsKey(sessionId);
      await cacheService.del(cacheKey);
      this.logger.info('[消息缓存] 会话统计缓存已删除', { sessionId });
      return true;
    } catch (error) {
      this.logger.error('[消息缓存] 删除会话统计缓存失败', { sessionId, error: error.message });
      return false;
    }
  }

  /**
   * 清空所有消息缓存
   */
  async clearAll() {
    try {
      await cacheService.delPattern(`${this.prefix}*`);
      this.logger.warn('[消息缓存] 所有消息缓存已清空');
      return true;
    } catch (error) {
      this.logger.error('[消息缓存] 清空消息缓存失败', { error: error.message });
      return false;
    }
  }

  /**
   * 批量删除会话消息缓存
   */
  async deleteBatchSessionMessages(sessionIds) {
    try {
      const keys = sessionIds.map(id => this.getSessionKey(id));
      await Promise.all(keys.map(key => cacheService.del(key)));
      this.logger.info('[消息缓存] 批量删除会话消息缓存', { count: sessionIds.length });
      return true;
    } catch (error) {
      this.logger.error('[消息缓存] 批量删除会话消息缓存失败', { error: error.message });
      return false;
    }
  }
}

module.exports = new MessageCacheService();
