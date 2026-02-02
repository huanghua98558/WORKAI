/**
 * Redis 客户端管理
 */

const Redis = require('ioredis');

class RedisClient {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
  }

  connect() {
    if (this.client) return this.client;

    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || 6379),
      db: parseInt(process.env.REDIS_DB || 0),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    this.client = new Redis(config);
    this.publisher = new Redis(config);
    this.subscriber = new Redis(config);

    this.client.on('connect', () => {
      console.log('✅ Redis 客户端已连接');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis 连接错误:', err);
    });

    return this.client;
  }

  getClient() {
    if (!this.client) {
      return this.connect();
    }
    return this.client;
  }

  getPublisher() {
    if (!this.publisher) {
      return this.connect();
    }
    return this.publisher;
  }

  getSubscriber() {
    if (!this.subscriber) {
      return this.connect();
    }
    return this.subscriber;
  }

  async close() {
    if (this.client) await this.client.quit();
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
  }
}

module.exports = new RedisClient();
