/**
 * 节点执行器
 * 实现各种节点类型的执行逻辑
 */

import { FlowContext } from '../flow-engine';

// ==================== 节点执行器接口 ====================

export interface NodeExecutor {
  /**
   * 执行节点
   * @param context 流程上下文
   * @param config 节点配置
   * @returns 执行结果
   */
  execute(context: FlowContext, config: any): Promise<any>;
}

// ==================== 基础节点执行器 ====================

export abstract class BaseNodeExecutor implements NodeExecutor {
  /**
   * 执行节点（带错误处理和日志记录）
   */
  async execute(context: FlowContext, config: any): Promise<any> {
    const startTime = Date.now();
    const nodeType = this.getNodeType();

    // 记录开始日志
    this.logExecutionStart(nodeType, context, config);

    try {
      // 执行节点逻辑
      const result = await this.doExecute(context, config);

      // 计算执行时间
      const processingTime = Date.now() - startTime;

      // 记录成功日志
      this.logExecutionSuccess(nodeType, result, processingTime);

      // 返回结果，包含执行时间
      return {
        ...result,
        processingTime,
        executedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      // 计算执行时间
      const processingTime = Date.now() - startTime;

      // 记录错误日志
      this.logExecutionError(nodeType, error, processingTime, context, config);

      // 构建错误响应
      const errorResponse = {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        nodeType,
        processingTime,
        executedAt: new Date().toISOString(),
      };

      // 将错误信息存储到上下文
      this.setContextValue(context, `lastError_${nodeType}`, errorResponse);

      // 重新抛出错误
      throw new Error(`[${nodeType}] ${error.message}`);
    }
  }

  /**
   * 记录执行开始日志
   */
  private logExecutionStart(
    nodeType: string,
    context: FlowContext,
    config: any
  ): void {
    console.log(`[${nodeType}] Execution started`, {
      timestamp: new Date().toISOString(),
      senderType: context.senderInfo?.senderType,
      senderId: context.triggerData?.senderId,
      contentPreview: context.triggerData?.content?.substring(0, 100),
      configKeys: Object.keys(config || {}),
    });
  }

  /**
   * 记录执行成功日志
   */
  private logExecutionSuccess(
    nodeType: string,
    result: any,
    processingTime: number
  ): void {
    console.log(`[${nodeType}] Execution completed successfully`, {
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`,
      resultKeys: Object.keys(result || {}),
      success: result?.success,
    });
  }

  /**
   * 记录执行错误日志
   */
  private logExecutionError(
    nodeType: string,
    error: any,
    processingTime: number,
    context: FlowContext,
    config: any
  ): void {
    console.error(`[${nodeType}] Execution failed`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`,
      senderType: context.senderInfo?.senderType,
      senderId: context.triggerData?.senderId,
      contentPreview: context.triggerData?.content?.substring(0, 100),
      config: config,
    });
  }

  /**
   * 子类实现的具体执行逻辑
   */
  protected abstract doExecute(context: FlowContext, config: any): Promise<any>;

  /**
   * 获取节点类型
   */
  protected abstract getNodeType(): string;

  /**
   * 从上下文中获取值
   */
  protected getContextValue(context: FlowContext, path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let value: any = context;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 设置上下文值
   */
  protected setContextValue(context: FlowContext, path: string, value: any): void {
    const keys = path.split('.');
    let obj: any = context.variables;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in obj) || typeof obj[key] !== 'object') {
        obj[key] = {};
      }
      obj = obj[key];
    }

    obj[keys[keys.length - 1]] = value;
  }
}

// ==================== Webhook 触发节点执行器 ====================

export class WebhookTriggerExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'trigger_webhook';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Webhook Trigger Node', {
      config,
      triggerData: context.triggerData,
    });

    // Webhook 触发节点主要负责接收和验证触发数据
    // 验证签名（如果配置了）
    if (config.enableSignature) {
      const signature = context.triggerData.signature;
      const payload = context.triggerData.payload;

      if (!this.verifySignature(signature, payload, config.secretKey)) {
        throw new Error('Invalid webhook signature');
      }
    }

    // 幂等性检查
    if (config.enableIdempotency) {
      const eventId = context.triggerData.eventId;
      if (await this.isDuplicateEvent(eventId, config.idempotencyTTL)) {
        console.log('Duplicate event detected, skipping');
        return { skipped: true, reason: 'duplicate' };
      }
    }

    // 验证超时
    if (config.timeout) {
      const timestamp = new Date(context.triggerData.timestamp).getTime();
      const now = Date.now();
      if (now - timestamp > config.timeout) {
        throw new Error('Webhook payload expired');
      }
    }

    // 返回触发数据供后续节点使用
    return {
      success: true,
      triggerData: context.triggerData,
      timestamp: new Date().toISOString(),
    };
  }

  private verifySignature(signature: string, payload: any, secretKey: string): boolean {
    // 实现签名验证逻辑（例如 HMAC-SHA256）
    // 这里简化处理，实际应该使用 crypto 模块
    return true;
  }

  private async isDuplicateEvent(eventId: string, ttl: number): Promise<boolean> {
    // 实现幂等性检查（例如使用 Redis）
    // 这里简化处理，实际应该使用 Redis 或数据库
    return false;
  }
}

