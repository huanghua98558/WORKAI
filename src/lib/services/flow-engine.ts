/**
 * 流程执行引擎
 * 用于执行流程定义，管理流程实例和节点执行
 */

import { db } from '@/lib/db';
import { flowDefinitions, flowInstances, flowExecutionLogs } from '@/storage/database/shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NodeExecutorFactory } from './flow-engine/node-executors';

// ==================== 类型定义 ====================

export interface FlowContext {
  // 触发数据
  triggerData: {
    robotId: string;
    content: string;
    senderId: string;
    senderName: string;
    senderType: 'user' | 'staff' | 'operation' | 'robot';
    groupId?: string;
    groupName?: string;
    timestamp: string;
    [key: string]: any;
  };

  // 发送者信息
  senderInfo?: {
    senderType: 'user' | 'staff' | 'operation' | 'robot';
    userId?: string;
    staffId?: string;
    staffType?: string;
    operationId?: string;
  };

  // 会话信息
  sessionId?: string;

  // 业务角色配置
  businessRole?: {
    code: string;
    name: string;
    config: any;
  } | null;

  // AI 配置
  aiConfig?: {
    provider: string;
    model: string;
    systemPrompt?: string;
    temperature?: number;
  };

  // 存储临时数据
  variables: Record<string, any>;

  // 流程执行状态
  state: {
    currentNodeId: string | null;
    executionPath: string[];
    retryCount: number;
    errors: Array<{ nodeId: string; error: string; timestamp: string }>;
  };
}

export interface FlowInstanceData {
  id: string;
  flowDefinitionId: string;
  flowName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  triggerType: string;
  triggerData: any;
  currentNodeId: string | null;
  executionPath: string[];
  context: any;
  result: any;
  errorMessage: string | null;
  errorStack: string | null;
  startedAt: string;
  completedAt: string | null;
  processingTime: number | null;
  retryCount: number;
  metadata: any;
  state?: {
    currentNodeId: string | null;
    executionPath: string[];
    retryCount: number;
    errors: Array<{ nodeId: string; error: string; timestamp: string }>;
  };
}

export interface Node {
  id: string;
  type: string;
  name: string;
  data: any;
  position?: { x: number; y: number };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  version: string;
  triggerType: string;
  triggerConfig: any;
  nodes: Node[];
  edges: Edge[];
  variables: Record<string, any>;
  timeout: number;
  retryConfig: {
    maxRetries: number;
    retryInterval: number;
  };
}

export interface FlowInstance extends FlowInstanceData {
}

// ==================== 流程引擎核心类 ====================

export class FlowEngine {
  /**
   * 加载流程定义
   */
  async loadFlowDefinition(flowDefinitionId: string): Promise<FlowDefinition | null> {
    const definitions = await db
      .select()
      .from(flowDefinitions)
      .where(eq(flowDefinitions.id, flowDefinitionId))
      .limit(1);

    if (definitions.length === 0) {
      return null;
    }

    const definition = definitions[0];

    return {
      id: definition.id,
      name: definition.name,
      version: definition.version || '1.0',
      triggerType: definition.triggerType,
      triggerConfig: definition.triggerConfig,
      nodes: definition.nodes as Node[],
      edges: definition.edges as Edge[],
      variables: definition.variables || {},
      timeout: definition.timeout || 30000,
      retryConfig: definition.retryConfig as { maxRetries: number; retryInterval: number } || { maxRetries: 3, retryInterval: 1000 },
    };
  }

  /**
   * 根据触发类型获取默认流程
   */
  async getDefaultFlowByTriggerType(triggerType: string): Promise<FlowDefinition | null> {
    const definitions = await db
      .select()
      .from(flowDefinitions)
      .where(
        and(
          eq(flowDefinitions.triggerType, triggerType),
          eq(flowDefinitions.isActive, true),
          eq(flowDefinitions.isDefault, true)
        )
      )
      .orderBy(desc(flowDefinitions.priority))
      .limit(1);

    if (definitions.length === 0) {
      return null;
    }

    const definition = definitions[0];

    return {
      id: definition.id,
      name: definition.name,
      version: definition.version || '1.0',
      triggerType: definition.triggerType,
      triggerConfig: definition.triggerConfig,
      nodes: definition.nodes as Node[],
      edges: definition.edges as Edge[],
      variables: definition.variables || {},
      timeout: definition.timeout || 30000,
      retryConfig: definition.retryConfig as { maxRetries: number; retryInterval: number } || { maxRetries: 3, retryInterval: 1000 },
    };
  }

