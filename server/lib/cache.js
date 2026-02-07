/**
 * 缓存服务
 * 提供统一的缓存操作接口
 */

const redisClient = require('./redis');

class CacheService {
  constructor() {
    this.defaultTTL = 300; // 默认过期时间 5 分钟
    this.client = null;
    this.logger = require('./logger').getLogger('CACHE');
  }

  /**
   * 初始化缓存客户端
   */
  async init() {
    this.client = await redisClient.connect();
    this.logger.info('缓存服务初始化完成');
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值，不存在返回 null
   */
  async get(key) {
    try {
      if (!this.client) {
        await this.init();
      }

      const value = await this.client.get(key);
      if (value) {
        this.logger.debug(`缓存命中: ${key}`);
        return JSON.parse(value);
      }

      this.logger.debug(`缓存未命中: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`获取缓存失败: ${key}`, { error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒），默认 5 分钟
   * @returns {boolean} 是否成功
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!this.client) {
        await this.init();
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setex(key, ttl, serializedValue);
      this.logger.debug(`缓存已设置: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      this.logger.error(`设置缓存失败: ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {boolean} 是否成功
   */
  async del(key) {
    try {
      if (!this.client) {
        await this.init();
      }

      await this.client.del(key);
      this.logger.debug(`缓存已删除: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`删除缓存失败: ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * 删除匹配模式的缓存
   * @param {string} pattern - 匹配模式（支持通配符 *）
   * @returns {number} 删除的数量
   */
  async delPattern(pattern) {
    try {
      if (!this.client) {
        await this.init();
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(...keys);
      this.logger.info(`批量删除缓存: ${pattern} (${keys.length} 个)`);
      return keys.length;
    } catch (error) {
      this.logger.error(`批量删除缓存失败: ${pattern}`, { error: error.message });
      return 0;
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  async exists(key) {
    try {
      if (!this.client) {
        await this.init();
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`检查缓存存在失败: ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   * @param {string} key - 缓存键
   * @param {Function} fetchFn - 数据获取函数
   * @param {number} ttl - 过期时间（秒）
   * @returns {any} 缓存值
   */
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    // 尝试从缓存获取
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // 从数据源获取
    try {
      const value = await fetchFn();

      // 缓存空值（防止缓存穿透）
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      this.logger.error(`获取数据失败: ${key}`, { error: error.message });
      throw error;
    }
  }

  /**
   * 批量获取缓存
   * @param {string[]} keys - 缓存键数组
   * @returns {any[]} 缓存值数组
   */
  async mget(keys) {
    try {
      if (!this.client) {
        await this.init();
      }

      const values = await this.client.mget(...keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      this.logger.error('批量获取缓存失败', { error: error.message });
      return new Array(keys.length).fill(null);
    }
  }

  /**
   * 批量设置缓存
   * @param {Array<{key: string, value: any, ttl?: number}>} items - 缓存项数组
   * @returns {boolean} 是否成功
   */
  async mset(items) {
    try {
      if (!this.client) {
        await this.init();
      }

      for (const item of items) {
        const ttl = item.ttl || this.defaultTTL;
        await this.set(item.key, item.value, ttl);
      }

      this.logger.info(`批量设置缓存: ${items.length} 个`);
      return true;
    } catch (error) {
      this.logger.error('批量设置缓存失败', { error: error.message });
      return false;
    }
  }

  /**
   * 增加计数器
   * @param {string} key - 键
   * @param {number} increment - 增量，默认 1
   * @returns {number} 新的值
   */
  async incr(key, increment = 1) {
    try {
      if (!this.client) {
        await this.init();
      }

      let value = await this.client.incr(key);
      if (increment > 1) {
        // Redis INCR 每次只能增加 1，需要循环
        for (let i = 1; i < increment; i++) {
          value = await this.client.incr(key);
        }
      }

      return value;
    } catch (error) {
      this.logger.error(`增加计数器失败: ${key}`, { error: error.message });
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  async getStats() {
    try {
      if (!this.client) {
        await this.init();
      }

      // 获取 Redis INFO 命令的输出
      const info = await this.client.info('stats');
      const lines = info.split('\n');

      const stats = {
        total_commands: 0,
        total_connections: 0,
        total_keys: 0
      };

      for (const line of lines) {
        if (line.startsWith('total_commands_processed:')) {
          stats.total_commands = parseInt(line.split(':')[1]);
        } else if (line.startsWith('total_connections_received:')) {
          stats.total_connections = parseInt(line.split(':')[1]);
        } else if (line.startsWith('keyspace_hits:') || line.startsWith('keyspace_misses:')) {
          // key 命中/未命中统计
        }
      }

      // 获取数据库键的数量
      const dbsize = await this.client.dbsize();
      stats.total_keys = dbsize;

      return stats;
    } catch (error) {
      this.logger.error('获取缓存统计失败', { error: error.message });
      return null;
    }
  }

  /**
   * 清空所有缓存
   * @returns {boolean} 是否成功
   */
  async flushAll() {
    try {
      if (!this.client) {
        await this.init();
      }

      await this.client.flushdb();
      this.logger.warn('所有缓存已清空');
      return true;
    } catch (error) {
      this.logger.error('清空缓存失败', { error: error.message });
      return false;
    }
  }
}

// 导出单例
const cacheService = new CacheService();

module.exports = cacheService;
