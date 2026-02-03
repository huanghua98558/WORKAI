/**
 * 机器人指令队列服务
 * 负责管理机器人指令的创建、队列、执行和重试
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robotCommands, robotCommandQueue, robots } = require('../database/schema');
const { eq, and, lt, lte, gte, asc, sql, desc, isNull } = require('drizzle-orm');
const worktoolService = require('./worktool.service');
const robotService = require('./robot.service');
const logger = require('./system-logger.service');
const { v4: uuidv4 } = require('uuid');

class RobotCommandService {
  constructor() {
    this.isProcessing = false;
    this.processInterval = null;
  }

  /**
   * 创建指令并添加到队列
   * @param {Object} commandData - 指令数据
   * @returns {Promise<Object>} 创建的指令
   */
  async createCommand(commandData) {
    const { robotId, commandType, commandPayload, priority = 5, maxRetries = 3 } = commandData;

    try {
      logger.info('RobotCommand', '创建指令', {
        robotId,
        commandType,
        priority
      });

      // 验证机器人是否存在且启用
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        throw new Error(`机器人不存在: ${robotId}`);
      }
      if (!robot.isActive) {
        throw new Error(`机器人未启用: ${robotId}`);
      }

      // 生成指令ID
      const commandId = uuidv4();
      const now = new Date();

      // 获取数据库实例
      const db = await getDb();

      // 创建指令记录
      const command = await db.insert(robotCommands).values({
        id: commandId,
        robotId,
        commandType,
        commandData: commandPayload,
        priority,
        status: 'pending',
        retryCount: 0,
        maxRetries,
        createdAt: now,
        updatedAt: now
      }).returning();

      // 添加到队列
      await this.addToQueue({
        id: uuidv4(),
        commandId,
        robotId,
        priority,
        status: 'pending',
        scheduledFor: now
      });

      logger.info('RobotCommand', '指令创建成功', {
        commandId,
        robotId,
        commandType,
        priority
      });

      return command[0];
    } catch (error) {
      logger.error('RobotCommand', '创建指令失败', {
        error: error.message,
        robotId,
        commandType
      });
      throw error;
    }
  }

  /**
   * 添加指令到队列
   * @param {Object} queueData - 队列数据
   */
  async addToQueue(queueData) {
    const db = await getDb();
    await db.insert(robotCommandQueue).values(queueData);
  }

  /**
   * 获取指令列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 指令列表
   */
  async getCommands(options = {}) {
    const {
      robotId,
      status,
      commandType,
      limit = 20,
      offset = 0
    } = options;

    const db = await getDb();
    let query = db.select().from(robotCommands).orderBy(desc(robotCommands.createdAt)).limit(limit).offset(offset);

    // 添加过滤条件
    const conditions = [];
    if (robotId) {
      conditions.push(eq(robotCommands.robotId, robotId));
    }
    if (status) {
      conditions.push(eq(robotCommands.status, status));
    }
    if (commandType) {
      conditions.push(eq(robotCommands.commandType, commandType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * 获取指令详情
   * @param {string} commandId - 指令ID
   * @returns {Promise<Object>} 指令详情
   */
  async getCommandById(commandId) {
    const db = await getDb();
    const result = await db.select().from(robotCommands).where(eq(robotCommands.id, commandId)).limit(1);
    return result[0] || null;
  }

  /**
   * 更新指令状态
   * @param {string} commandId - 指令ID
   * @param {string} status - 新状态
   * @param {Object} data - 其他更新数据
   */
  async updateCommandStatus(commandId, status, data = {}) {
    const now = new Date();
    const updateData = {
      status,
      updatedAt: now,
      ...data
    };

    if (status === 'processing' && !updateData.executedAt) {
      updateData.executedAt = now;
    }
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = now;
    }

    const db = await getDb();
    await db.update(robotCommands)
      .set(updateData)
      .where(eq(robotCommands.id, commandId));

    // 同时更新队列状态
    await db.update(robotCommandQueue)
      .set({
        status,
        lockedAt: null,
        lockedBy: null
      })
      .where(eq(robotCommandQueue.commandId, commandId));
  }

  /**
   * 从队列中获取下一个待处理的指令
   * @param {string} workerId - 工作进程ID
   * @returns {Promise<Object|null>} 待处理的指令
   */
  async getNextCommand(workerId) {
    const now = new Date();

    try {
      const db = await getDb();

      // 查找待处理的指令（按优先级和时间排序）
      const queueItems = await db.select()
        .from(robotCommandQueue)
        .where(and(
          eq(robotCommandQueue.status, 'pending'),
          lte(robotCommandQueue.scheduledFor, now)
        ))
        .orderBy(asc(robotCommandQueue.priority), asc(robotCommandQueue.scheduledFor))
        .limit(1);

      if (queueItems.length === 0) {
        return null;
      }

      const queueItem = queueItems[0];

      // 锁定队列项
      await db.update(robotCommandQueue)
        .set({
          status: 'locked',
          lockedAt: now,
          lockedBy: workerId
        })
        .where(eq(robotCommandQueue.id, queueItem.id));

      // 获取指令详情
      const commands = await db.select()
        .from(robotCommands)
        .where(eq(robotCommands.id, queueItem.commandId))
        .limit(1);

      return commands[0] || null;
    } catch (error) {
      logger.error('RobotCommand', '获取队列指令失败', {
        error: error.message,
        workerId
      });
      return null;
    }
  }

  /**
   * 执行指令
   * @param {Object} command - 指令对象
   * @returns {Promise<Object>} 执行结果
   */
  async executeCommand(command) {
    const { id, robotId, commandType, commandData } = command;

    try {
      logger.info('RobotCommand', '开始执行指令', {
        commandId: id,
        robotId,
        commandType
      });

      // 更新状态为处理中
      await this.updateCommandStatus(id, 'processing');

      let result;
      
      // 根据指令类型执行不同的操作
      switch (commandType) {
        case 'send_message':
          // 发送消息
          const { list } = commandData;
          if (list && list.length > 0) {
            const msg = list[0];
            result = await worktoolService.sendTextMessage(
              robotId,
              msg.titleList[0],
              msg.receivedContent,
              msg.atList || []
            );
          } else {
            throw new Error('消息数据格式错误');
          }
          break;

        case 'batch_send_message':
          // 批量发送消息
          result = await worktoolService.sendBatchMessages(robotId, commandData.list);
          break;

        default:
          throw new Error(`不支持的指令类型: ${commandType}`);
      }

      if (result && result.success) {
        // 执行成功
        await this.updateCommandStatus(id, 'completed', {
          result,
          errorMessage: null
        });

        logger.info('RobotCommand', '指令执行成功', {
          commandId: id,
          robotId,
          result
        });

        return { success: true, commandId: id, result };
      } else {
        // 执行失败
        await this.handleCommandFailure(id, result?.message || '执行失败');

        return { success: false, commandId: id, error: result?.message };
      }
    } catch (error) {
      logger.error('RobotCommand', '指令执行异常', {
        commandId: id,
        robotId,
        error: error.message,
        stack: error.stack
      });

      await this.handleCommandFailure(id, error.message);

      return { success: false, commandId: id, error: error.message };
    }
  }

  /**
   * 处理指令失败
   * @param {string} commandId - 指令ID
   * @param {string} errorMessage - 错误消息
   */
  async handleCommandFailure(commandId, errorMessage) {
    const command = await this.getCommandById(commandId);
    
    if (!command) {
      logger.error('RobotCommand', '指令不存在', { commandId });
      return;
    }

    const { retryCount, maxRetries, priority } = command;
    const newRetryCount = retryCount + 1;

    if (newRetryCount < maxRetries) {
      // 还可以重试
      const delay = Math.pow(2, newRetryCount) * 1000; // 指数退避
      const scheduledFor = new Date(Date.now() + delay);

      await this.updateCommandStatus(commandId, 'pending', {
        retryCount: newRetryCount,
        errorMessage
      });

      // 更新队列中的调度时间
      const db = await getDb();
      await db.update(robotCommandQueue)
        .set({
          status: 'pending',
          scheduledFor,
          lockedAt: null,
          lockedBy: null,
          retryCount: newRetryCount
        })
        .where(eq(robotCommandQueue.commandId, commandId));

      logger.info('RobotCommand', '指令将重试', {
        commandId,
        retryCount: newRetryCount,
        maxRetries,
        scheduledFor
      });
    } else {
      // 超过最大重试次数，标记为失败
      await this.updateCommandStatus(commandId, 'failed', {
        retryCount: newRetryCount,
        errorMessage
      });

      logger.error('RobotCommand', '指令失败（超过重试次数）', {
        commandId,
        retryCount: newRetryCount,
        maxRetries,
        errorMessage
      });
    }
  }

  /**
   * 重试指令
   * @param {string} commandId - 指令ID
   * @returns {Promise<Object>} 结果
   */
  async retryCommand(commandId) {
    const command = await this.getCommandById(commandId);

    if (!command) {
      throw new Error('指令不存在');
    }

    if (command.status !== 'failed') {
      throw new Error('只能重试失败的指令');
    }

    // 重置状态和重试次数
    const now = new Date();
    await this.updateCommandStatus(commandId, 'pending', {
      retryCount: 0,
      errorMessage: null,
      result: null,
      executedAt: null,
      completedAt: null
    });

    // 更新队列
    const db = await getDb();
    await db.update(robotCommandQueue)
      .set({
        status: 'pending',
        scheduledFor: now,
        lockedAt: null,
        lockedBy: null,
        retryCount: 0
      })
      .where(eq(robotCommandQueue.commandId, commandId));

    logger.info('RobotCommand', '指令已重置为待处理', {
      commandId
    });

    return { success: true, commandId };
  }

  /**
   * 启动队列处理器
   * @param {string} workerId - 工作进程ID
   * @param {number} interval - 处理间隔（毫秒）
   */
  async startQueueProcessor(workerId = `worker-${Date.now()}`, interval = 1000) {
    if (this.isProcessing) {
      logger.warn('RobotCommand', '队列处理器已在运行', { workerId });
      return;
    }

    this.isProcessing = true;
    logger.info('RobotCommand', '启动队列处理器', { workerId, interval });

    this.processInterval = setInterval(async () => {
      try {
        const command = await this.getNextCommand(workerId);

        if (command) {
          await this.executeCommand(command);
        }
      } catch (error) {
        logger.error('RobotCommand', '队列处理器错误', {
          error: error.message,
          workerId
        });
      }
    }, interval);
  }

  /**
   * 停止队列处理器
   */
  async stopQueueProcessor() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      this.isProcessing = false;
      logger.info('RobotCommand', '队列处理器已停止');
    }
  }

  /**
   * 获取队列统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getQueueStats() {
    const db = await getDb();
    const stats = await db.select({
      status: robotCommandQueue.status,
      count: sql`count(*)`
    })
    .from(robotCommandQueue)
    .groupBy(robotCommandQueue.status);

    const result = {
      pending: 0,
      locked: 0,
      completed: 0,
      failed: 0
    };

    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
    });

    return result;
  }
}

module.exports = new RobotCommandService();
