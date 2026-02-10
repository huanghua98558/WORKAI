/**
 * 消息队列服务
 * 使用 Redis 实现消息队列，支持异步处理和流量削峰
 */

const redisClient = require('./redis');
const { getLogger } = require('./logger');

const logger = getLogger('MESSAGE_QUEUE');

// 队列名称前缀
const QUEUE_PREFIX = 'msgq:';
const QUEUE_DELAY_PREFIX = 'msgq:delay:';
const QUEUE_PRIORITY_PREFIX = 'msgq:priority:';

// 队列优先级
const PRIORITY = {
  HIGH: 0,     // 高优先级
  NORMAL: 1,   // 普通优先级
  LOW: 2       // 低优先级
};

class MessageQueueService {
  constructor() {
    this.consumer = null;
    this.isConsuming = false;
    this.processors = new Map(); // 处理器映射
  }

  /**
   * 获取 Redis 客户端
   */
  async getRedis() {
    return await redisClient.connect();
  }

  /**
   * 入队 - 普通消息
   * @param {string} queueName - 队列名称
   * @param {object} message - 消息对象
   * @param {number} priority - 优先级（可选）
   * @returns {Promise<number>} 队列长度
   */
  async enqueue(queueName, message, priority = PRIORITY.NORMAL) {
    try {
      const redis = await this.getRedis();
      const key = `${QUEUE_PREFIX}${queueName}`;
      const data = JSON.stringify(message);

      logger.info('[消息队列] 入队', {
        queueName,
        priority,
        messageSize: data.length
      });

      // 如果有优先级，使用有序集合
      if (priority !== undefined && priority !== null) {
        const priorityKey = `${QUEUE_PRIORITY_PREFIX}${queueName}`;
        const score = priority;
        const member = data;
        await redis.zadd(priorityKey, score, member);
      } else {
        // 使用普通列表
        await redis.rpush(key, data);
      }

      // 通知有新消息
      await redis.publish(`msgq:notify:${queueName}`, JSON.stringify({
        type: 'new_message',
        queueName,
        timestamp: Date.now()
      }));

      return await redis.llen(key);
    } catch (error) {
      logger.error('[消息队列] 入队失败', {
        queueName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 入队 - 延迟消息
   * @param {string} queueName - 队列名称
   * @param {object} message - 消息对象
   * @param {number} delaySeconds - 延迟时间（秒）
   * @returns {Promise<number>} 队列长度
   */
  async enqueueDelayed(queueName, message, delaySeconds) {
    try {
      const redis = await this.getRedis();
      const key = `${QUEUE_DELAY_PREFIX}${queueName}`;
      const data = JSON.stringify({
        ...message,
        _enqueueTime: Date.now(),
        _delaySeconds: delaySeconds
      });

      logger.info('[消息队列] 入队延迟消息', {
        queueName,
        delaySeconds,
        messageSize: data.length
      });

      // 使用有序集合，score 为执行时间戳
      const executeTimestamp = Date.now() + (delaySeconds * 1000);
      await redis.zadd(key, executeTimestamp, data);

      return await redis.zcard(key);
    } catch (error) {
      logger.error('[消息队列] 入队延迟消息失败', {
        queueName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 出队
   * @param {string} queueName - 队列名称
   * @param {number} timeout - 超时时间（秒），默认 5 秒
   * @returns {Promise<object|null>} 消息对象或 null
   */
  async dequeue(queueName, timeout = 5) {
    try {
      const redis = await this.getRedis();
      const key = `${QUEUE_PREFIX}${queueName}`;

      // 使用 BRPOP 实现阻塞式出队（超时模式）
      // 注意：BRPOP 需要传入数组格式
      const result = await redis.brpop([key], timeout);

      if (result) {
        // result 格式: [key, value]
        const data = result[1];
        const message = JSON.parse(data);

        logger.info('[消息队列] 出队', {
          queueName,
          messageSize: data.length
        });

        return message;
      }

      // 超时返回 null
      return null;
    } catch (error) {
      logger.error('[消息队列] 出队失败', {
        queueName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 出队优先级消息
   * @param {string} queueName - 队列名称
   * @returns {Promise<object|null>} 消息对象或 null
   */
  async dequeuePriority(queueName) {
    try {
      const redis = await this.getRedis();
      const key = `${QUEUE_PRIORITY_PREFIX}${queueName}`;

      // 使用 ZPOPMIN 获取最高优先级（score 最小）的消息
      const result = await redis.zpopmin(key, 1);

      if (result && result.length > 0) {
        const data = result[0].value;
        const message = JSON.parse(data);

        logger.info('[消息队列] 出队优先级消息', {
          queueName,
          priority: result[0].score,
          messageSize: data.length
        });

        return message;
      }

      return null;
    } catch (error) {
      logger.error('[消息队列] 出队优先级消息失败', {
        queueName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取队列长度
   * @param {string} queueName - 队列名称
   * @returns {Promise<number>} 队列长度
   */
  async getQueueLength(queueName) {
    try {
      const redis = await this.getRedis();
      const key = `${QUEUE_PREFIX}${queueName}`;
      return await redis.llen(key);
    } catch (error) {
      logger.error('[消息队列] 获取队列长度失败', {
        queueName,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * 获取延迟队列长度
   * @param {string} queueName - 队列名称
   * @returns {Promise<number>} 队列长度
   */
  async getDelayQueueLength(queueName) {
    try {
      const redis = await this.getRedis();
      const key = `${QUEUE_DELAY_PREFIX}${queueName}`;
      return await redis.zcard(key);
    } catch (error) {
      logger.error('[消息队列] 获取延迟队列长度失败', {
        queueName,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * 获取优先级队列长度
   * @param {string} queueName - 队列名称
   * @returns {Promise<number>} 队列长度
   */
  async getPriorityQueueLength(queueName) {
    try {
      const redis = await this.getRedis();
      const key = `${QUEUE_PRIORITY_PREFIX}${queueName}`;
      return await redis.zcard(key);
    } catch (error) {
      logger.error('[消息队列] 获取优先级队列长度失败', {
        queueName,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * 清空队列
   * @param {string} queueName - 队列名称
   * @returns {Promise<number>} 清空的消息数量
   */
  async clearQueue(queueName) {
    try {
      const redis = await this.getRedis();
      const key = `${QUEUE_PREFIX}${queueName}`;
      const count = await redis.llen(key);
      await redis.del(key);
      
      logger.info('[消息队列] 清空队列', {
        queueName,
        count
      });

      return count;
    } catch (error) {
      logger.error('[消息队列] 清空队列失败', {
        queueName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 注册消息处理器
   * @param {string} queueName - 队列名称
   * @param {function} processor - 处理函数
   */
  registerProcessor(queueName, processor) {
    this.processors.set(queueName, processor);
    logger.info('[消息队列] 注册处理器', { queueName });
  }

  /**
   * 启动消费者（简化版，手动调用）
   * @param {string} queueName - 队列名称
   */
  async startConsumer(queueName) {
    if (this.isConsuming) {
      logger.warn('[消息队列] 消费者已在运行');
      return;
    }

    this.isConsuming = true;
    logger.info('[消息队列] 启动消费者', { queueName });

    // 简化的消费者实现
    // 在实际应用中，应该使用后台 worker 进程
  }

  /**
   * 停止消费者
   */
  stopConsumer() {
    this.isConsuming = false;
    logger.info('[消息队列] 停止消费者');
  }

  /**
   * 获取队列统计信息
   * @param {string} queueName - 队列名称
   * @returns {Promise<object>} 统计信息
   */
  async getQueueStats(queueName) {
    try {
      const normalLength = await this.getQueueLength(queueName);
      const delayLength = await this.getDelayQueueLength(queueName);
      const priorityLength = await this.getPriorityQueueLength(queueName);

      return {
        queueName,
        normalLength,
        delayLength,
        priorityLength,
        totalLength: normalLength + delayLength + priorityLength
      };
    } catch (error) {
      logger.error('[消息队列] 获取队列统计失败', {
        queueName,
        error: error.message
      });
      return {
        queueName,
        normalLength: 0,
        delayLength: 0,
        priorityLength: 0,
        totalLength: 0
      };
    }
  }
}

// 导出单例
const messageQueueService = new MessageQueueService();

module.exports = messageQueueService;
module.exports.PRIORITY = PRIORITY;