  /**
   * 创建流程实例
   */
  async createFlowInstance(
    flowDefinitionId: string,
    triggerType: string,
    triggerData: any,
    initialContext?: Partial<FlowContext>
  ): Promise<FlowInstance> {
    const flowDefinition = await this.loadFlowDefinition(flowDefinitionId);
    if (!flowDefinition) {
      throw new Error(`Flow definition not found: ${flowDefinitionId}`);
    }

    // 查找起始节点（入度为 0 的节点）
    const startNode = this.findStartNode(flowDefinition.nodes, flowDefinition.edges);
    if (!startNode) {
      throw new Error('No start node found in flow definition');
    }

    // 创建流程实例记录
    const instanceData = {
      flowDefinitionId: flowDefinitionId,
      flowName: flowDefinition.name,
      status: 'running' as const,
      triggerType,
      triggerData,
      currentNodeId: startNode.id,
      executionPath: [startNode.id],
      context: initialContext || {},
      result: {},
      errorMessage: null,
      errorStack: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      processingTime: null,
      retryCount: 0,
      metadata: {},
    };

    const [instance] = await db
      .insert(flowInstances)
      .values(instanceData)
      .returning();

    return {
      id: instance.id,
      ...instanceData,
    } as FlowInstance;
  }

  /**
   * 查找起始节点（入度为 0 的节点）
   */
  private findStartNode(nodes: Node[], edges: Edge[]): Node | null {
    // 找到入度为 0 的节点（即没有边指向它的节点）
    const targetNodeIds = new Set(edges.map(edge => edge.target));
    const startNodes = nodes.filter(node => !targetNodeIds.has(node.id));

    // 如果有多个起始节点，取第一个
    return startNodes.length > 0 ? startNodes[0] : null;
  }

  /**
   * 执行流程实例
   */
  async executeFlowInstance(instanceId: string): Promise<FlowInstance> {
    // 获取流程实例
    const [instanceRecord] = await db
      .select()
      .from(flowInstances)
      .where(eq(flowInstances.id, instanceId))
      .limit(1);

    if (!instanceRecord) {
      throw new Error(`Flow instance not found: ${instanceId}`);
    }

    const instance: FlowInstance = {
      id: instanceRecord.id,
      flowDefinitionId: instanceRecord.flowDefinitionId,
      flowName: instanceRecord.flowName || '',
      status: instanceRecord.status as any,
      triggerType: instanceRecord.triggerType,
      triggerData: instanceRecord.triggerData,
      currentNodeId: instanceRecord.currentNodeId,
      executionPath: instanceRecord.executionPath as string[],
      context: instanceRecord.context as any,
      result: instanceRecord.result as any,
      errorMessage: instanceRecord.errorMessage,
      errorStack: instanceRecord.errorStack,
      startedAt: instanceRecord.startedAt as string,
      completedAt: instanceRecord.completedAt as string | null,
      processingTime: instanceRecord.processingTime,
      retryCount: instanceRecord.retryCount || 0,
      metadata: instanceRecord.metadata as any,
    };

    // 加载流程定义
    const flowDefinition = await this.loadFlowDefinition(instance.flowDefinitionId);
    if (!flowDefinition) {
      throw new Error(`Flow definition not found: ${instance.flowDefinitionId}`);
    }

    // 执行流程
    const startTime = Date.now();

    try {
      await this.executeFlow(instance, flowDefinition);

      // 更新流程实例状态为完成
      await db
        .update(flowInstances)
        .set({
          status: 'completed',
          completedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        })
        .where(eq(flowInstances.id, instanceId));

      instance.status = 'completed';
      instance.completedAt = new Date().toISOString();
      instance.processingTime = Date.now() - startTime;

      return instance;
    } catch (error: any) {
      // 更新流程实例状态为失败
      await db
        .update(flowInstances)
        .set({
          status: 'failed',
          errorMessage: error.message,
          errorStack: error.stack,
          completedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        })
        .where(eq(flowInstances.id, instanceId));

      instance.status = 'failed';
      instance.errorMessage = error.message;
      instance.errorStack = error.stack;
      instance.completedAt = new Date().toISOString();
      instance.processingTime = Date.now() - startTime;

      throw error;
    }
  }

