/**
 * Redis 客户端管理
 * 支持 @upstash/redis REST API、ioredis 和内存模式降级
 *
 * 优先级：
 * 1. Upstash REST API（最稳定，无连接限制）
 * 2. ioredis（传统 Redis 连接）
 * 3. 内存模式（降级方案）
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
    this.useRestApi = false; // 是否使用 REST API
    this.logger = getLogger('REDIS');
    this.connectingPromise = null; // 连接 Promise，防止重复连接
  }

  async connect() {
    // 检查是否强制使用内存模式
    if (process.env.USE_MEMORY_MODE === 'true') {
      this.useMemoryMode = true;
      this.logger.info('使用内存模式（配置指定）');
      return this.getMemoryClient();
    }

    // 如果已经连接中，返回现有的 Promise
    if (this.connectingPromise) {
      this.logger.debug('连接正在进行中，返回现有 Promise');
      return this.connectingPromise;
    }

    // 如果已经连接，直接返回
    if (this.client && !this.useMemoryMode) {
      this.logger.debug('Redis 客户端已连接，直接返回');
      return this.client;
    }

    // 开始连接
    this.connectingPromise = this._doConnect();

    try {
      const client = await this.connectingPromise;
      this.connectingPromise = null;
      return client;
    } catch (error) {
      this.connectingPromise = null;
      throw error;
    }
  }

  async _doConnect() {
    // 检查是否禁用 ioredis
    if (process.env.DISABLE_IOREDIS === 'true') {
      this.logger.info('ioredis 已禁用（DISABLE_IOREDIS=true），仅使用 Upstash REST API');
    }

    // 优先使用 Upstash REST API（如果配置了 REST URL）
    this.logger.info('检查 Upstash REST API 配置', {
      hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      url: process.env.UPSTASH_REDIS_REST_URL
    });

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.logger.info('尝试连接 Upstash REST API...');
        return await this.connectRestApi();
      } catch (error) {
        this.logger.error('Upstash REST API 连接失败', { error: error.message, stack: error.stack });

        // 如果禁用 ioredis，直接切换到内存模式
        if (process.env.DISABLE_IOREDIS === 'true') {
          this.logger.warn('ioredis 已禁用，切换到内存模式');
          this.useMemoryMode = true;
          this.client = this.publisher = this.subscriber = null;
          return this.getMemoryClient();
        }

        // 否则继续尝试 ioredis
        this.logger.info('尝试使用 ioredis...');
      }
    } else {
      // 如果禁用 ioredis，直接切换到内存模式
      if (process.env.DISABLE_IOREDIS === 'true') {
        this.logger.warn('未配置 Upstash REST API 且 ioredis 已禁用，切换到内存模式');
        this.useMemoryMode = true;
        this.client = this.publisher = this.subscriber = null;
        return this.getMemoryClient();
      }

      this.logger.info('未配置 Upstash REST API，尝试使用 ioredis');
    }

    // 尝试使用 ioredis 连接 Redis
    try {
      return await this.connectIoredis();
    } catch (error) {
      this.logger.warn('ioredis 连接失败，切换到内存模式', { error: error.message });
      this.useMemoryMode = true;
      this.client = this.publisher = this.subscriber = null;
      return this.getMemoryClient();
    }
  }

  /**
   * 使用 @upstash/redis REST API 连接
   */
  async connectRestApi() {
    try {
      // 如果已经连接，直接返回
      if (this.client && this.useRestApi) {
        this.logger.debug('Upstash Redis REST API 客户端已存在，直接返回');
        return this.client;
      }

      this.logger.info('开始初始化 Upstash Redis REST API 客户端...');
      const { Redis } = require('@upstash/redis');
      this.useRestApi = true;

      this.logger.info('创建 Redis REST API 客户端...', {
        url: process.env.UPSTASH_REDIS_REST_URL,
        tokenLength: process.env.UPSTASH_REDIS_REST_TOKEN?.length || 0
      });

      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      this.logger.info('执行 ping 测试...');
      // 测试连接
      const result = await this.client.ping();
      this.logger.info('Ping 结果', { result });

      this.logger.info('✅ Upstash Redis REST API 已连接', {
        url: process.env.UPSTASH_REDIS_REST_URL,
        useRestApi: this.useRestApi
      });

      // 复用 client 连接
      this.publisher = this.client;
      this.subscriber = this.client;

      return this.client;
    } catch (error) {
      this.logger.error('Upstash REST API 连接失败', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * 使用 ioredis 连接 Redis
   */
  async connectIoredis() {
    // 抛出错误，禁止使用 ioredis
    const error = new Error('ioredis 已禁用（DISABLE_IOREDIS=true），请使用 Upstash REST API');
    this.logger.error('尝试使用 ioredis，但已禁用', {
      error: error.message,
      stack: error.stack
    });
    throw error;
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
      ping: async () => {
        return 'PONG';
      },
      quit: async () => {
        // 内存模式下无需关闭连接
        return 'OK';
      },
      publish: async (channel, message) => {
        // 内存模式下不实现发布订阅
        return 0;
      },
      subscribe: async (channel, callback) => {
        // 内存模式下不实现订阅
        return 0;
      },
      unsubscribe: async (channel) => {
        return 0;
      }
    };

    this.memoryClient = memoryClient;
    this.logger.info('✅ 内存模式客户端已创建');
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
        this.logger.warn('获取客户端失败，使用内存模式', { error: error.message });
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
    if (this.client && !this.useMemoryMode && !this.useRestApi) {
      await this.client.quit();
    }
    // REST API 和内存模式无需关闭
  }

  isMemoryMode() {
    return this.useMemoryMode;
  }

  isRestApiMode() {
    return this.useRestApi;
  }

  getConnectionInfo() {
    return {
      mode: this.useMemoryMode ? 'memory' : (this.useRestApi ? 'rest' : 'ioredis'),
      useMemoryMode: this.useMemoryMode,
      useRestApi: this.useRestApi,
      connected: this.client !== null,
    };
  }
}

module.exports = new RedisClient();
