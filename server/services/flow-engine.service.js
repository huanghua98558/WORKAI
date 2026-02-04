/**
 * WorkTool AI 2.1 - 流程引擎核心服务
 * 负责流程定义管理、流程实例执行、节点编排
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions, flowInstances, flowExecutionLogs } = require('../database/schema');
const { eq, and, or, desc, lt, gt, inArray } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');
const { aiCoreService } = require('./ai-core.service'); // AI核心服务

const logger = getLogger('FLOW_ENGINE');

// ============================================
// 流程引擎常量
// ============================================

// 节点类型枚举
const NodeType = {
  START: 'start',
  END: 'end',
  CONDITION: 'condition',
  AI_CHAT: 'ai_chat',
  INTENT: 'intent',
  SERVICE: 'service',
  HUMAN_HANDOVER: 'human_handover',
  NOTIFICATION: 'notification'
};

// 流程状态枚举
const FlowStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout'
};

// 触发类型枚举
const TriggerType = {
  WEBHOOK: 'webhook',
  MANUAL: 'manual',
  SCHEDULED: 'scheduled'
};

// ============================================
// 流程引擎核心类
// ============================================

class FlowEngine {
  constructor() {
    // 数据库连接（延迟初始化）
    this.dbPromise = null;

    // 节点处理器注册表
    this.nodeHandlers = {
      [NodeType.START]: this.handleStartNode.bind(this),
      [NodeType.END]: this.handleEndNode.bind(this),
      [NodeType.CONDITION]: this.handleConditionNode.bind(this),
      [NodeType.AI_CHAT]: this.handleAIChatNode.bind(this),
      [NodeType.INTENT]: this.handleIntentNode.bind(this),
      [NodeType.SERVICE]: this.handleServiceNode.bind(this),
      [NodeType.HUMAN_HANDOVER]: this.handleHumanHandoverNode.bind(this),
      [NodeType.NOTIFICATION]: this.handleNotificationNode.bind(this)
    };
  }

  /**
   * 获取数据库连接（确保已初始化）
   */
  async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = getDb();
    }
    return this.dbPromise;
  }

  // ============================================
  // 流程定义管理 (CRUD)
  // ============================================

  /**
   * 创建流程定义
   */
  async createFlowDefinition(flowData) {
    try {
      const db = await this.getDb();
      const id = uuidv4();
      const flowDef = {
        id,
        name: flowData.name,
        description: flowData.description || '',
        version: flowData.version || '1.0',
        isActive: flowData.isActive !== false,
        triggerType: flowData.triggerType || TriggerType.WEBHOOK,
        triggerConfig: flowData.triggerConfig || {},
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        variables: flowData.variables || {},
        timeout: flowData.timeout || 30000,
        retryConfig: flowData.retryConfig || { maxRetries: 3, retryInterval: 1000 },
        createdBy: flowData.createdBy
      };

      await db.insert(flowDefinitions).values(flowDef);

      logger.info('流程定义创建成功', { id, name: flowDef.name });
      return flowDef;
    } catch (error) {
      logger.error('创建流程定义失败', { error: error.message, flowData });
      throw new Error(`创建流程定义失败: ${error.message}`);
    }
  }

  /**
   * 更新流程定义
   */
  async updateFlowDefinition(id, updateData) {
    try {
      await (await this.getDb()).update(flowDefinitions)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(flowDefinitions.id, id));

      const updated = await this.getFlowDefinition(id);
      logger.info('流程定义更新成功', { id });
      return updated;
    } catch (error) {
      logger.error('更新流程定义失败', { id, error: error.message });
      throw new Error(`更新流程定义失败: ${error.message}`);
    }
  }

  /**
   * 删除流程定义
   */
  async deleteFlowDefinition(id) {
    try {
      await (await this.getDb()).delete(flowDefinitions).where(eq(flowDefinitions.id, id));
      logger.info('流程定义删除成功', { id });
      return { success: true };
    } catch (error) {
      logger.error('删除流程定义失败', { id, error: error.message });
      throw new Error(`删除流程定义失败: ${error.message}`);
    }
  }

  /**
   * 获取流程定义
   */
  async getFlowDefinition(id) {
    try {
      const result = await (await this.getDb()).select()
        .from(flowDefinitions)
        .where(eq(flowDefinitions.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('获取流程定义失败', { id, error: error.message });
      throw new Error(`获取流程定义失败: ${error.message}`);
    }
  }

  /**
   * 查询流程定义列表
   */
  async listFlowDefinitions(filters = {}) {
    try {
      const conditions = [];

      if (filters.isActive !== undefined) {
        conditions.push(eq(flowDefinitions.isActive, filters.isActive));
      }

      if (filters.triggerType) {
        conditions.push(eq(flowDefinitions.triggerType, filters.triggerType));
      }

      let query = (await this.getDb()).select().from(flowDefinitions);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(flowDefinitions.createdAt));

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      logger.error('查询流程定义列表失败', { filters, error: error.message });
      throw new Error(`查询流程定义列表失败: ${error.message}`);
    }
  }

  // ============================================
  // 流程实例管理
  // ============================================

  /**
   * 创建流程实例
   */
  async createFlowInstance(flowDefinitionId, triggerData = {}, metadata = {}) {
    try {
      const flowDef = await this.getFlowDefinition(flowDefinitionId);
      if (!flowDef) {
        throw new Error('流程定义不存在');
      }

      if (!flowDef.isActive) {
        throw new Error('流程定义未启用');
      }

      const instanceId = uuidv4();
      const instance = {
        id: instanceId,
        flowDefinitionId,
        flowName: flowDef.name,
        status: FlowStatus.PENDING,
        triggerType: flowDef.triggerType,
        triggerData,
        context: {
          ...flowDef.variables,
          ...triggerData
        },
        metadata,
        retryCount: 0
      };

      await (await this.getDb()).insert(flowInstances).values(instance);

      logger.info('流程实例创建成功', { instanceId, flowDefinitionId });
      return instance;
    } catch (error) {
      logger.error('创建流程实例失败', { flowDefinitionId, error: error.message });
      throw new Error(`创建流程实例失败: ${error.message}`);
    }
  }

  /**
   * 获取流程实例
   */
  async getFlowInstance(id) {
    try {
      const result = await (await this.getDb()).select()
        .from(flowInstances)
        .where(eq(flowInstances.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('获取流程实例失败', { id, error: error.message });
      throw new Error(`获取流程实例失败: ${error.message}`);
    }
  }

  /**
   * 查询流程实例列表
   */
  async listFlowInstances(filters = {}) {
    try {
      const conditions = [];

      if (filters.flowDefinitionId) {
        conditions.push(eq(flowInstances.flowDefinitionId, filters.flowDefinitionId));
      }

      if (filters.status) {
        conditions.push(eq(flowInstances.status, filters.status));
      }

      let query = (await this.getDb()).select().from(flowInstances);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(flowInstances.startedAt));

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      logger.error('查询流程实例列表失败', { filters, error: error.message });
      throw new Error(`查询流程实例列表失败: ${error.message}`);
    }
  }

  /**
   * 更新流程实例状态
   */
  async updateFlowInstance(id, updateData) {
    try {
      await (await this.getDb()).update(flowInstances)
        .set(updateData)
        .where(eq(flowInstances.id, id));

      return await this.getFlowInstance(id);
    } catch (error) {
      logger.error('更新流程实例失败', { id, error: error.message });
      throw new Error(`更新流程实例失败: ${error.message}`);
    }
  }

  // ============================================
  // 流程执行核心逻辑
  // ============================================

  /**
   * 执行流程（异步）
   */
  async executeFlow(instanceId) {
    try {
      const instance = await this.getFlowInstance(instanceId);
      if (!instance) {
        throw new Error('流程实例不存在');
      }

      const flowDef = await this.getFlowDefinition(instance.flowDefinitionId);
      if (!flowDef) {
        throw new Error('流程定义不存在');
      }

      // 更新实例状态为运行中
      await this.updateFlowInstance(instanceId, {
        status: FlowStatus.RUNNING,
        startedAt: new Date()
      });

      logger.info('开始执行流程', { instanceId, flowName: flowDef.name });

      // 执行流程
      await this.executeNodes(instanceId, flowDef);

      logger.info('流程执行完成', { instanceId });
    } catch (error) {
      logger.error('流程执行失败', { instanceId, error: error.message, stack: error.stack });

      // 更新实例状态为失败
      await this.updateFlowInstance(instanceId, {
        status: FlowStatus.FAILED,
        errorMessage: error.message,
        errorStack: error.stack,
        completedAt: new Date()
      });
    }
  }

  /**
   * 执行节点序列
   */
  async executeNodes(instanceId, flowDef) {
    const instance = await this.getFlowInstance(instanceId);
    const { nodes, edges } = flowDef;

    // 找到起始节点
    const startNode = nodes.find(node => node.type === NodeType.START);
    if (!startNode) {
      throw new Error('流程定义必须包含开始节点');
    }

    let currentNode = startNode;
    const executionPath = [startNode.id];
    const context = { ...instance.context };

    // 执行节点序列
    while (currentNode) {
      // 记录执行路径
      executionPath.push(currentNode.id);

      // 更新当前节点
      await this.updateFlowInstance(instanceId, {
        currentNodeId: currentNode.id,
        executionPath,
        context
      });

      // 执行当前节点
      const nodeResult = await this.executeNode(instanceId, currentNode, context);

      // 更新上下文
      Object.assign(context, nodeResult.context || {});

      // 检查是否到达结束节点
      if (currentNode.type === NodeType.END) {
        await this.updateFlowInstance(instanceId, {
          status: FlowStatus.COMPLETED,
          result: nodeResult.result,
          context,
          completedAt: new Date(),
          processingTime: Date.now() - new Date(instance.startedAt).getTime()
        });
        break;
      }

      // 获取下一个节点
      currentNode = this.getNextNode(currentNode, edges, nodeResult, context, nodes);

      // 检查超时
      const elapsedTime = Date.now() - new Date(instance.startedAt).getTime();
      if (elapsedTime > flowDef.timeout) {
        throw new Error('流程执行超时');
      }
    }
  }

  /**
   * 执行单个节点
   */
  async executeNode(instanceId, node, context) {
    const startTime = Date.now();

    // 创建执行日志
    const logId = uuidv4();
    const logData = {
      id: logId,
      flowInstanceId: instanceId,
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.name || node.type,
      status: 'running',
      inputData: { ...context, nodeConfig: node.data || {} }
    };

    await (await this.getDb()).insert(flowExecutionLogs).values(logData);

    logger.info('开始执行节点', { instanceId, nodeId: node.id, nodeType: node.type });

    try {
      // 获取节点处理器
      const handler = this.nodeHandlers[node.type];
      if (!handler) {
        throw new Error(`未知的节点类型: ${node.type}`);
      }

      // 执行节点处理器
      const result = await handler(node, context);

      // 更新执行日志
      const completedTime = Date.now();
      await (await this.getDb()).update(flowExecutionLogs)
        .set({
          status: 'completed',
          outputData: result,
          completedAt: new Date(completedTime),
          processingTime: completedTime - startTime
        })
        .where(eq(flowExecutionLogs.id, logId));

      logger.info('节点执行完成', { instanceId, nodeId: node.id, processingTime: completedTime - startTime });

      return result;
    } catch (error) {
      // 更新执行日志为失败状态
      const completedTime = Date.now();
      await (await this.getDb()).update(flowExecutionLogs)
        .set({
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(completedTime),
          processingTime: completedTime - startTime
        })
        .where(eq(flowExecutionLogs.id, logId));

      logger.error('节点执行失败', { instanceId, nodeId: node.id, error: error.message });
      throw error;
    }
  }

  /**
   * 获取下一个节点
   */
  getNextNode(currentNode, edges, nodeResult, context, nodes) {
    // 找到从当前节点出发的边
    const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);

    if (outgoingEdges.length === 0) {
      return null; // 没有下一个节点
    }

    // 如果是条件节点，根据结果选择下一个节点
    if (currentNode.type === NodeType.CONDITION) {
      const conditionResult = nodeResult.conditionResult;
      const selectedEdge = outgoingEdges.find(edge => edge.condition === conditionResult);
      if (selectedEdge) {
        // 根据target ID查找完整的节点对象
        const targetNodeId = selectedEdge.target || selectedEdge.targetNode?.id;
        return nodes.find(node => node.id === targetNodeId);
      }
      return null;
    }

    // 否则，返回第一个边的目标节点
    const targetNodeId = outgoingEdges[0].target || outgoingEdges[0].targetNode?.id;
    return nodes.find(node => node.id === targetNodeId);
  }

  // ============================================
  // 节点处理器实现 (Mock版本)
  // ============================================

  /**
   * 处理开始节点
   */
  async handleStartNode(node, context) {
    logger.info('执行开始节点', { node, context });
    return {
      success: true,
      message: '流程开始',
      context
    };
  }

  /**
   * 处理结束节点
   */
  async handleEndNode(node, context) {
    logger.info('执行结束节点', { node, context });
    return {
      success: true,
      message: '流程结束',
      result: {
        finalContext: context,
        timestamp: new Date().toISOString()
      },
      context
    };
  }

  /**
   * 处理条件节点（Mock）
   */
  async handleConditionNode(node, context) {
    logger.info('执行条件节点', { node, context, contextIntent: context.intent });

    const { data } = node;
    const { condition } = data || {};

    // Mock逻辑：根据条件表达式返回结果
    let conditionResult = 'default';

    if (condition) {
      // 这里应该是实际的条件判断逻辑
      // 暂时使用简单的字符串匹配
      if (condition.includes('service') || context.intent === 'service') {
        conditionResult = 'service';
      } else if (condition.includes('chat') || context.intent === 'chat') {
        conditionResult = 'chat';
      } else if (condition.includes('help') || context.intent === 'help') {
        conditionResult = 'help';
      }
    }

    logger.info('条件节点结果', { condition, contextIntent: context.intent, conditionResult });

    return {
      success: true,
      conditionResult,
      context
    };
  }

  /**
   * 处理AI对话节点（使用真实AI）
   */
  async handleAIChatNode(node, context) {
    logger.info('执行AI对话节点', { node, context });

    const { data } = node;
    const { prompt, modelId, roleId, temperature, maxTokens } = data || {};

    try {
      // 构建消息列表
      const messages = [];

      // 如果有prompt，添加为系统消息
      if (prompt) {
        messages.push({ role: 'system', content: prompt });
      }

      // 添加用户消息
      if (context.message?.spoken) {
        messages.push({ role: 'user', content: context.message.spoken });
      } else if (context.userMessage) {
        messages.push({ role: 'user', content: context.userMessage });
      }

      // 如果没有消息，返回空响应
      if (messages.length === 0) {
        logger.warn('AI对话节点没有可用的消息', { context });
        return {
          success: true,
          aiResponse: '',
          model: modelId || 'unknown',
          context: {
            ...context,
            aiResponse: '',
            lastNodeType: 'ai_chat'
          }
        };
      }

      // 调用AI服务
      const result = await aiCoreService.chat({
        messages,
        modelId,
        roleId,
        temperature,
        maxTokens,
        sessionId: context.sessionId || context.metadata?.sessionId,
        operationType: 'ai_chat'
      });

      logger.info('AI对话节点执行成功', {
        model: modelId,
        responseLength: result.content.length,
        usage: result.usage
      });

      return {
        success: true,
        aiResponse: result.content,
        model: modelId || 'ai-core',
        usage: result.usage,
        context: {
          ...context,
          aiResponse: result.content,
          lastNodeType: 'ai_chat'
        }
      };
    } catch (error) {
      logger.error('AI对话节点执行失败', {
        error: error.message,
        node: node.id
      });

      // 返回错误响应，但不中断流程
      return {
        success: false,
        aiResponse: '抱歉，AI服务暂时不可用。',
        error: error.message,
        context: {
          ...context,
          aiResponse: '抱歉，AI服务暂时不可用。',
          lastNodeType: 'ai_chat'
        }
      };
    }
  }

  /**
   * 处理意图识别节点（使用真实AI）
   */
  async handleIntentNode(node, context) {
    logger.info('执行意图识别节点', { node, context });

    const { data } = node;
    const { supportedIntents, modelId, roleId } = data || {};

    // 如果context中已经有intent，直接返回
    if (context.intent) {
      logger.info('意图已存在于context中', { intent: context.intent });
      return {
        success: true,
        intent: context.intent,
        confidence: 100,
        context: {
          ...context,
          lastNodeType: 'intent'
        }
      };
    }

    try {
      // 获取用户消息
      const userMessage = context.message?.spoken || context.userMessage;

      if (!userMessage) {
        logger.warn('意图识别节点没有可用的消息', { context });
        return {
          success: true,
          intent: 'chat',
          confidence: 50,
          context: {
            ...context,
            intent: 'chat',
            lastNodeType: 'intent'
          }
        };
      }

      // 构建意图识别提示词
      const intentList = supportedIntents?.join(', ') || 'service, help, chat, admin, risk, spam';

      const systemPrompt = `你是一个意图识别专家。请分析用户的输入，识别其意图。
可用的意图包括：${intentList}

请只返回JSON格式，包含以下字段：
- intent: 识别出的意图（必须从上述意图列表中选择）
- confidence: 置信度（0-100的整数）
- reason: 识别理由（简短说明）

示例：
用户："我需要帮助"
响应：{"intent": "help", "confidence": 95, "reason": "用户明确表示需要帮助"}`;

      // 调用AI服务
      const result = await aiCoreService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        modelId,
        roleId,
        sessionId: context.sessionId || context.metadata?.sessionId,
        operationType: 'intent_recognition'
      });

      // 解析AI响应
      let detectedIntent = 'chat';
      let confidence = 70;
      let reason = '';

      try {
        // 尝试解析JSON
        const parsed = JSON.parse(result.content);
        detectedIntent = parsed.intent || 'chat';
        confidence = parsed.confidence || 70;
        reason = parsed.reason || '';

        // 验证意图是否在支持的列表中
        if (supportedIntents && supportedIntents.length > 0 && !supportedIntents.includes(detectedIntent)) {
          detectedIntent = supportedIntents[0];
          confidence = 50;
          reason = '识别的意图不在支持的列表中，使用默认意图';
        }
      } catch (parseError) {
        logger.warn('解析意图识别响应失败', { content: result.content, error: parseError.message });
        // 简单的关键词匹配
        const content = result.content.toLowerCase();
        if (content.includes('service') || content.includes('服务')) {
          detectedIntent = 'service';
        } else if (content.includes('help') || content.includes('帮助')) {
          detectedIntent = 'help';
        } else if (content.includes('chat') || content.includes('聊天') || content.includes('闲聊')) {
          detectedIntent = 'chat';
        }
      }

      logger.info('意图识别节点执行成功', {
        detectedIntent,
        confidence,
        reason,
        userMessage: userMessage.substring(0, 50)
      });

      return {
        success: true,
        intent: detectedIntent,
        confidence,
        reason,
        context: {
          ...context,
          intent: detectedIntent,
          lastNodeType: 'intent'
        }
      };
    } catch (error) {
      logger.error('意图识别节点执行失败', {
        error: error.message,
        node: node.id
      });

      // 返回默认意图，避免中断流程
      return {
        success: false,
        intent: 'chat',
        confidence: 50,
        error: error.message,
        context: {
          ...context,
          intent: 'chat',
          lastNodeType: 'intent'
        }
      };
    }
  }

  /**
   * 处理服务节点（Mock）
   */
  async handleServiceNode(node, context) {
    logger.info('执行服务节点', { node, context });

    const { data } = node;
    const { serviceName, parameters } = data || {};

    // Mock服务调用
    const mockResult = {
      serviceName: serviceName || 'mock-service',
      status: 'success',
      data: {
        message: '服务调用成功（Mock）',
        parameters: parameters || {},
        timestamp: new Date().toISOString()
      }
    };

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      serviceResult: mockResult,
      context: {
        ...context,
        lastNodeType: 'service',
        serviceResult: mockResult
      }
    };
  }

  /**
   * 处理人工转接节点（Mock）
   */
  async handleHumanHandoverNode(node, context) {
    logger.info('执行人工转接节点', { node, context });

    const { data } = node;
    const { targetUser, message } = data || {};

    // Mock人工转接
    const handoverResult = {
      targetUser: targetUser || 'admin',
      status: 'transferred',
      message: message || '已转接到人工客服（Mock）',
      timestamp: new Date().toISOString()
    };

    logger.info('人工转接结果', handoverResult);

    return {
      success: true,
      handoverResult,
      context: {
        ...context,
        lastNodeType: 'human_handover',
        handoverResult,
        isHuman: true
      }
    };
  }

  /**
   * 处理通知节点（Mock）
   */
  async handleNotificationNode(node, context) {
    logger.info('执行通知节点', { node, context });

    const { data } = node;
    const { notificationType, recipients, message } = data || {};

    // Mock通知发送
    const notificationResult = {
      type: notificationType || 'robot',
      recipients: recipients || [],
      message: message || '通知消息（Mock）',
      status: 'sent',
      timestamp: new Date().toISOString()
    };

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 50));

    logger.info('通知发送结果', notificationResult);

    return {
      success: true,
      notificationResult,
      context: {
        ...context,
        lastNodeType: 'notification',
        notificationResult
      }
    };
  }

  // ============================================
  // 执行日志查询
  // ============================================

  /**
   * 获取流程执行日志
   */
  async getFlowExecutionLogs(filters = {}) {
    try {
      const conditions = [];

      if (filters.flowInstanceId) {
        conditions.push(eq(flowExecutionLogs.flowInstanceId, filters.flowInstanceId));
      }

      if (filters.flowDefinitionId) {
        conditions.push(eq(flowExecutionLogs.flowDefinitionId, filters.flowDefinitionId));
      }

      if (filters.nodeId) {
        conditions.push(eq(flowExecutionLogs.nodeId, filters.nodeId));
      }

      if (filters.status) {
        conditions.push(eq(flowExecutionLogs.status, filters.status));
      }

      let query = (await this.getDb()).select().from(flowExecutionLogs);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(flowExecutionLogs.startedAt);

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      return await query;
    } catch (error) {
      logger.error('获取流程执行日志失败', { filters, error: error.message });
      throw new Error(`获取流程执行日志失败: ${error.message}`);
    }
  }
}

// ============================================
// 导出
// ============================================

const flowEngine = new FlowEngine();

module.exports = {
  flowEngine,
  NodeType,
  FlowStatus,
  TriggerType
};
