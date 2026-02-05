/**
 * WorkTool AI 2.1 - 流程引擎核心服务
 * 负责流程定义管理、流程实例执行、节点编排
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions, flowInstances, flowExecutionLogs, aiRoles, sessions, promptTemplates, aiIoLogs } = require('../database/schema');
const { eq, and, or, desc, lt, gt, inArray } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');
const AIServiceFactory = require('./ai/AIServiceFactory'); // AI服务工厂

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
  NOTIFICATION: 'notification',
  RISK_HANDLER: 'risk_handler', // 风险处理节点
  MONITOR: 'monitor' // 监控节点
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
      [NodeType.NOTIFICATION]: this.handleNotificationNode.bind(this),
      [NodeType.RISK_HANDLER]: this.handleRiskHandlerNode.bind(this),
      [NodeType.MONITOR]: this.handleMonitorNode.bind(this)
    };

    // 模板缓存
    this.templateCache = new Map();
    this.templateCacheExpire = 5 * 60 * 1000; // 5分钟过期
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
      const db = await this.getDb();
      const result = await db.select()
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
    const { prompt, modelId, roleId, temperature, maxTokens, useRolePrompt, useTemplate, templateId, variables } = data || {};

    try {
      // 1. 获取AI服务实例
      const aiService = await AIServiceFactory.createServiceByModelId(modelId);

      // 2. 构建消息
      const messages = [];
      let systemPrompt = prompt || '';

      // 3. 如果使用模板，从数据库加载
      if (useTemplate && templateId) {
        const template = await this.getTemplateById(templateId);
        if (template) {
          systemPrompt = template.template;

          // 替换模板变量
          systemPrompt = this.replaceTemplateVariables(systemPrompt, {
            userName: context.userName || '用户',
            groupName: context.groupName || '群组',
            robotName: context.robotName || '机器人',
            ...variables
          });

          logger.info('使用话术模板', { templateId, templateName: template.name });
        } else {
          logger.warn('话术模板不存在，使用角色提示词', { templateId });
        }
      }

      // 4. 如果使用角色提示词，从数据库加载
      else if (useRolePrompt && roleId) {
        const role = await this.getRoleById(roleId);
        if (role) {
          systemPrompt = role.system_prompt;
          logger.info('使用角色提示词', { roleId, roleName: role.name });
        } else {
          logger.warn('角色不存在，使用默认提示词', { roleId });
        }
      }

      // 5. 如果有提示词，添加为系统消息
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      // 6. 添加用户消息
      if (context.message?.spoken) {
        messages.push({ role: 'user', content: context.message.spoken });
      } else if (context.userMessage) {
        messages.push({ role: 'user', content: context.userMessage });
      }

      // 7. 如果没有消息，返回空响应
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

      // 8. 调用AI服务生成回复
      const result = await aiService.generateReply(messages, {
        sessionId: context.sessionId,
        messageId: context.messageId,
        operationType: 'ai_chat',
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2000
      });

      logger.info('AI对话节点执行成功', {
        model: modelId,
        responseLength: result.content.length,
        usage: result.usage
      });

      // 9. 记录AI IO日志
      await this.saveAILog(context.sessionId, context.messageId, {
        robotId: context.robotId,
        robotName: context.robotName,
        operationType: 'ai_chat',
        aiInput: JSON.stringify(messages),
        aiOutput: result.content,
        modelId,
        requestDuration: result.usage?.duration || 0,
        status: 'success'
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
    const { supportedIntents, modelId } = data || {};

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
          needReply: false,
          needHuman: false,
          context: {
            ...context,
            intent: 'chat',
            lastNodeType: 'intent'
          }
        };
      }

      // 获取AI服务实例
      const aiService = await AIServiceFactory.createServiceByModelId(modelId);

      // 调用意图识别
      const result = await aiService.recognizeIntent(userMessage, {
        userId: context.userId,
        userName: context.userName,
        groupId: context.groupId,
        groupName: context.groupName,
        sessionId: context.sessionId,
        messageId: context.messageId,
        robotId: context.robotId,
        robotName: context.robotName,
        history: context.history || []
      });

      logger.info('意图识别节点执行成功', {
        intent: result.intent,
        confidence: result.confidence,
        needReply: result.needReply,
        needHuman: result.needHuman,
        userMessage: userMessage.substring(0, 50)
      });

      // 更新上下文
      return {
        success: true,
        intent: result.intent,
        confidence: result.confidence,
        needReply: result.needReply,
        needHuman: result.needHuman,
        reason: result.reason,
        context: {
          ...context,
          intent: result.intent,
          needReply: result.needReply,
          needHuman: result.needHuman,
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
        needReply: false,
        needHuman: false,
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

    try {
      let result;

      // 根据serviceName调用不同的服务
      switch (serviceName) {
        case 'intent_recognition':
          // 意图识别
          const intentService = await AIServiceFactory.createServiceByModelId(parameters.modelId);
          result = await intentService.recognizeIntent(parameters.message, parameters.context || {});
          break;

        case 'service_reply':
          // 服务回复
          const replyService = await AIServiceFactory.createServiceByModelId(parameters.modelId);
          result = await replyService.generateReply(parameters.messages, parameters.options || {});
          break;

        case 'conversion_reply':
          // 转化客服回复
          const conversionService = await AIServiceFactory.createServiceByModelId(parameters.modelId);
          result = await conversionService.generateReply(parameters.messages, parameters.options || {});
          break;

        default:
          throw new Error(`未知的服务: ${serviceName}`);
      }

      logger.info('服务节点执行成功', { serviceName, result });

      return {
        success: true,
        serviceResult: result,
        context: {
          ...context,
          lastNodeType: 'service',
          serviceResult: result
        }
      };
    } catch (error) {
      logger.error('服务节点执行失败', {
        serviceName,
        error: error.message
      });

      return {
        success: false,
        serviceResult: null,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'service',
          serviceError: error.message
        }
      };
    }
  }

  /**
   * 处理人工转接节点（真实实现）
   */
  async handleHumanHandoverNode(node, context) {
    logger.info('执行人工转接节点', { node, context });

    const { data } = node;
    const { targetUser, message, sessionId } = data || {};

    try {
      const db = await this.getDb();

      // 更新会话状态为人工处理
      await db.update(sessions)
        .set({
          status: 'human',
          human_reason: message || '流程引擎转人工',
          human_time: new Date().toISOString(),
          updated_at: new Date()
        })
        .where(eq(sessions.sessionId, sessionId || context.sessionId));

      logger.info('人工转接成功', { sessionId: sessionId || context.sessionId, targetUser });

      return {
        success: true,
        handoverResult: {
          targetUser: targetUser || 'admin',
          status: 'transferred',
          message: message || '已转接到人工客服',
          timestamp: new Date().toISOString()
        },
        context: {
          ...context,
          lastNodeType: 'human_handover',
          handoverResult: {
            targetUser: targetUser || 'admin',
            status: 'transferred'
          },
          isHuman: true
        }
      };
    } catch (error) {
      logger.error('人工转接节点执行失败', {
        error: error.message
      });

      return {
        success: false,
        handoverResult: null,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'human_handover',
          handoverError: error.message
        }
      };
    }
  }

  /**
   * 处理通知节点（真实实现）
   */
  async handleNotificationNode(node, context) {
    logger.info('执行通知节点', { node, context });

    const { data } = node;
    const { notificationType, recipients, message, alertLevel } = data || {};

    try {
      // 如果是告警通知，使用alert-trigger服务
      if (notificationType === 'alert') {
        const alertTriggerService = require('./alert-trigger.service');

        const alertResult = await alertTriggerService.triggerAlert({
          sessionId: context.sessionId,
          intentType: context.intent,
          intent: context.intent,
          userId: context.userId,
          userName: context.userName,
          groupId: context.groupId,
          groupName: context.groupName,
          messageContent: context.message?.spoken || context.userMessage,
          robotId: context.robotId,
          robotName: context.robotName
        });

        logger.info('告警通知执行成功', { alertId: alertResult.id });

        return {
          success: true,
          notificationResult: alertResult,
          context: {
            ...context,
            lastNodeType: 'notification',
            alertResult
          }
        };
      }

      // 如果是机器人通知，使用worktool服务
      else if (notificationType === 'robot') {
        const worktoolService = require('./worktool.service');

        for (const recipient of recipients) {
          await worktoolService.sendTextMessage(context.robotId, recipient, message);
        }

        logger.info('机器人通知执行成功', { recipientCount: recipients.length });

        return {
          success: true,
          notificationResult: {
            type: 'robot',
            recipients,
            message,
            status: 'sent',
            timestamp: new Date().toISOString()
          },
          context: {
            ...context,
            lastNodeType: 'notification',
            notificationResult: {
              type: 'robot',
              status: 'sent'
            }
          }
        };
      }

      // 其他通知类型
      else {
        logger.warn('暂不支持的通知类型', { notificationType });

        return {
          success: false,
          notificationResult: null,
          error: `暂不支持的通知类型: ${notificationType}`,
          context: {
            ...context,
            lastNodeType: 'notification',
            notificationError: `暂不支持的通知类型: ${notificationType}`
          }
        };
      }
    } catch (error) {
      logger.error('通知节点执行失败', {
        error: error.message
      });

      return {
        success: false,
        notificationResult: null,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'notification',
          notificationError: error.message
        }
      };
    }
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

  // ============================================
  // 辅助方法
  // ============================================

  /**
   * 获取角色信息
   */
  async getRoleById(roleId) {
    try {
      const db = await this.getDb();
      const roles = await db.select().from(aiRoles).where(eq(aiRoles.id, roleId)).limit(1);
      return roles[0] || null;
    } catch (error) {
      logger.error('获取角色信息失败', { roleId, error: error.message });
      return null;
    }
  }

  /**
   * 获取话术模板（带缓存）
   */
  async getTemplateById(templateId) {
    try {
      const now = Date.now();

      // 检查缓存
      const cached = this.templateCache.get(templateId);
      if (cached && now - cached.timestamp < this.templateCacheExpire) {
        return cached.data;
      }

      // 从数据库加载
      const db = await this.getDb();
      const templates = await db.select()
        .from(promptTemplates)
        .where(eq(promptTemplates.id, templateId))
        .limit(1);

      const template = templates[0] || null;

      // 缓存
      if (template) {
        this.templateCache.set(templateId, {
          data: template,
          timestamp: now
        });
      }

      return template;
    } catch (error) {
      logger.error('获取话术模板失败', { templateId, error: error.message });
      return null;
    }
  }

  /**
   * 替换模板变量
   */
  replaceTemplateVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * 保存AI IO日志
   */
  async saveAILog(sessionId, messageId, logData) {
    try {
      const db = await this.getDb();
      await db.insert(aiIoLogs).values({
        sessionId,
        messageId,
        robotId: logData.robotId || '',
        robotName: logData.robotName || '',
        operationType: logData.operationType,
        aiInput: logData.aiInput,
        aiOutput: logData.aiOutput,
        modelId: logData.modelId,
        requestDuration: logData.requestDuration,
        status: logData.status,
        errorMessage: logData.errorMessage,
        createdAt: new Date()
      });
      logger.info('AI IO日志保存成功', { sessionId, messageId });
    } catch (error) {
      logger.error('保存AI IO日志失败', { sessionId, messageId, error: error.message });
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 清除模板缓存
   */
  clearTemplateCache(templateId) {
    if (templateId) {
      this.templateCache.delete(templateId);
      logger.info('清除模板缓存', { templateId });
    } else {
      this.templateCache.clear();
      logger.info('清除所有模板缓存');
    }
  }

  /**
   * 获取机器人关联的流程定义
   */
  async getFlowDefinitionByRobotId(robotId) {
    try {
      const db = await this.getDb();
      const { robots } = require('../database/schema');

      // 查询机器人关联的流程定义
      const robotsWithFlow = await db.select({
        flowDefinitionId: robots.flow_definition_id
      })
        .from(robots)
        .where(eq(robots.robotId, robotId))
        .limit(1);

      if (robotsWithFlow.length === 0 || !robotsWithFlow[0].flowDefinitionId) {
        return null;
      }

      // 查询流程定义
      return await this.getFlowDefinition(robotsWithFlow[0].flowDefinitionId);
    } catch (error) {
      logger.error('获取机器人关联的流程定义失败', { robotId, error: error.message });
      return null;
    }
  }

  // ============================================
  // 风险处理节点处理器
  // ============================================

  /**
   * 处理风险处理节点
   */
  async handleRiskHandlerNode(node, context) {
    logger.info('执行风险处理节点', { node, context });

    try {
      const { data } = node;
      const {
        riskMode = 'auto_notify',
        enableStaffDetection = true,
        monitoringDuration = 300,
        modelId,
        personaId
      } = data || {};

      const message = context.message || {};

      // 获取系统配置（如果节点未配置）
      let config = {
        mode: riskMode,
        enableStaffDetection,
        monitoringDuration,
        modelId,
        personaId
      };

      // 如果模型ID未配置，使用系统默认配置
      if (!config.modelId) {
        const systemConfig = await this.getSystemConfig();
        config.modelId = systemConfig?.ai?.serviceReply?.builtinModelId;
        config.personaId = systemConfig?.ai?.serviceReply?.personaId;
      }

      // 根据模式处理
      switch (config.mode) {
        case 'human':
          // 人工接管：直接转人工
          return {
            success: true,
            nextNodeId: node.nextNodes?.human,
            data: {
              type: 'human_takeover',
              reason: 'risk_message',
              priority: 'high'
            }
          };

        case 'auto':
          // 仅AI处理
          return {
            success: true,
            nextNodeId: node.nextNodes?.auto,
            data: {
              type: 'ai_reply',
              modelId: config.modelId,
              personaId: config.personaId
            }
          };

        case 'ignore':
          // 忽略：结束流程
          return {
            success: true,
            nextNodeId: node.nextNodes?.end,
            data: {
              type: 'end'
            }
          };

        case 'auto_notify':
          // AI安抚 + 通知人工
          const { riskHandlerService } = require('./risk');

          const result = await riskHandlerService.handleRiskMessage(
            message,
            context,
            config
          );

          if (result.success) {
            // 启动监控
            if (config.enableStaffDetection) {
              const { riskMonitorService } = require('./risk');
              riskMonitorService.startMonitoring(result.riskId, context, config);
            }

            return {
              success: true,
              nextNodeId: node.nextNodes?.monitor,
              data: {
                type: 'risk_processing',
                riskId: result.riskId,
                aiReply: result.reply,
                status: result.status
              }
            };
          } else {
            throw new Error('风险处理失败');
          }

        default:
          throw new Error(`未知的风险处理模式: ${config.mode}`);
      }
    } catch (error) {
      logger.error('风险处理节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        nextNodeId: node.nextNodes?.error
      };
    }
  }

  // ============================================
  // 监控节点处理器
  // ============================================

  /**
   * 处理监控节点
   */
  async handleMonitorNode(node, context) {
    logger.info('执行监控节点', { node, context });

    try {
      const { data } = node;
      const {
        duration = 300,
        detectStaff = true,
        detectUserSatisfaction = true,
        detectEscalation = true
      } = data || {};

      const { riskMonitorService } = require('./risk');

      // 启动监控（异步，不阻塞）
      const monitoringId = uuidv4();

      // 配置监控任务
      const monitorConfig = {
        riskId: context.riskId,
        sessionId: context.sessionId,
        enabled: detectStaff,
        monitoringDuration: duration,
        detectUserSatisfaction,
        detectEscalation
      };

      riskMonitorService.startMonitoring(
        context.riskId,
        context.sessionId,
        monitorConfig
      );

      logger.info('监控已启动', { monitoringId, riskId: context.riskId });

      // 立即返回，进入挂起状态
      return {
        success: true,
        nextNodeId: node.nextNodes?.pending,
        data: {
          type: 'monitoring',
          monitoringId,
          duration,
          status: 'pending'
        }
      };
    } catch (error) {
      logger.error('监控节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        nextNodeId: node.nextNodes?.error
      };
    }
  }

  /**
   * 获取系统配置
   */
  async getSystemConfig() {
    try {
      const db = await this.getDb();
      const { systemSettings } = require('../database/schema');

      const settings = await db.select().from(systemSettings);
      const config = {};

      for (const setting of settings) {
        try {
          const value = JSON.parse(setting.value);
          // 根据 category 组织配置
          if (!config[setting.category]) {
            config[setting.category] = {};
          }
          config[setting.category][setting.key] = value;
        } catch (e) {
          // 忽略解析错误
        }
      }

      return config;
    } catch (error) {
      logger.error('获取系统配置失败', { error: error.message });
      return null;
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
