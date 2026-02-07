/**
 * Redis 客户端管理
 * 支持内存模式降级
 */

const { getLogger } = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
    this.memoryStore = new Map(); // 内存存储
    this.useMemoryMode = false;
    this.memoryClient = null; // 缓存内存客户端
    this.logger = getLogger('REDIS');
  }

  async connect() {
    // 检查是否强制使用内存模式
    if (process.env.USE_MEMORY_MODE === 'true') {
      this.useMemoryMode = true;
      this.logger.info('使用内存模式（配置指定）');
      return this.getMemoryClient();
    }

    // 尝试连接 Redis
    try {
      const Redis = require('ioredis');
      let config;

      // 优先使用 REDIS_URL（支持 Upstash Redis）
      if (process.env.REDIS_URL) {
        config = process.env.REDIS_URL;
        this.logger.info('使用 REDIS_URL 连接 Redis');
      } else {
        // 使用传统配置方式
        config = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || 6379),
          db: parseInt(process.env.REDIS_DB || 0),
          connectTimeout: 5000,
          maxRetriesPerRequest: 3
        };

        if (process.env.REDIS_PASSWORD) {
          config.password = process.env.REDIS_PASSWORD;
        }
      }

      this.client = new Redis(config);
      this.publisher = new Redis(config);
      this.subscriber = new Redis(config);

      // 简化的错误处理
      this.client.on('error', () => {}); // 静默错误

      // ioredis 默认是懒连接，不需要手动调用 connect()
      // 直接进行 ping 测试
      try {
        await this.client.ping();
        this.logger.info('Redis 客户端已连接', {
          mode: process.env.REDIS_URL ? 'URL' : 'Config',
          config: process.env.REDIS_URL ? 'Upstash Redis' : `${config.host}:${config.port}`
        });
        return this.client;
      } catch (error) {
        throw error;
      }
    } catch (error) {
      this.logger.warn('Redis 连接失败，切换到内存模式', {
        error: error.message,
        mode: process.env.REDIS_URL ? 'URL' : 'Config'
      });
      this.useMemoryMode = true;
      this.client = this.publisher = this.subscriber = null;
      return this.getMemoryClient();
    }
  }

  getMemoryClient() {
    // 缓存内存客户端
    if (this.memoryClient) {
      return this.memoryClient;
    }

    // 创建一个模拟的 Redis 客户端接口
    const memoryClient = {
      get: async (key) => this.memoryStore.get(key) || null,
      set: async (key, value) => {
        this.memoryStore.set(key, value);
        return 'OK';
      },
      setex: async (key, seconds, value) => {
        this.memoryStore.set(key, value);
        // 内存模式下忽略过期时间
        return 'OK';
      },
      del: async (key) => {
        this.memoryStore.delete(key);
        return 1;
      },
      exists: async (key) => this.memoryStore.has(key) ? 1 : 0,
      keys: async (pattern) => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return Array.from(this.memoryStore.keys()).filter(key => regex.test(key));
      },
      lpush: async (key, value) => {
        if (!this.memoryStore.has(key)) {
          this.memoryStore.set(key, []);
        }
        const list = this.memoryStore.get(key);
        list.unshift(value);
        this.memoryStore.set(key, list);
        return list.length;
      },
      lrange: async (key, start, stop) => {
        const list = this.memoryStore.get(key) || [];
        if (stop === -1) {
          return list.slice(start);
        }
        return list.slice(start, stop + 1);
      },
      hgetall: async (key) => {
        return this.memoryStore.get(key) || {};
      },
      hget: async (key, field) => {
        const hash = this.memoryStore.get(key) || {};
        return hash[field] || null;
      },
      hset: async (key, field, value) => {
        if (!this.memoryStore.has(key)) {
          this.memoryStore.set(key, {});
        }
        const hash = this.memoryStore.get(key);
        hash[field] = value;
        this.memoryStore.set(key, hash);
        return 1;
      },
      mget: async (...keys) => {
        return keys.map(key => this.memoryStore.get(key) || null);
      },
      incr: async (key) => {
        const current = parseInt(this.memoryStore.get(key)) || 0;
        this.memoryStore.set(key, String(current + 1));
        return current + 1;
      },
      ltrim: async (key, start, stop) => {
        const list = this.memoryStore.get(key) || [];
        if (stop === -1) {
          this.memoryStore.set(key, list.slice(start));
        } else {
          this.memoryStore.set(key, list.slice(start, stop + 1));
        }
        return 'OK';
      },
      expire: async (key, seconds) => {
        // 内存模式下忽略过期时间
        return 1;
      },
      publish: async (channel, message) => {
        // 内存模式下不实现发布订阅
        return 0;
      },
      quit: async () => {
        // 内存模式下无需关闭连接
        return 'OK';
      }
    };

    this.memoryClient = memoryClient;
    return memoryClient;
  }

  async getClient() {
    if (this.useMemoryMode) {
      return this.getMemoryClient();
    }
    if (!this.client) {
      try {
        const client = await this.connect();
        return client;
      } catch (error) {
        console.warn('⚠️  Redis 连接失败，使用内存模式');
        this.useMemoryMode = true;
        return this.getMemoryClient();
      }
    }
    return this.client;
  }

  getPublisher() {
    if (this.useMemoryMode) {
      return this.getMemoryClient();
    }
    if (!this.publisher) {
      return this.connect();
    }
    return this.publisher;
  }

  getSubscriber() {
    if (this.useMemoryMode) {
      return this.getMemoryClient();
    }
    if (!this.subscriber) {
      return this.connect();
    }
    return this.subscriber;
  }

  async close() {
    if (this.client && !this.useMemoryMode) await this.client.quit();
    if (this.publisher && !this.useMemoryMode) await this.publisher.quit();
    if (this.subscriber && !this.useMemoryMode) await this.subscriber.quit();
  }

  isMemoryMode() {
    return this.useMemoryMode;
  }
}

module.exports = new RedisClient();