// ==================== 条件判断节点执行器 ====================

export class ConditionExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'condition';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Condition Node', { config });

    const conditions = config.conditions || [];
    const results: Record<string, boolean> = {};

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, context);
      results[condition.id] = result;
    }

    return {
      results,
      matchedConditions: Object.entries(results)
        .filter(([_, matched]) => matched)
        .map(([id, _]) => id),
    };
  }

  private evaluateCondition(condition: any, context: FlowContext): boolean {
    const field = condition.field;
    const operator = condition.operator;
    const value = condition.value;

    const fieldValue = this.getContextValue(context, field);

    switch (operator) {
      case '==':
        return fieldValue === value;
      case '!=':
        return fieldValue !== value;
      case '>':
        return Number(fieldValue) > Number(value);
      case '<':
        return Number(fieldValue) < Number(value);
      case '>=':
        return Number(fieldValue) >= Number(value);
      case '<=':
        return Number(fieldValue) <= Number(value);
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'startsWith':
        return String(fieldValue).startsWith(String(value));
      case 'endsWith':
        return String(fieldValue).endsWith(String(value));
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'notIn':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'notExists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }
}

// ==================== AI 消息节点执行器 ====================

export class AiMessageExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'ai_message';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing AI Message Node', { config });

    // 导入 LLM SDK
    const { LLMClient, Config } = await import('coze-coding-dev-sdk');

    // 构建消息
    const messages = [
      {
        role: 'system' as const,
        content: config.systemPrompt || '你是一个智能客服助手，请根据用户问题给出专业、友好的回复。',
      },
      {
        role: 'user' as const,
        content: context.triggerData.content,
      },
    ];

    // 初始化 LLM 客户端
    const llmConfig = new Config();
    const client = new LLMClient(llmConfig);

    // 调用 LLM
    const response = await client.invoke(messages, {
      model: config.model || 'doubao-seed-1-8-251228',
      temperature: config.temperature || 0.7,
    });

    // 存储结果到上下文
    this.setContextValue(context, 'aiResponse', response.content);

    // 如果需要发送回复消息
    if (config.sendReply) {
      await this.sendRobotMessage(context, response.content);
    }

    return {
      success: true,
      response: response.content,
      timestamp: new Date().toISOString(),
    };
  }

  private async sendRobotMessage(context: FlowContext, content: string): Promise<void> {
    // 集成机器人 API 调用
    const { workToolApi } = await import('../worktool-api-proxy');

    const result = await workToolApi.sendMessage({
      robotId: context.triggerData.robotId,
      toName: context.triggerData.senderId,  // 发送给消息发送者
      content,
      messageType: 1,  // 文本消息
    });

    if (!result.success) {
      console.error('Failed to send robot message:', result.error);
      throw new Error(`Failed to send message: ${result.error}`);
    }

    console.log('Robot message sent successfully:', result.data);
  }
}

// ==================== 多任务消息节点执行器 ====================

