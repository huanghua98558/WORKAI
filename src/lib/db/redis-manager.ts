/**
 * Redis 连接管理器
 * 支持 Upstash Redis 和内存模式降级
 */

import Redis from 'ioredis';

interface RedisConfig {
  url?: string;
  token?: string;
}

class RedisManager {
  private client: Redis | null = null;
  private useMemoryMode = false;
  private memoryQueue: Map<string, any[]> = new Map();
  private connectionPromise: Promise<Redis | null> | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_PASSWORD;

    if (redisUrl && redisToken) {
      try {
        this.client = new Redis(redisUrl, {
          password: redisToken,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 500);
            return delay;
          },
          enableReadyCheck: true,
        });

        this.client.on('error', (error) => {
          console.error('[RedisManager] Redis connection error:', error);
        });

        this.client.on('connect', () => {
          console.log('[RedisManager] Redis connected successfully');
        });

        // 测试连接
        await this.client.ping();
        console.log('[RedisManager] Redis initialized successfully');
      } catch (error) {
        console.warn('[RedisManager] Failed to initialize Redis, falling back to memory mode:', error);
        this.useMemoryMode = true;
        this.client = null;
      }
    } else {
      console.warn('[RedisManager] Redis URL or token not provided, using memory mode');
      this.useMemoryMode = true;
    }
  }

  async getClient(): Promise<Redis | null> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      if (this.useMemoryMode) {
        return null;
      }
      return this.client;
    })();

    return this.connectionPromise;
  }

  isMemoryMode(): boolean {
    return this.useMemoryMode;
  }

  // 队列操作
  async lpush(key: string, value: string): Promise<number> {
    if (this.useMemoryMode) {
      if (!this.memoryQueue.has(key)) {
        this.memoryQueue.set(key, []);
      }
      const queue = this.memoryQueue.get(key)!;
      queue.unshift(value);
      return queue.length;
    }

    const client = await this.getClient();
    if (!client) throw new Error('Redis client not available');
    return client.lpush(key, value);
  }

  async rpush(key: string, value: string): Promise<number> {
    if (this.useMemoryMode) {
      if (!this.memoryQueue.has(key)) {
        this.memoryQueue.set(key, []);
      }
      const queue = this.memoryQueue.get(key)!;
      queue.push(value);
      return queue.length;
    }

    const client = await this.getClient();
    if (!client) throw new Error('Redis client not available');
    return client.rpush(key, value);
  }

  async lpop(key: string): Promise<string | null> {
    if (this.useMemoryMode) {
      const queue = this.memoryQueue.get(key);
      if (!queue || queue.length === 0) return null;
      return queue.shift()!;
    }

    const client = await this.getClient();
    if (!client) throw new Error('Redis client not available');
    return client.lpop(key);
  }

  async llen(key: string): Promise<number> {
    if (this.useMemoryMode) {
      const queue = this.memoryQueue.get(key);
      return queue ? queue.length : 0;
    }

    const client = await this.getClient();
    if (!client) throw new Error('Redis client not available');
    return client.llen(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.useMemoryMode) {
      const queue = this.memoryQueue.get(key);
      if (!queue) return [];
      
      if (stop === -1) {
        return queue.slice(start);
      }
      return queue.slice(start, stop + 1);
    }

    const client = await this.getClient();
    if (!client) throw new Error('Redis client not available');
    return client.lrange(key, start, stop);
  }

  // 通用数据操作
  async set(key: string, value: string): Promise<'OK' | null> {
    if (this.useMemoryMode) {
      this.memoryQueue.set(key, [value]);
      return 'OK';
    }

    const client = await this.getClient();
    if (!client) throw new Error('Redis client not available');
    return client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemoryMode) {
      const value = this.memoryQueue.get(key);
      if (!value || value.length === 0) return null;
      return value[0];
    }

    const client = await this.getClient();
    if (!client) throw new Error('Redis client not available');
    return client.get(key);
  }

  async del(key: string): Promise<number> {
    if (this.useMemoryMode) {
      if (this.memoryQueue.has(key)) {
        this.memoryQueue.delete(key);
        return 1;
      }
      return 0;
    }

    const client = await this.getClient();
    if (!client) throw new Error('Redis client not available');
    return client.del(key);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.connectionPromise = null;
  }
}

// 单例模式
export const redisManager = new RedisManager();
