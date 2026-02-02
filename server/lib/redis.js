/**
 * Redis 客户端管理
 * 支持内存模式降级
 */

class RedisClient {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
    this.memoryStore = new Map(); // 内存存储
    this.useMemoryMode = false;
  }

  async connect() {
    // 检查是否强制使用内存模式
    if (process.env.USE_MEMORY_MODE === 'true') {
      this.useMemoryMode = true;
      console.log('⚠️  使用内存模式（配置指定）');
      return this.getMemoryClient();
    }

    // 尝试连接 Redis
    try {
      const Redis = require('ioredis');
      const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || 6379),
        db: parseInt(process.env.REDIS_DB || 0),
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 2
      };

      if (process.env.REDIS_PASSWORD) {
        config.password = process.env.REDIS_PASSWORD;
      }

      this.client = new Redis(config);
      this.publisher = new Redis(config);
      this.subscriber = new Redis(config);

      // 简化的错误处理
      this.client.on('error', () => {}); // 静默错误

      // 尝试连接
      await this.client.connect();
      
      // 简单的 ping 测试
      try {
        await this.client.ping();
        console.log('✅ Redis 客户端已连接');
        return this.client;
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.warn('⚠️  Redis 连接失败，切换到内存模式');
      this.useMemoryMode = true;
      this.client = this.publisher = this.subscriber = null;
      return this.getMemoryClient();
    }
  }

  getMemoryClient() {
    // 创建一个模拟的 Redis 客户端接口
    const memoryClient = {
      get: async (key) => this.memoryStore.get(key) || null,
      set: async (key, value) => this.memoryStore.set(key, value),
      setex: async (key, seconds, value) => {
        this.memoryStore.set(key, value);
        // 内存模式下忽略过期时间
      },
      del: async (key) => this.memoryStore.delete(key),
      exists: async (key) => this.memoryStore.has(key) ? 1 : 0,
      keys: async (pattern) => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
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

    return memoryClient;
  }

  getClient() {
    if (this.useMemoryMode) {
      return this.getMemoryClient();
    }
    if (!this.client) {
      return this.connect();
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
