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
    const { robotId, commandType, commandPayload, priority = 5, maxRetries = 0 } = commandData;

    try {
      logger.info('RobotCommand', '创建指令 - 开始', {
        requestId: commandData.requestId || 'N/A',
        robotId,
        commandType,
        priority,
        maxRetries,
        commandDataSize: JSON.stringify(commandPayload).length
      });

      // 验证机器人是否存在且启用
      const robot = await robotService.getRobotByRobotId(robotId);
      if (!robot) {
        logger.error('RobotCommand', '创建指令失败 - 机器人不存在', {
          robotId,
          commandType
        });
        throw new Error(`机器人不存在: ${robotId}`);
      }
      if (!robot.isActive) {
        logger.error('RobotCommand', '创建指令失败 - 机器人未启用', {
          robotId,
          robotName: robot.name,
          commandType
        });
        throw new Error(`机器人未启用: ${robotId}`);
      }

      logger.info('RobotCommand', '创建指令 - 机器人验证通过', {
        robotId,
        robotName: robot.name,
        robotStatus: robot.status,
        company: robot.company || 'N/A',
        nickname: robot.nickname || 'N/A'
      });

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

      logger.info('RobotCommand', '创建指令 - 数据库记录已创建', {
        commandId,
        timestamp: now.toISOString()
      });

      // 添加到队列
      await this.addToQueue({
        id: uuidv4(),
        commandId,
        robotId,
        priority,
        status: 'pending',
        scheduledFor: now
      });

      logger.info('RobotCommand', '创建指令 - 队列添加成功', {
        commandId,
        robotId,
        commandType,
        priority,
        maxRetries,
        scheduledFor: now.toISOString(),
        createdAt: now.toISOString()
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
   * 通过 messageId 查找指令
   * @param {string} messageId - WorkTool 返回的消息ID
   * @returns {Promise<Object|null>} 指令详情
   */
  async getCommandByMessageId(messageId) {
    const db = await getDb();
    const result = await db.select().from(robotCommands)
      .where(eq(robotCommands.messageId, messageId))
      .orderBy(desc(robotCommands.createdAt))
      .limit(1);
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
    const queryStartTime = Date.now();

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

      const queryDuration = Date.now() - queryStartTime;

      if (queueItems.length === 0) {
        // 无待处理指令时不记录日志（减少重复日志输出）
        return null;
      }

      const queueItem = queueItems[0];

      logger.info('RobotCommand', '队列查询 - 找到待处理指令', {
        workerId,
        queueItemId: queueItem.id,
        commandId: queueItem.commandId,
        priority: queueItem.priority,
        scheduledFor: queueItem.scheduledFor.toISOString(),
        retryCount: queueItem.retryCount,
        queryDuration
      });

      // 锁定队列项
      const lockStartTime = Date.now();
      await db.update(robotCommandQueue)
        .set({
          status: 'locked',
          lockedAt: now,
          lockedBy: workerId
        })
        .where(eq(robotCommandQueue.id, queueItem.id));
      
      const lockDuration = Date.now() - lockStartTime;

      // 获取指令详情
      const commands = await db.select()
        .from(robotCommands)
        .where(eq(robotCommands.id, queueItem.commandId))
        .limit(1);

      const result = commands[0] || null;

      if (result) {
        logger.info('RobotCommand', '队列查询 - 成功获取指令', {
          workerId,
          commandId: result.id,
          commandType: result.commandType,
          robotId: result.robotId,
          priority: result.priority,
          retryCount: result.retryCount,
          createdAt: result.createdAt,
          lockDuration,
          totalDuration: Date.now() - queryStartTime
        });
      }

      return result;
    } catch (error) {
      logger.error('RobotCommand', '队列查询 - 失败', {
        workerId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        queryDuration: Date.now() - queryStartTime,
        timestamp: now.toISOString()
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
    const { id, robotId, commandType, commandData, priority, retryCount } = command;
    const startTime = Date.now();

    try {
      logger.info('RobotCommand', '指令执行 - 开始', {
        commandId: id,
        robotId,
        commandType,
        priority,
        retryCount,
        commandData: JSON.stringify(commandData),
        startTime: new Date(startTime).toISOString()
      });

      // 更新状态为处理中
      await this.updateCommandStatus(id, 'processing');

      const executionStartTime = Date.now();
      logger.info('RobotCommand', '指令执行 - 状态已更新为 processing', {
        commandId: id,
        executionStartTime: new Date(executionStartTime).toISOString()
      });

      let result;
      
      // 根据指令类型执行不同的操作
      logger.info('RobotCommand', '指令执行 - 开始执行具体操作', {
        commandId: id,
        commandType,
        operationDetails: {
          type: commandType,
          dataKeys: Object.keys(commandData),
          dataSize: JSON.stringify(commandData).length
        }
      });

      switch (commandType) {
        case 'send_group_message':
          // 发送群消息
          const { list: groupList } = commandData;
          if (groupList && groupList.length > 0) {
            const msg = groupList[0];
            logger.info('RobotCommand', '指令执行 - 准备发送群消息', {
              commandId: id,
              groupName: msg.titleList[0],
              contentLength: msg.receivedContent?.length || 0,
              atList: msg.atList || [],
              atListLength: (msg.atList || []).length
            });
            
            result = await worktoolService.sendGroupMessage(
              robotId,
              msg.titleList[0],
              msg.receivedContent,
              msg.atList || []
            );
            
            logger.info('RobotCommand', '指令执行 - 群消息发送完成', {
              commandId: id,
              workToolResult: result
            });
          } else {
            logger.error('RobotCommand', '指令执行失败 - 群消息数据格式错误', {
              commandId: id,
              commandData
            });
            throw new Error('群消息数据格式错误');
          }
          break;

        case 'send_private_message':
          // 发送私聊消息
          const { list: privateList } = commandData;
          if (privateList && privateList.length > 0) {
            const msg = privateList[0];
            logger.info('RobotCommand', '指令执行 - 准备发送私聊消息', {
              commandId: id,
              userName: msg.titleList[0],
              contentLength: msg.receivedContent?.length || 0,
              atList: msg.atList || []
            });
            
            result = await worktoolService.sendPrivateMessage(
              robotId,
              msg.titleList[0],
              msg.receivedContent
            );
            
            logger.info('RobotCommand', '指令执行 - 私聊消息发送完成', {
              commandId: id,
              workToolResult: result
            });
          } else {
            logger.error('RobotCommand', '指令执行失败 - 私聊消息数据格式错误', {
              commandId: id,
              commandData
            });
            throw new Error('私聊消息数据格式错误');
          }
          break;

        case 'send_message':
          // 发送消息（兼容旧版本）
          const { list } = commandData;
          if (list && list.length > 0) {
            const msg = list[0];
            logger.info('RobotCommand', '指令执行 - 准备发送消息（兼容模式）', {
              commandId: id,
              toName: msg.titleList[0],
              contentLength: msg.receivedContent?.length || 0,
              atList: msg.atList || []
            });
            
            result = await worktoolService.sendTextMessage(
              robotId,
              msg.titleList[0],
              msg.receivedContent,
              msg.atList || []
            );
            
            logger.info('RobotCommand', '指令执行 - 消息发送完成', {
              commandId: id,
              workToolResult: result
            });
          } else {
            logger.error('RobotCommand', '指令执行失败 - 消息数据格式错误', {
              commandId: id,
              commandData
            });
            throw new Error('消息数据格式错误');
          }
          break;

        case 'batch_send_message':
          // 批量发送消息
          logger.info('RobotCommand', '指令执行 - 准备批量发送消息', {
            commandId: id,
            messageCount: commandData.list?.length || 0
          });
          
          result = await worktoolService.sendBatchMessages(robotId, commandData.list);
          
          logger.info('RobotCommand', '指令执行 - 批量消息发送完成', {
            commandId: id,
            workToolResult: result
          });
          break;

        default:
          logger.error('RobotCommand', '指令执行失败 - 不支持的指令类型', {
            commandId: id,
            commandType,
            supportedTypes: [
              'send_group_message',
              'send_private_message',
              'send_message',
              'batch_send_message',
              'forward_message',
              'create_room',
              'invite_to_room',
              'upload_file',
              'get_contacts',
              'get_rooms',
              'update_profile'
            ]
          });
          throw new Error(`不支持的指令类型: ${commandType}。支持的类型: send_group_message, send_private_message, batch_send_message 等`);
      }

      const executionEndTime = Date.now();
      const totalExecutionTime = executionEndTime - startTime;

      if (result && result.success) {
        // 指令已成功提交到 WorkTool，但还没有实际执行完成
        // 保存 messageId 并保持状态为 processing，等待回调更新最终结果
        const messageId = result.data || result.sendId;

        await this.updateCommandStatus(id, 'processing', {
          result,
          messageId: messageId,
          errorMessage: null
        });

        logger.info('RobotCommand', '指令执行 - 已提交到 WorkTool，等待回调结果', {
          commandId: id,
          robotId,
          commandType,
          messageId,
          executionTime: totalExecutionTime,
          processingTime: result.processingTime || 'N/A',
          result: {
            success: result.success,
            message: result.message,
            data: result.data,
            sendId: result.sendId,
            processingTime: result.processingTime
          },
          timestamp: new Date().toISOString()
        });

        return { success: true, commandId: id, result, messageId, executionTime: totalExecutionTime };
      } else {
        // 执行失败
        const failureReason = result?.message || '执行失败';
        logger.error('RobotCommand', '指令执行 - 失败（WorkTool返回失败）', {
          commandId: id,
          robotId,
          commandType,
          executionTime: totalExecutionTime,
          failureReason,
          result,
          timestamp: new Date().toISOString()
        });

        await this.handleCommandFailure(id, failureReason);

        return { success: false, commandId: id, error: failureReason, executionTime: totalExecutionTime };
      }
    } catch (error) {
      const executionEndTime = Date.now();
      const totalExecutionTime = executionEndTime - startTime;

      logger.error('RobotCommand', '指令执行 - 异常', {
        commandId: id,
        robotId,
        commandType,
        executionTime: totalExecutionTime,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      });

      await this.handleCommandFailure(id, error.message);

      return { success: false, commandId: id, error: error.message, executionTime: totalExecutionTime };
    }
  }

  /**
   * 处理指令失败
   * @param {string} commandId - 指令ID
   * @param {string} errorMessage - 错误消息
   */
  /**
   * 处理指令失败
   * @param {string} commandId - 指令ID
   * @param {string} errorMessage - 错误消息
   */
  async handleCommandFailure(commandId, errorMessage) {
    const startTime = Date.now();
    
    logger.warn('RobotCommand', '指令失败处理 - 开始', {
      commandId,
      errorMessage,
      startTime: new Date(startTime).toISOString()
    });

    const command = await this.getCommandById(commandId);
    
    if (!command) {
      logger.error('RobotCommand', '指令失败处理 - 指令不存在', { 
        commandId,
        errorMessage 
      });
      return;
    }

    const { retryCount, maxRetries, priority, commandType, robotId } = command;
    const newRetryCount = retryCount + 1;

    logger.info('RobotCommand', '指令失败处理 - 计算重试策略', {
      commandId,
      commandType,
      robotId,
      currentRetryCount: retryCount,
      newRetryCount,
      maxRetries,
      canRetry: newRetryCount < maxRetries,
      errorMessage,
      failureTimestamp: new Date().toISOString()
    });

    if (newRetryCount < maxRetries) {
      // 还可以重试
      const delay = Math.pow(2, newRetryCount) * 1000; // 指数退避
      const scheduledFor = new Date(Date.now() + delay);

      logger.info('RobotCommand', '指令失败处理 - 安排重试', {
        commandId,
        commandType,
        robotId,
        retryCount: newRetryCount,
        maxRetries,
        delay,
        delayFormula: `2^${newRetryCount} * 1000ms`,
        scheduledFor: scheduledFor.toISOString(),
        timeUntilRetry: delay + 'ms',
        errorMessage
      });

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

      logger.info('RobotCommand', '指令失败处理 - 重试已安排', {
        commandId,
        retryCount: newRetryCount,
        maxRetries,
        scheduledFor: scheduledFor.toISOString(),
        processingTime: Date.now() - startTime
      });
    } else {
      // 超过最大重试次数，标记为失败
      logger.error('RobotCommand', '指令失败处理 - 超过最大重试次数', {
        commandId,
        commandType,
        robotId,
        retryCount: newRetryCount,
        maxRetries,
        priority,
        finalErrorMessage: errorMessage,
        createdAt: command.createdAt,
        executionAttempts: newRetryCount,
        finalFailureTimestamp: new Date().toISOString(),
        totalTimeSinceCreation: Date.now() - new Date(command.createdAt).getTime()
      });

      await this.updateCommandStatus(commandId, 'failed', {
        retryCount: newRetryCount,
        errorMessage
      });

      logger.info('RobotCommand', '指令失败处理 - 已标记为最终失败', {
        commandId,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * 重试指令
   * @param {string} commandId - 指令ID
   * @returns {Promise<Object>} 结果
   */
  async retryCommand(commandId) {
    const startTime = Date.now();

    logger.info('RobotCommand', '指令重试 - 请求开始', {
      commandId,
      requestTime: new Date(startTime).toISOString()
    });

    const command = await this.getCommandById(commandId);

    if (!command) {
      logger.error('RobotCommand', '指令重试 - 指令不存在', { 
        commandId 
      });
      throw new Error('指令不存在');
    }

    if (command.status !== 'failed') {
      logger.error('RobotCommand', '指令重试 - 指令状态不允许重试', {
        commandId,
        currentStatus: command.status,
        requiredStatus: 'failed'
      });
      throw new Error('只能重试失败的指令');
    }

    logger.info('RobotCommand', '指令重试 - 重置指令状态', {
      commandId,
      previousStatus: command.status,
      previousRetryCount: command.retryCount,
      previousError: command.errorMessage,
      commandType: command.commandType,
      robotId: command.robotId
    });

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

    const processingTime = Date.now() - startTime;

    logger.info('RobotCommand', '指令重试 - 完成', {
      commandId,
      newStatus: 'pending',
      newRetryCount: 0,
      scheduledFor: now.toISOString(),
      processingTime
    });

    return { success: true, commandId, processingTime };
  }

  /**
   * 启动队列处理器
   * @param {string} workerId - 工作进程ID
   * @param {number} interval - 处理间隔（毫秒）
   */
  /**
   * 启动队列处理器
   * @param {string} workerId - 工作进程ID
   * @param {number} interval - 处理间隔（毫秒）
   */
  async startQueueProcessor(workerId = `worker-${Date.now()}`, interval = 3000) {
    if (this.isProcessing) {
      logger.warn('RobotCommand', '队列处理器 - 已在运行，忽略启动请求', { 
        existingWorkerId: workerId,
        interval 
      });
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    logger.info('RobotCommand', '队列处理器 - 启动中', { 
      workerId, 
      interval,
      startTime: new Date(startTime).toISOString()
    });

    let processCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let lastProcessTime = null;
    let cycleCount = 0;  // 记录总循环次数

    this.processInterval = setInterval(async () => {
      const cycleStartTime = Date.now();
      cycleCount++;

      try {
        const command = await this.getNextCommand(workerId);

        if (command) {
          processCount++;
          logger.info('RobotCommand', '队列处理器 - 获取到指令', {
            workerId,
            cycleNumber: processCount,
            commandId: command.id,
            commandType: command.commandType,
            robotId: command.robotId,
            priority: command.priority,
            retryCount: command.retryCount,
            createdAt: command.createdAt
          });

          const result = await this.executeCommand(command);

          if (result.success) {
            successCount++;
            logger.info('RobotCommand', '队列处理器 - 指令处理成功', {
              workerId,
              commandId: command.id,
              executionTime: result.executionTime || 'N/A'
            });
          } else {
            errorCount++;
            logger.error('RobotCommand', '队列处理器 - 指令处理失败', {
              workerId,
              commandId: command.id,
              error: result.error
            });
          }

          lastProcessTime = new Date().toISOString();
        }
        // 无待处理指令时不记录日志（减少重复日志输出）

        // 每30个周期（约90秒）记录一次统计信息
        if (cycleCount % 30 === 0) {
          logger.info('RobotCommand', '队列处理器 - 统计信息', {
            workerId,
            totalProcessed: processCount,
            successCount,
            errorCount,
            successRate: processCount > 0 ? ((successCount / processCount) * 100).toFixed(2) + '%' : '0%',
            lastProcessTime,
            uptime: ((Date.now() - startTime) / 1000).toFixed(2) + 's'
          });
        }
      } catch (error) {
        errorCount++;
        logger.error('RobotCommand', '队列处理器 - 处理周期异常', {
          workerId,
          cycleNumber: processCount + 1,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          timestamp: new Date().toISOString()
        });
      } finally {
        const cycleDuration = Date.now() - cycleStartTime;
        if (cycleDuration > 5000) {
          logger.warn('RobotCommand', '队列处理器 - 处理周期耗时过长', {
            workerId,
            cycleDuration,
            cycleNumber: processCount + 1
          });
        }
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
