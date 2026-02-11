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
   * 执行节点（带错误处理）
   */
  async execute(context: FlowContext, config: any): Promise<any> {
    try {
      return await this.doExecute(context, config);
    } catch (error: any) {
      console.error(`Node execution failed: ${this.getNodeType()}`, error);
      throw error;
    }
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
  static initialize(): void {
    this.registerExecutor('trigger_webhook', new WebhookTriggerExecutor());
    this.registerExecutor('condition', new ConditionExecutor());
    this.registerExecutor('ai_message', new AiMessageExecutor());
    this.registerExecutor('multi_task_ai', new MultiTaskAiExecutor());
    this.registerExecutor('after_sales_task', new AfterSalesTaskExecutor());
    this.registerExecutor('robot_reply', new RobotReplyExecutor());
    this.registerExecutor('delay', new DelayExecutor());
    this.registerExecutor('end', new EndExecutor());
  }
}

// 初始化默认执行器
NodeExecutorFactory.initialize();
