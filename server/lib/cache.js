/**
 * 缓存服务
 * 提供统一的缓存操作接口，支持双层缓存策略：
 * - L1: 内存缓存（优先，无网络开销）
 * - L2: Redis缓存（降级，持久化）
 */

const redisClient = require('./redis');

/**
 * L1 内存缓存项
 */
class MemoryCacheItem {
  constructor(value, ttl) {
    this.value = value;
    this.expiresAt = Date.now() + ttl * 1000;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

class CacheService {
  constructor() {
    this.defaultTTL = 300; // 默认过期时间 5 分钟
    this.l1TTL = 60; // L1 内存缓存默认过期时间 1 分钟
    this.l2TTL = 300; // L2 Redis 缓存默认过期时间 5 分钟
    this.client = null;
    this.logger = require('./logger').getLogger('CACHE');

    // L1 内存缓存
    this.l1Cache = new Map();
    this.l1Stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // 定期清理过期的 L1 缓存
    this.startL1Cleanup();
  }

  /**
   * 初始化缓存客户端
   */
  async init() {
    this.client = await redisClient.connect();
    this.logger.info('缓存服务初始化完成 (L1: 内存 + L2: Redis)');
  }

  /**
   * 从 L1 内存缓存获取
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值，不存在或已过期返回 null
   */
  getL1(key) {
    const item = this.l1Cache.get(key);

    if (!item) {
      this.l1Stats.misses++;
      return null;
    }

    if (item.isExpired()) {
      this.l1Cache.delete(key);
      this.l1Stats.misses++;
      return null;
    }

    this.l1Stats.hits++;
    this.logger.debug(`L1 缓存命中: ${key}`);
    return item.value;
  }

  /**
   * 设置 L1 内存缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   */
  setL1(key, value, ttl = this.l1TTL) {
    this.l1Cache.set(key, new MemoryCacheItem(value, ttl));
    this.l1Stats.sets++;
    this.logger.debug(`L1 缓存已设置: ${key} (TTL: ${ttl}s)`);

    // 限制 L1 缓存大小，避免内存占用过大
    if (this.l1Cache.size > 1000) {
      this.cleanupL1Cache();
    }
  }

  /**
   * 删除 L1 内存缓存
   * @param {string} key - 缓存键
   */
  deleteL1(key) {
    const deleted = this.l1Cache.delete(key);
    if (deleted) {
      this.l1Stats.deletes++;
      this.logger.debug(`L1 缓存已删除: ${key}`);
    }
    return deleted;
  }

  /**
   * 清理过期的 L1 缓存
   */
  cleanupL1Cache() {
    const before = this.l1Cache.size;
    for (const [key, item] of this.l1Cache.entries()) {
      if (item.isExpired()) {
        this.l1Cache.delete(key);
      }
    }
    const after = this.l1Cache.size;
    if (before !== after) {
      this.logger.debug(`L1 缓存清理完成: 删除 ${before - after} 个过期项`);
    }
  }

  /**
   * 启动 L1 缓存定期清理任务
   */
  startL1Cleanup() {
    // 每分钟清理一次过期的 L1 缓存
    setInterval(() => {
      this.cleanupL1Cache();
    }, 60000);
  }

  /**
   * 获取 L1 缓存统计信息
   */
  getL1Stats() {
    return {
      ...this.l1Stats,
      size: this.l1Cache.size,
      hitRate: this.l1Stats.hits / (this.l1Stats.hits + this.l1Stats.misses) || 0
    };
  }

  /**
   * 获取缓存（分层策略：L1 内存优先（热点数据）→ L2 Redis 降级）
   * Redis 作为主要缓存源，L1 作为热点数据加速层
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值，不存在返回 null
   */
  async get(key) {
    try {
      // 优先从 L1 内存缓存获取（热点数据，无网络开销）
      const l1Value = this.getL1(key);
      if (l1Value !== null) {
        this.logger.debug(`L1 缓存命中（热点数据）: ${key}`);
        return l1Value;
      }

      // L1 未命中，从 L2 Redis 缓存获取（主缓存源）
      if (!this.client) {
        await this.init();
      }

      const l2Value = await this.client.get(key);
      if (l2Value) {
        const parsedValue = JSON.parse(l2Value);
        // 回填 L1 内存缓存（热点数据本地加速）
        this.setL1(key, parsedValue, this.l1TTL);
        this.logger.debug(`L2 缓存命中并回填 L1: ${key}`);
        return parsedValue;
      }

      this.logger.debug(`缓存未命中 (L1+L2): ${key}`);
      return null;
    } catch (error) {
      // Redis 异常时，继续从 L1 内存缓存获取（降级）
      this.logger.error(`Redis 获取失败，检查 L1: ${key}`, { error: error.message });
      const l1Value = this.getL1(key);
      if (l1Value !== null) {
        this.logger.debug(`L1 缓存命中（降级）: ${key}`);
        return l1Value;
      }
      this.logger.debug(`缓存未命中（L1+L2 均不可用）: ${key}`);
      return null;
    }
  }

  /**
   * 设置缓存（分层策略：同时写入 L1 和 L2）
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒），默认 5 分钟
   * @returns {boolean} 是否成功
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      // 同时写入 L1 和 L2
      this.setL1(key, value, Math.min(ttl, this.l1TTL));

      if (!this.client) {
        await this.init();
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setex(key, ttl, serializedValue);
      this.logger.debug(`缓存已设置 (L1+L2): ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      this.logger.error(`设置缓存失败: ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * 删除缓存（分层策略：同时删除 L1 和 L2）
   * @param {string} key - 缓存键
   * @returns {boolean} 是否成功
   */
  async del(key) {
    try {
      // 同时删除 L1 和 L2
      this.deleteL1(key);

      if (!this.client) {
        await this.init();
      }

      await this.client.del(key);
      this.logger.debug(`缓存已删除 (L1+L2): ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`删除缓存失败: ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * 删除匹配模式的缓存（分层策略：同时删除 L1 和 L2）
   * @param {string} pattern - 匹配模式（支持通配符 *）
   * @returns {number} 删除的数量
   */
  async delPattern(pattern) {
    try {
      // 删除 L1 匹配的缓存
      const l1Keys = Array.from(this.l1Cache.keys()).filter(key => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(key);
      });
      l1Keys.forEach(key => this.deleteL1(key));

      // 删除 L2 匹配的缓存
      if (!this.client) {
        await this.init();
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return l1Keys.length;
      }

      await this.client.del(...keys);
      this.logger.info(`批量删除缓存 (L1+L2): ${pattern} (L1: ${l1Keys.length}, L2: ${keys.length})`);
      return l1Keys.length + keys.length;
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
   * 获取缓存统计信息（包含 L1 和 L2）
   * @returns {Object} 统计信息
   */
  async getStats() {
    try {
      if (!this.client) {
        await this.init();
      }

      // L1 内存缓存统计
      const l1Stats = this.getL1Stats();

      // L2 Redis 缓存统计
      const info = await this.client.info('stats');
      const lines = info.split('\n');

      const l2Stats = {
        total_commands: 0,
        total_connections: 0,
        total_keys: 0
      };

      for (const line of lines) {
        if (line.startsWith('total_commands_processed:')) {
          l2Stats.total_commands = parseInt(line.split(':')[1]);
        } else if (line.startsWith('total_connections_received:')) {
          l2Stats.total_connections = parseInt(line.split(':')[1]);
        }
      }

      // 获取数据库键的数量
      const dbsize = await this.client.dbsize();
      l2Stats.total_keys = dbsize;

      return {
        l1: l1Stats,
        l2: l2Stats,
        summary: {
          totalHits: l1Stats.hits,
          totalMisses: l1Stats.misses,
          overallHitRate: l1Stats.hitRate,
          l1HitRate: l1Stats.hitRate
        }
      };
    } catch (error) {
      this.logger.error('获取缓存统计失败', { error: error.message });
      return null;
    }
  }

  /**
   * 清空所有缓存（分层策略：同时清空 L1 和 L2）
   * @returns {boolean} 是否成功
   */
  async flushAll() {
    try {
      // 清空 L1 缓存
      this.l1Cache.clear();
      this.l1Stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      };

      // 清空 L2 缓存
      if (!this.client) {
        await this.init();
      }

      await this.client.flushdb();
      this.logger.warn('所有缓存已清空 (L1+L2)');
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