export class MultiTaskMessageExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'multi_task_message';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    const startTime = Date.now();
    console.log('[MultiTaskMessage] Starting execution', {
      taskId: context.triggerData.senderId,
      content: context.triggerData.content?.substring(0, 50),
      config: {
        saveToMessagesTable: config.saveToMessagesTable,
        saveToSessionMessages: config.saveToSessionMessages,
        pushToMonitorQueue: config.pushToMonitorQueue,
      },
    });

    const results = {
      saveToMessagesTable: null as any,
      saveToSessionMessages: null as any,
      pushToMonitorQueue: null as any,
    };

    try {
      // 1. 保存到 messages 表（如果启用）
      if (config.saveToMessagesTable) {
        console.log('[MultiTaskMessage] Saving to messages table...');
        results.saveToMessagesTable = await this.saveToMessagesTable(context, config);
        console.log('[MultiTaskMessage] Saved to messages table:', results.saveToMessagesTable);
      }

      // 2. 保存到 session_messages 表（如果启用）
      if (config.saveToSessionMessages) {
        console.log('[MultiTaskMessage] Saving to session messages...');
        results.saveToSessionMessages = await this.saveToSessionMessages(context, config);
        console.log('[MultiTaskMessage] Saved to session messages:', results.saveToSessionMessages);
      }

      // 3. 推送到监控队列（如果启用）
      if (config.pushToMonitorQueue) {
        console.log('[MultiTaskMessage] Pushing to monitor queue...');
        results.pushToMonitorQueue = await this.pushToMonitorQueue(context, config);
        console.log('[MultiTaskMessage] Pushed to monitor queue:', results.pushToMonitorQueue);
      }

      const processingTime = Date.now() - startTime;
      console.log('[MultiTaskMessage] Execution completed successfully', {
        processingTime,
        results,
      });

      // 存储结果到上下文
      this.setContextValue(context, 'messageReceiveResult', {
        success: true,
        results,
        processingTime,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        results,
        processingTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[MultiTaskMessage] Execution failed:', {
        error: error.message,
        stack: error.stack,
        processingTime,
        results,
      });

      // 记录错误到上下文
      this.setContextValue(context, 'messageReceiveError', {
        error: error.message,
        stack: error.stack,
        results,
        timestamp: new Date().toISOString(),
      });

      throw new Error(`MultiTaskMessage execution failed: ${error.message}`);
    }
  }

  /**
   * 保存到 messages 表
   */
  private async saveToMessagesTable(context: FlowContext, config: any): Promise<any> {
    try {
      const { db } = await import('@/lib/db');
      const { messages } = await import('@/storage/database/shared/schema');

      const [message] = await db
        .insert(messages)
        .values({
          robotId: context.triggerData.robotId,
          senderId: context.triggerData.senderId,
          senderName: context.triggerData.senderName,
          content: context.triggerData.content,
          messageType: config.messageSend?.messageType || 'text',
          groupId: context.triggerData.groupId,
          groupName: context.triggerData.groupName,
          timestamp: context.triggerData.timestamp || new Date().toISOString(),
          metadata: {
            senderType: context.senderInfo?.senderType,
            imageUrl: context.triggerData.imageUrl,
          },
        })
        .returning();

      return { success: true, messageId: message.id };
    } catch (error: any) {
      console.error('[MultiTaskMessage] Failed to save to messages table:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 保存到 session_messages 表
   */
  private async saveToSessionMessages(context: FlowContext, config: any): Promise<any> {
    try {
      const { db } = await import('@/lib/db');
      const { sessionMessages } = await import('@/storage/database/shared/schema');

      // 如果没有 sessionId，创建一个
      if (!context.sessionId) {
        console.warn('[MultiTaskMessage] No sessionId in context, skipping session messages save');
        return {
          success: false,
          skipped: true,
          reason: 'no_session_id',
        };
      }

      const [sessionMessage] = await db
        .insert(sessionMessages)
        .values({
          sessionId: context.sessionId,
          senderId: context.triggerData.senderId,
          senderName: context.triggerData.senderName,
          content: context.triggerData.content,
          messageType: config.messageSend?.messageType || 'text',
          senderType: context.senderInfo?.senderType || 'user',
          metadata: {
            imageUrl: context.triggerData.imageUrl,
            atUser: config.messageSend?.atUser || false,
          },
        })
        .returning();

      return { success: true, sessionMessageId: sessionMessage.id };
    } catch (error: any) {
      console.error('[MultiTaskMessage] Failed to save to session messages table:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 推送到监控队列
   */
  private async pushToMonitorQueue(context: FlowContext, config: any): Promise<any> {
    try {
      // 这里可以推送到 Redis 队列或消息队列
      // 暂时只记录日志
      console.log('[MultiTaskMessage] Monitor queue data:', {
        robotId: context.triggerData.robotId,
        senderId: context.triggerData.senderId,
        content: context.triggerData.content,
        senderType: context.senderInfo?.senderType,
        timestamp: new Date().toISOString(),
      });

      // TODO: 实现实际的队列推送逻辑
      // const { redis } = await import('@/lib/redis');
      // await redis.lpush('monitor_queue', JSON.stringify({ ... }));

      return {
        success: true,
        message: 'Pushed to monitor queue (logged only for now)',
      };
    } catch (error: any) {
      console.error('[MultiTaskMessage] Failed to push to monitor queue:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ==================== 多任务 AI 节点执行器 ====================

export class MultiTaskAiExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'multi_task_ai';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Multi-Task AI Node', { config });

    const taskTypes = config.taskTypes || [];
    const cooperationScoreRules = config.cooperationScoreRules || {};

    // 导入 LLM SDK
    const { LLMClient, Config } = await import('coze-coding-dev-sdk');

    // 构建系统提示
    const systemPrompt = this.buildSystemPrompt(taskTypes, cooperationScoreRules, config);

    // 构建消息
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: context.triggerData.content,
      },
    ];

    // 初始化 LLM 客户端
    const llmConfig = new Config();
    const client = new LLMClient(llmConfig);

    // 调用 LLM
    const response = await client.invoke(messages, {
      model: config.model || 'doubao-seed-1-8-251228',
      temperature: config.temperature || 0.7,
    });

    // 解析 AI 响应
    const parsed = this.parseAiResponse(response.content);

    // 存储结果到上下文
    this.setContextValue(context, 'multiTaskResult', parsed);

    return {
      success: true,
      response: response.content,
      parsed,
      timestamp: new Date().toISOString(),
    };
  }

  private buildSystemPrompt(
    taskTypes: any[],
    cooperationScoreRules: any,
    config: any
  ): string {
    let prompt = `你是一个智能客服助手，负责处理用户的各种问题。

支持的任务类型：\n`;
    
    taskTypes.forEach(task => {
      prompt += `- ${task.name}: ${task.description}\n`;
    });

    prompt += `\n协作评分规则：\n`;
    Object.entries(cooperationScoreRules).forEach(([key, rule]: [string, any]) => {
      prompt += `- ${key}: ${rule.description}\n`;
    });

    prompt += `\n请根据用户问题，分析其任务类型，并给出相应的回复。`;

    return prompt;
  }

  private parseAiResponse(response: string): any {
    // 解析 AI 响应，提取任务类型、协作评分等
    // 这里简化处理，实际应该使用更复杂的解析逻辑
    return {
      rawResponse: response,
      taskType: 'general',
      cooperationScore: 5,
    };
  }
}

// ==================== 售后任务节点执行器 ====================

export class AfterSalesTaskExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'after_sales_task';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing After-Sales Task Node', { config });

    const taskTypes = config.taskTypes || [];
    const robotComfort = config.robotComfort || {};

    // 检查售后任务是否已存在
    const existingTask = await this.checkExistingTask(context);
    if (existingTask) {
      console.log('Existing task found, skipping');
      return { skipped: true, reason: 'existing_task', taskId: existingTask.id };
    }

    // 识别任务类型
    const taskType = this.identifyTaskType(context.triggerData.content, taskTypes);

    // 创建售后任务
    const task = await this.createTask(context, taskType, config);

    // 如果启用了机器人安抚
    if (robotComfort.enabled) {
      await this.sendComfortMessage(context, robotComfort);
    }

    // 如果启用了腾讯文档同步
    if (config.tencentDocSync?.enabled) {
      await this.syncToTencentDoc(task, config.tencentDocSync);
    }

    // 存储结果到上下文
    this.setContextValue(context, 'afterSalesTask', task);

    return {
      success: true,
      task,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkExistingTask(context: FlowContext): Promise<any> {
    // 检查是否已存在未完成的售后任务
    // TODO: 实现实际的数据库查询
    return null;
  }

  private identifyTaskType(content: string, taskTypes: any[]): string {
    // 根据内容识别任务类型
    // TODO: 实现实际的任务类型识别逻辑
    return 'general_inquiry';
  }

  private async createTask(context: FlowContext, taskType: string, config: any): Promise<any> {
    // 创建售后任务
    // TODO: 实现实际的数据库插入
    return {
      id: `task_${Date.now()}`,
      type: taskType,
      content: context.triggerData.content,
      senderId: context.triggerData.senderId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  private async sendComfortMessage(context: FlowContext, config: any): Promise<void> {
    // 发送安抚消息
    const { workToolApi } = await import('../worktool-api-proxy');

    const result = await workToolApi.sendMessage({
      robotId: context.triggerData.robotId,
      toName: context.triggerData.senderId,
      content: config.message,
      messageType: 1,
    });

    if (!result.success) {
      console.error('Failed to send comfort message:', result.error);
    }

    console.log('Comfort message sent:', result.data);
  }

  private async syncToTencentDoc(task: any, config: any): Promise<void> {
    // 同步到腾讯文档
    // TODO: 实现实际的文档同步
    console.log('Syncing to Tencent Doc:', config);
  }
}

// ==================== 机器人回复节点执行器 ====================

export class RobotReplyExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'robot_reply';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Robot Reply Node', { config });

    const timeRestriction = config.timeRestriction || {};
    const replyDelay = config.replyDelay || 0;

    // 检查时间限制
    if (timeRestriction.enabled) {
      const currentTime = new Date();
      const hour = currentTime.getHours();

      if (timeRestriction.workHours) {
        const [start, end] = timeRestriction.workHours;
        if (hour < start || hour >= end) {
          console.log('Outside working hours, skipping reply');
          return { skipped: true, reason: 'outside_work_hours' };
        }
      }
    }

    // 延迟发送
    if (replyDelay > 0) {
      await this.sleep(replyDelay * 1000);
    }

    // 获取回复内容
    let content = '';
    if (config.template) {
      content = this.renderTemplate(config.template, context);
    } else if (config.useAiResponse) {
      content = this.getContextValue(context, 'aiResponse', '');
    }

    // 发送消息
    const result = await this.sendRobotMessage(context, content);

    return {
      success: true,
      content,
      result,
      timestamp: new Date().toISOString(),
    };
  }

  private renderTemplate(template: string, context: FlowContext): string {
    // 渲染模板
    let rendered = template;

    // 替换 ${variable} 形式的变量
    rendered = rendered.replace(/\$\{([^}]+)\}/g, (_, path) => {
      return this.getContextValue(context, path, '');
    });

    return rendered;
  }

  private async sendRobotMessage(context: FlowContext, content: string): Promise<any> {
    // 集成机器人 API 调用
    const { workToolApi } = await import('../worktool-api-proxy');

    const result = await workToolApi.sendMessage({
      robotId: context.triggerData.robotId,
      toName: context.triggerData.senderId,
      content,
      messageType: 1,
    });

    if (!result.success) {
      console.error('Failed to send robot message:', result.error);
      throw new Error(`Failed to send message: ${result.error}`);
    }

    return result.data;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 等待节点执行器 ====================

export class DelayExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'delay';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Delay Node', { config });

    const delayMs = config.duration * 1000;

    await this.sleep(delayMs);

    return {
      success: true,
      duration: config.duration,
      timestamp: new Date().toISOString(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 结束节点执行器 ====================

export class EndExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'end';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing End Node', { config });

    return {
      success: true,
      message: config.message || 'Flow completed',
      timestamp: new Date().toISOString(),
    };
  }
}

// ==================== 节点执行器工厂 ====================

export class NodeExecutorFactory {
  private static executors: Map<string, NodeExecutor> = new Map();

  /**
   * 注册节点执行器
   */
  static registerExecutor(nodeType: string, executor: NodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  /**
   * 获取节点执行器
   */
  static getExecutor(nodeType: string): NodeExecutor | null {
    return this.executors.get(nodeType) || null;
  }

  /**
   * 初始化默认执行器
   */
  static async initialize(): Promise<void> {
    this.registerExecutor('trigger_webhook', new WebhookTriggerExecutor());
    this.registerExecutor('condition', new ConditionExecutor());
    this.registerExecutor('ai_message', new AiMessageExecutor());
    this.registerExecutor('multi_task_ai', new MultiTaskAiExecutor());
    this.registerExecutor('multi_task_message', new MultiTaskMessageExecutor());
    this.registerExecutor('after_sales_task', new AfterSalesTaskExecutor());
    this.registerExecutor('robot_reply', new RobotReplyExecutor());
    this.registerExecutor('delay', new DelayExecutor());
    this.registerExecutor('end', new EndExecutor());

    // v8.0 新节点执行器
    const v8Executors = await import('./v8-node-executors');
    this.registerExecutor('PRIORITY_CHECK', new v8Executors.PriorityCheckExecutor());
    this.registerExecutor('OPERATION_MESSAGE', new v8Executors.OperationMessageExecutor());
    this.registerExecutor('STAFF_MESSAGE_HANDLER', new v8Executors.StaffMessageExecutor());
    this.registerExecutor('USER_MESSAGE_HANDLER', new v8Executors.UserMessageExecutor());
    this.registerExecutor('IMAGE_RECOGNITION', new v8Executors.ImageRecognitionExecutor());
    this.registerExecutor('COLLABORATION_ANALYSIS_NODE', new v8Executors.CollaborationAnalysisExecutor());
    this.registerExecutor('INTERVENTION_DECISION', new v8Executors.InterventionDecisionExecutor());
    this.registerExecutor('MONITOR_ONLY', new v8Executors.MonitorOnlyExecutor());
    this.registerExecutor('NOTIFICATION_DISPATCH', new v8Executors.NotificationDispatchExecutor());
  }
}

// 初始化默认执行器
NodeExecutorFactory.initialize();