  /**
   * 执行流程核心逻辑
   */
  private async executeFlow(instance: FlowInstance, flowDefinition: FlowDefinition): Promise<void> {
    const maxSteps = 100; // 防止无限循环
    let steps = 0;

    while (instance.currentNodeId && steps < maxSteps) {
      steps++;

      // 获取当前节点
      const currentNode = flowDefinition.nodes.find(n => n.id === instance.currentNodeId);
      if (!currentNode) {
        throw new Error(`Node not found: ${instance.currentNodeId}`);
      }

      // 记录节点执行日志
      const logId = await this.createExecutionLog(instance, currentNode, 'running');

      // 执行节点
      try {
        const nodeResult = await this.executeNode(instance, currentNode, flowDefinition);

        // 更新执行日志
        if (logId) {
          await this.updateExecutionLog(logId, 'completed', nodeResult);
        }

        // 将节点结果存储到 context 中
        instance.context[currentNode.id] = nodeResult;

        // 查找下一个节点
        const nextNode = this.findNextNode(currentNode, instance, flowDefinition);

        if (nextNode) {
          // 更新实例的当前节点
          instance.currentNodeId = nextNode.id;
          instance.executionPath.push(nextNode.id);

          // 初始化或更新 state（仅在内存中使用）
          if (!instance.state) {
            instance.state = {
              currentNodeId: nextNode.id,
              executionPath: instance.executionPath,
              retryCount: instance.retryCount,
              errors: [],
            };
          } else {
            instance.state.currentNodeId = nextNode.id;
            instance.state.executionPath = instance.executionPath;
          }

          await db
            .update(flowInstances)
            .set({
              currentNodeId: nextNode.id,
              executionPath: instance.executionPath,
              context: instance.context as any,
            })
            .where(eq(flowInstances.id, instance.id));
        } else {
          // 流程结束
          instance.currentNodeId = null;
          instance.result = nodeResult;

          if (instance.state) {
            instance.state.currentNodeId = null;
          }
        }
      } catch (error: any) {
        // 更新执行日志
        if (logId) {
          await this.updateExecutionLog(logId, 'failed', null, error.message);
        }

        // 检查是否需要重试
        if (instance.retryCount < flowDefinition.retryConfig.maxRetries) {
          instance.retryCount++;

          // 初始化或更新 state（仅在内存中使用）
          if (!instance.state) {
            instance.state = {
              currentNodeId: currentNode.id,
              executionPath: instance.executionPath,
              retryCount: instance.retryCount,
              errors: [{ nodeId: currentNode.id, error: error.message, timestamp: new Date().toISOString() }],
            };
          } else {
            instance.state.retryCount = instance.retryCount;
          }

          await db
            .update(flowInstances)
            .set({
              retryCount: instance.retryCount,
            })
            .where(eq(flowInstances.id, instance.id));

          // 等待重试间隔
          await this.sleep(flowDefinition.retryConfig.retryInterval);
          continue;
        }

        throw error;
      }
    }

    if (steps >= maxSteps) {
      throw new Error('Flow execution exceeded maximum steps (possible infinite loop)');
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    instance: FlowInstance,
    node: Node,
    flowDefinition: FlowDefinition
  ): Promise<any> {
    // 构建节点上下文
    const nodeContext: FlowContext = {
      triggerData: instance.triggerData,
      senderInfo: instance.context.senderInfo,
      sessionId: instance.context.sessionId,
      businessRole: instance.context.businessRole,
      aiConfig: instance.context.aiConfig,
      variables: {
        ...flowDefinition.variables,
        ...instance.context.variables,
        ...node.data,
      },
      state: {
        currentNodeId: node.id,
        executionPath: instance.executionPath,
        retryCount: instance.retryCount,
        errors: instance.state?.errors || [],
      },
    };

    // 获取节点执行器
    const executor = NodeExecutorFactory.getExecutor(node.type);
    if (!executor) {
      throw new Error(`No executor found for node type: ${node.type}`);
    }

    // 执行节点
    const result = await executor.execute(nodeContext, node.data);

    return result;
  }

  /**
   * 查找下一个节点
   */
  private findNextNode(
    currentNode: Node,
    instance: FlowInstance,
    flowDefinition: FlowDefinition
  ): Node | null {
    // 查找从当前节点出发的所有边
    const outgoingEdges = flowDefinition.edges.filter(edge => edge.source === currentNode.id);

    if (outgoingEdges.length === 0) {
      return null; // 没有出边，流程结束
    }

    if (outgoingEdges.length === 1) {
      // 只有一条出边，直接返回目标节点
      const targetNode = flowDefinition.nodes.find(n => n.id === outgoingEdges[0].target);
      return targetNode || null;
    }

    // 多条出边，根据条件判断
    for (const edge of outgoingEdges) {
      if (!edge.condition) {
        // 没有条件，直接返回目标节点（默认路径）
        const targetNode = flowDefinition.nodes.find(n => n.id === edge.target);
        if (targetNode) return targetNode;
      }

      // 评估条件
      if (edge.condition && this.evaluateCondition(edge.condition, instance, flowDefinition)) {
        const targetNode = flowDefinition.nodes.find(n => n.id === edge.target);
        if (targetNode) return targetNode;
      }
    }

    // 所有条件都不满足，返回 null
    return null;
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(
    condition: string,
    instance: FlowInstance,
    flowDefinition: FlowDefinition
  ): boolean {
    // 构建评估上下文
    const context = {
      ...flowDefinition.variables,
      ...instance.context.variables,
      ...instance.triggerData,
      trigger: instance.triggerData,
      sender: instance.context.senderInfo,
      businessRole: instance.context.businessRole,
      context: instance.context,
      previousNodeResults: instance.executionPath
        .filter(nodeId => nodeId !== instance.currentNodeId)
        .reduce((acc, nodeId) => {
          acc[nodeId] = instance.context[nodeId];
          return acc;
        }, {} as Record<string, any>),
    };

    try {
      // 简单条件评估（支持 ==, !=, >, <, >=, <=, &&, ||, contains）
      const result = this.evalSimpleCondition(condition, context);
      return result;
    } catch (error) {
      console.error(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * 简单条件评估器
   */
  private evalSimpleCondition(condition: string, context: any): boolean {
    // 替换变量引用
    let evalCondition = condition;

    // 替换 ${variable} 形式的变量
    evalCondition = evalCondition.replace(/\$\{([^}]+)\}/g, (_, key) => {
      const value = this.getNestedValue(context, key);
      return JSON.stringify(value);
    });

    // 替换 context.variable 形式的变量
    evalCondition = evalCondition.replace(/context\.(\w+)/g, (_, key) => {
      const value = context[key];
      return JSON.stringify(value);
    });

    // 替换 trigger.xxx 形式的变量
    evalCondition = evalCondition.replace(/trigger\.(\w+)/g, (_, key) => {
      const value = context.trigger[key];
      return JSON.stringify(value);
    });

    // 替换 sender.xxx 形式的变量
    evalCondition = evalCondition.replace(/sender\.(\w+)/g, (_, key) => {
      const value = context.sender?.[key];
      return JSON.stringify(value);
    });

    // 简单的 contains 运算符
    const containsMatch = evalCondition.match(/(.+?)\s+contains\s+(.+)/);
    if (containsMatch) {
      const left = eval(containsMatch[1]);
      const right = eval(containsMatch[2]);
      return String(left).includes(String(right));
    }

    // 尝试评估表达式
    return eval(evalCondition);
  }

  /**
   * 获取嵌套属性值
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 创建节点执行日志
   */
  private async createExecutionLog(
    instance: FlowInstance,
    node: Node,
    status: 'running' | 'completed' | 'failed'
  ): Promise<string> {
    const [log] = await db
      .insert(flowExecutionLogs)
      .values({
        flowInstanceId: instance.id,
        flowDefinitionId: instance.flowDefinitionId,
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.name,
        status,
        inputData: instance.context,
        outputData: null,
        errorMessage: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
        processingTime: null,
        retryCount: instance.retryCount,
        metadata: {},
      })
      .returning();

    return log.id;
  }

  /**
   * 更新节点执行日志
   */
  private async updateExecutionLog(
    logId: string,
    status: 'completed' | 'failed',
    outputData: any,
    errorMessage?: string
  ): Promise<void> {
    const log = (await db
      .select()
      .from(flowExecutionLogs)
      .where(eq(flowExecutionLogs.id, logId))
      .limit(1))[0];

    if (!log) return;

    await db
      .update(flowExecutionLogs)
      .set({
        status,
        outputData,
        errorMessage: errorMessage || null,
        completedAt: new Date().toISOString(),
        processingTime: log.startedAt ? Date.now() - new Date(log.startedAt).getTime() : null,
      })
      .where(eq(flowExecutionLogs.id, logId));
  }

  /**
   * 休眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 导出单例 ====================

export const flowEngine = new FlowEngine();
