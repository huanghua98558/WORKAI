/**
 * WorkTool AI 2.1 - 流程引擎核心服务
 * 负责流程定义管理、流程实例执行、节点编排
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions, flowInstances, flowExecutionLogs, aiRoles, aiModels, sessions, promptTemplates, aiIoLogs } = require('../database/schema');
const { eq, and, or, desc, lt, gt, inArray } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');
const AIServiceFactory = require('./ai/AIServiceFactory'); // AI服务工厂
const { flowSelector, SelectionStrategy } = require('./flow-selector.service'); // 流程选择器
const { collaborationService } = require('./collaboration.service'); // 协同分析服务
const ContextHelper = require('../lib/context-helper'); // Context 工具类
const sessionMessageService = require('./session-message.service'); // 会话消息服务
const unifiedAnalysisService = require('./unified-analysis.service'); // 统一AI分析服务

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
  MONITOR: 'monitor', // 监控节点

  // 新增节点类型
  MESSAGE_RECEIVE: 'message_receive', // 消息接收节点
  SESSION_CREATE: 'session_create', // 创建会话节点
  EMOTION_ANALYZE: 'emotion_analyze', // 情感分析节点
  DECISION: 'decision', // 决策节点
  AI_REPLY: 'ai_reply', // AI回复节点
  MESSAGE_DISPATCH: 'message_dispatch', // 消息分发节点
  SEND_COMMAND: 'send_command', // 发送指令节点
  COMMAND_STATUS: 'command_status', // 指令状态记录节点
  STAFF_INTERVENTION: 'staff_intervention', // 工作人员干预节点
  ALERT_SAVE: 'alert_save', // 告警入库节点
  ALERT_RULE: 'alert_rule', // 告警规则判断节点

  // 额外节点类型
  RISK_DETECT: 'risk_detect', // 风险检测节点
  LOG_SAVE: 'log_save', // 记录日志节点
  ALERT_NOTIFY: 'alert_notify', // 告警通知节点
  ALERT_ESCALATE: 'alert_escalate', // 告警升级节点

  // 协同分析相关节点
  COLLABORATION_ANALYZE: 'collaboration_analyze', // 协同分析节点
  STAFF_MESSAGE: 'staff_message', // 工作人员消息节点
  SMART_ANALYZE: 'smart_analyze', // 智能分析节点（意图+情绪合并）

  // HTTP 和任务相关节点
  HTTP_REQUEST: 'http_request', // HTTP请求节点
  TASK_ASSIGN: 'task_assign', // 任务分配节点

  // 群组协作相关节点
  ROBOT_DISPATCH: 'robot_dispatch', // 机器人分发节点
  MESSAGE_SYNC: 'message_sync', // 消息汇总节点
  DATA_TRANSFORM: 'data_transform', // 数据转换节点

  // 数据和满意度相关节点
  DATA_QUERY: 'data_query', // 数据查询节点
  SATISFACTION_INFER: 'satisfaction_infer', // 满意度推断节点
  VARIABLE_SET: 'variable_set', // 变量设置节点

  // 图片识别相关节点（新增）
  IMAGE_PROCESS: 'image_process', // 图片处理复合节点（检测+下载+识别+分析+决策）
  AI_REPLY_ENHANCED: 'ai_reply_enhanced', // 增强AI回复节点（支持图片上下文）
  
  // 上下文增强器节点
  CONTEXT_ENHANCER: 'context_enhancer', // 上下文增强器节点（提取上下文变量并生成补充提示词）
  
  // 统一AI分析节点
  UNIFIED_ANALYZE: 'unified_analyze' // 统一AI分析节点（使用UnifiedAnalysisService进行上下文准备+意图识别+情感分析）
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
      [NodeType.MONITOR]: this.handleMonitorNode.bind(this),

      // 新增节点处理器
      [NodeType.MESSAGE_RECEIVE]: this.handleMessageReceiveNode.bind(this),
      [NodeType.SESSION_CREATE]: this.handleSessionCreateNode.bind(this),
      [NodeType.EMOTION_ANALYZE]: this.handleEmotionAnalyzeNode.bind(this),
      [NodeType.DECISION]: this.handleDecisionNode.bind(this),
      [NodeType.AI_REPLY]: this.handleAIReplyNode.bind(this),
      [NodeType.MESSAGE_DISPATCH]: this.handleMessageDispatchNode.bind(this),
      [NodeType.SEND_COMMAND]: this.handleSendCommandNode.bind(this),
      // [NodeType.COMMAND_STATUS]: this.handleCommandStatusNode.bind(this), // 暂不实现
      [NodeType.STAFF_INTERVENTION]: this.handleStaffInterventionNode.bind(this),
      [NodeType.ALERT_SAVE]: this.handleAlertSaveNode.bind(this),
      [NodeType.ALERT_RULE]: this.handleAlertRuleNode.bind(this),

      // 新增额外节点处理器
      [NodeType.RISK_DETECT]: this.handleRiskDetectNode.bind(this),
      [NodeType.LOG_SAVE]: this.handleLogSaveNode.bind(this),
      [NodeType.ALERT_NOTIFY]: this.handleAlertNotifyNode.bind(this),
      [NodeType.ALERT_ESCALATE]: this.handleAlertEscalateNode.bind(this),

      // 协同分析相关节点处理器
      [NodeType.COLLABORATION_ANALYZE]: this.handleCollaborationAnalyzeNode.bind(this),
      [NodeType.STAFF_MESSAGE]: this.handleStaffMessageNode.bind(this),
      [NodeType.SMART_ANALYZE]: this.handleSmartAnalyzeNode.bind(this),

      // HTTP 和任务相关节点处理器
      [NodeType.HTTP_REQUEST]: this.handleHttpRequestNode.bind(this),
      [NodeType.TASK_ASSIGN]: this.handleTaskAssignNode.bind(this),

      // 群组协作相关节点处理器
      [NodeType.ROBOT_DISPATCH]: this.handleRobotDispatchNode.bind(this),
      [NodeType.MESSAGE_SYNC]: this.handleMessageSyncNode.bind(this),
      [NodeType.DATA_TRANSFORM]: this.handleDataTransformNode.bind(this),

      // 数据和满意度相关节点处理器
      [NodeType.DATA_QUERY]: this.handleDataQueryNode.bind(this),
      [NodeType.SATISFACTION_INFER]: this.handleSatisfactionInferNode.bind(this),
      [NodeType.VARIABLE_SET]: this.handleVariableSetNode.bind(this),

      // 图片识别相关节点处理器（新增）
      [NodeType.IMAGE_PROCESS]: this.handleImageProcessNode.bind(this),
      [NodeType.AI_REPLY_ENHANCED]: this.handleAIReplyEnhancedNode.bind(this),
      
      // 上下文增强器节点处理器
      [NodeType.CONTEXT_ENHANCER]: this.handleContextEnhancerNode.bind(this),
      
      // 统一AI分析节点处理器
      [NodeType.UNIFIED_ANALYZE]: this.handleUnifiedAnalyzeNode.bind(this)
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
      
      // 加载历史消息（如果有的话）
      let history = [];
      try {
        const sessionId = triggerData.message?.groupName 
          ? `session_${triggerData.message.groupName}` 
          : triggerData.message?.fromName 
            ? `session_${triggerData.message.fromName}` 
            : null;
        
        if (sessionId) {
          const messages = await sessionMessageService.getSessionMessages(sessionId, 10);
          
          // 转换为 AI 期望的格式
          history = messages.map(msg => ({
            role: msg.isFromUser ? 'user' : 'assistant',
            content: msg.content
          }));
          
          logger.info('已加载历史消息', {
            sessionId,
            messageCount: messages.length,
            historyLength: history.length
          });
        }
      } catch (error) {
        logger.warn('加载历史消息失败（不影响流程执行）', {
          error: error.message
        });
      }
      
      const instance = {
        id: instanceId,
        flowDefinitionId,
        flowName: flowDef.name,
        status: FlowStatus.PENDING,
        triggerType: flowDef.triggerType,
        triggerData,
        context: {
          ...flowDef.variables,
          ...triggerData,
          history: history // 添加历史消息
        },
        metadata,
        retryCount: 0
      };

      await (await this.getDb()).insert(flowInstances).values(instance);

      logger.info('流程实例创建成功', { instanceId, flowDefinitionId, historyLength: history.length });
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
  // 流程路由与选择
  // ============================================

  /**
   * 路由流程（根据上下文自动选择合适的流程）
   *
   * @param {Object} context - 路由上下文
   * @param {string} context.robotId - 机器人ID
   * @param {string} context.triggerType - 触发类型
   * @param {Object} context.message - 消息对象（可选）
   * @param {string} context.strategy - 选择策略（可选）
   * @returns {Promise<Array>} 选择的流程定义列表
   */
  async routeFlows(context) {
    logger.info('开始流程路由', {
      robotId: context.robotId,
      triggerType: context.triggerType,
      hasMessage: !!context.message,
      strategy: context.strategy
    });

    try {
      // 使用流程选择器选择流程
      const selectedFlows = await flowSelector.selectFlows(context);

      logger.info('流程路由完成', {
        robotId: context.robotId,
        selectedCount: selectedFlows.length,
        flows: selectedFlows.map(f => ({
          id: f.id,
          name: f.name,
          isDefault: f.isDefault,
          priority: f.priority
        }))
      });

      return selectedFlows;
    } catch (error) {
      logger.error('流程路由失败', {
        error: error.message,
        stack: error.stack,
        context
      });
      throw error;
    }
  }

  /**
   * 执行路由后的流程（批量创建并执行流程实例）
   *
   * @param {Array} flows - 流程定义列表
   * @param {Object} triggerData - 触发数据
   * @param {Object} metadata - 元数据
   * @returns {Promise<Array>} 创建的流程实例列表
   */
  async executeRoutedFlows(flows, triggerData = {}, metadata = {}) {
    logger.info('开始执行路由后的流程', {
      flowCount: flows.length
    });

    const instances = [];

    for (const flowDef of flows) {
      try {
        logger.info('创建流程实例', {
          flowId: flowDef.id,
          flowName: flowDef.name
        });

        const instance = await this.createFlowInstance(
          flowDef.id,
          triggerData,
          metadata
        );

        logger.info('流程实例创建成功，开始异步执行', {
          instanceId: instance.id,
          flowName: flowDef.name
        });

        // 异步执行流程
        this.executeFlow(instance.id).catch(error => {
          logger.error('流程执行失败', {
            instanceId: instance.id,
            flowName: flowDef.name,
            error: error.message,
            stack: error.stack
          });
        });

        instances.push(instance);
      } catch (error) {
        logger.error('创建流程实例失败', {
          flowId: flowDef.id,
          flowName: flowDef.name,
          error: error.message
        });
        // 继续执行其他流程
      }
    }

    logger.info('流程实例批量创建完成', {
      total: flows.length,
      success: instances.length,
      failed: flows.length - instances.length
    });

    return instances;
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

  /**
   * 解析模型 ID
   * 如果输入的是 UUID 格式，直接返回
   * 如果输入的是模型名称，从数据库查找对应的模型 ID
   */
  async resolveModelId(modelIdentifier) {
    if (!modelIdentifier) {
      logger.error('模型标识符为空');
      throw new Error('模型标识符不能为空');
    }

    // 检查是否为 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(modelIdentifier)) {
      logger.info('使用 UUID 格式的模型 ID', { modelId: modelIdentifier });
      return modelIdentifier;
    }

    // 如果不是 UUID，尝试从数据库根据名称查找模型
    try {
      const db = await this.getDb();
      const models = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.name, modelIdentifier))
        .limit(1);

      if (models && models.length > 0) {
        const model = models[0];
        logger.info('通过模型名称找到模型', {
          modelName: modelIdentifier,
          modelId: model.id,
          displayName: model.displayName
        });
        return model.id;
      } else {
        logger.error('未找到模型', { modelName: modelIdentifier });
        throw new Error(`未找到模型: ${modelIdentifier}`);
      }
    } catch (error) {
      logger.error('解析模型 ID 失败', { error: error.message, modelIdentifier });
      throw error;
    }
  }

  // ============================================
  // 节点处理器实现 (Mock版本)
  // ============================================

  /**
   * 处理开始节点
   */
  async handleStartNode(node, context) {
    logger.info('执行开始节点', { node, context });

    try {
      const { data } = node;
      const { config } = data || {};
      const { initialVariables = {} } = config || {};

      // 生成流程执行ID和全局追踪ID
      const flowExecutionId = uuidv4();
      const traceId = uuidv4();

      // 处理初始变量中的动态值
      const processedVariables = {};
      for (const [key, value] of Object.entries(initialVariables)) {
        if (typeof value === 'string') {
          // 处理 {{now}} 占位符
          if (value.includes('{{now}}')) {
            processedVariables[key] = new Date().toISOString();
          }
          // 处理 {{uuid}} 占位符
          else if (value.includes('{{uuid}}')) {
            processedVariables[key] = uuidv4();
          }
          // 处理 {{timestamp}} 占位符
          else if (value.includes('{{timestamp}}')) {
            processedVariables[key] = Date.now().toString();
          }
          else {
            processedVariables[key] = value;
          }
        } else {
          processedVariables[key] = value;
        }
      }

      // 将初始变量和追踪信息注入到context中
      const enhancedContext = {
        ...context,
        ...processedVariables,
        flowExecutionId,
        traceId,
        flowStartTime: processedVariables.flowStartTime || new Date().toISOString(),
        flowVersion: processedVariables.flowVersion || '1.0.0',
        environment: processedVariables.environment || process.env.NODE_ENV || 'development'
      };

      logger.info('流程开始，变量已注入', {
        flowExecutionId,
        traceId,
        flowVersion: enhancedContext.flowVersion,
        environment: enhancedContext.environment,
        variableCount: Object.keys(processedVariables).length
      });

      // 只返回必要信息，避免存储大量数据
      return {
        success: true,
        message: '流程开始',
        flowExecutionId,
        traceId,
        flowVersion: enhancedContext.flowVersion,
        environment: enhancedContext.environment
      };
    } catch (error) {
      logger.error('开始节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'start',
          startError: error.message
        }
      };
    }
  }

  /**
   * 处理结束节点
   */
  async handleEndNode(node, context) {
    logger.info('执行结束节点', { node, context });
    // 只返回必要信息，避免存储大量数据
    return {
      success: true,
      message: '流程结束',
      timestamp: new Date().toISOString()
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
      const robotId = ContextHelper.getRobotId(context, node);
      const robotName = ContextHelper.getRobotName(context, node);
      
      await this.saveAILog(context.sessionId, context.messageId, {
        robotId,
        robotName,
        operationType: 'ai_chat',
        aiInput: JSON.stringify(messages),
        aiOutput: result.content,
        modelId,
        temperature,
        requestDuration: result.usage?.duration || 0,
        status: 'success',
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        totalTokens: result.usage?.totalTokens || 0
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
    const { supportedIntents, modelId, config } = data || {};

    // 检查是否应该跳过直接回复
    const skipDirectReply = config?.skipDirectReply || false;

    // 如果context中已经有intent，直接返回
    if (context.intent) {
      logger.info('意图已存在于context中', { intent: context.intent });
      return {
        success: true,
        intent: context.intent,
        confidence: 100,
        needReply: skipDirectReply ? true : context.needReply, // 如果 skipDirectReply，则强制需要回复
        context: {
          ...context,
          lastNodeType: 'intent'
        }
      };
    }

    try {
      // 获取用户消息
      const userMessage = ContextHelper.getMessageContent(context);

      if (!userMessage) {
        logger.warn('意图识别节点没有可用的消息', { context });
        return {
          success: true,
          intent: 'chat',
          confidence: 50,
          needReply: skipDirectReply ? true : false, // 如果 skipDirectReply，则强制需要回复
          needHuman: false,
          context: {
            ...context,
            intent: 'chat',
            lastNodeType: 'intent'
          }
        };
      }

      // 解析模型 ID
      let resolvedModelId = modelId;
      if (modelId) {
        try {
          resolvedModelId = await this.resolveModelId(modelId);
        } catch (error) {
          logger.error('模型 ID 解析失败', {
            input: modelId,
            error: error.message
          });
          resolvedModelId = '1ddd764b-33f3-44c4-afe7-a4da981cfe0a'; // doubao-pro-32k-general
        }
      } else {
        resolvedModelId = '1ddd764b-33f3-44c4-afe7-a4da981cfe0a'; // doubao-pro-32k-general
      }

      // 获取AI服务实例
      const aiService = await AIServiceFactory.createServiceByModelId(resolvedModelId);

      // 使用 ContextHelper 获取机器人信息
      const robotId = ContextHelper.getRobotId(context, node);
      const robotName = ContextHelper.getRobotName(context, node);

      // 调用意图识别
      const result = await aiService.recognizeIntent(userMessage, {
        userId: ContextHelper.getUserId(context),
        userName: ContextHelper.getUserName(context),
        groupId: ContextHelper.getGroupId(context),
        groupName: ContextHelper.getGroupName(context),
        sessionId: ContextHelper.getSessionId(context),
        messageId: ContextHelper.getMessageId(context),
        robotId,
        robotName,
        history: context.history || []
      });

      // 如果 skipDirectReply 为 true，则强制需要回复，确保消息经过 AI 回复节点
      const needReply = skipDirectReply ? true : result.needReply;

      logger.info('意图识别节点执行成功', {
        intent: result.intent,
        confidence: result.confidence,
        needReply: needReply,
        needHuman: result.needHuman,
        skipDirectReply: skipDirectReply,
        userMessage: userMessage.substring(0, 50)
      });

      // 更新上下文
      return {
        success: true,
        intent: result.intent,
        confidence: result.confidence,
        needReply: needReply,
        needHuman: result.needHuman,
        reason: result.reason,
        context: {
          ...context,
          intent: result.intent,
          needReply: needReply,
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
        needReply: skipDirectReply ? true : false, // 如果 skipDirectReply，则强制需要回复
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
      // 使用 ContextHelper 获取机器人信息
      const robotId = ContextHelper.getRobotId(context, node);
      const robotName = ContextHelper.getRobotName(context, node);

      // 如果是告警通知，使用alert-trigger服务
      if (notificationType === 'alert') {
        const alertTriggerService = require('./alert-trigger.service');

        const alertResult = await alertTriggerService.triggerAlert({
          sessionId: ContextHelper.getSessionId(context),
          intentType: context.intent,
          intent: context.intent,
          userId: ContextHelper.getUserId(context),
          userName: ContextHelper.getUserName(context),
          groupId: ContextHelper.getGroupId(context),
          groupName: ContextHelper.getGroupName(context),
          messageContent: ContextHelper.getMessageContent(context),
          robotId,
          robotName
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
          await worktoolService.sendTextMessage(robotId, recipient, message);
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
      logger.info('准备保存AI IO日志', {
        sessionId,
        messageId,
        robotId: logData.robotId,
        robotName: logData.robotName,
        operationType: logData.operationType,
        modelId: logData.modelId,
        temperature: logData.temperature,
        inputTokens: logData.inputTokens,
        outputTokens: logData.outputTokens,
        totalTokens: logData.totalTokens,
        requestDuration: logData.requestDuration
      });

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
        temperature: logData.temperature || null,
        requestDuration: logData.requestDuration || 0,
        status: logData.status,
        errorMessage: logData.errorMessage,
        inputTokens: logData.inputTokens || 0,
        outputTokens: logData.outputTokens || 0,
        totalTokens: logData.totalTokens || 0,
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

  // ============================================
  // 新增节点处理器实现
  // ============================================

  /**
   * 处理消息接收节点
   */
  async handleMessageReceiveNode(node, context) {
    logger.info('执行消息接收节点', { node, context });

    try {
      const { data } = node;
      const { config } = data || {};
      const {
        messageSource,
        saveToDatabase,
        saveToInfoCenter,
        validateMessage,
        messageDeduplication,
        dedupWindow = 60,  // 默认60秒
        senderIdentification,
        messageSizeLimit = 10240,  // 默认10KB
        rateLimiting,
        rateLimitWindow = 60,
        rateLimitMax = 10
      } = config || {};

      // 记录配置值
      logger.info('消息接收节点配置', {
        messageSource,
        saveToDatabase,
        saveToInfoCenter,
        validateMessage,
        messageDeduplication,
        dedupWindow,
        senderIdentification,
        messageSizeLimit,
        rateLimiting,
        rateLimitWindow,
        rateLimitMax,
        hasMessage: !!context.message,
        hasTriggerData: !!context.triggerData
      });

      // 从context中获取消息数据
      const messageData = context.message || context.triggerData || {};

      // 1. 改进消息格式验证
      if (validateMessage) {
        const content = messageData.content || messageData.spoken;

        if (!content) {
          throw new Error('消息内容不能为空');
        }

        if (typeof content !== 'string') {
          throw new Error('消息内容格式错误，必须是字符串');
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
          throw new Error('消息内容不能为空或纯空白字符');
        }
      }

      // 2. 消息大小限制检查
      const content = messageData.content || messageData.spoken || '';
      if (messageSizeLimit && content && content.length > messageSizeLimit) {
        throw new Error(`消息内容超过大小限制 (${messageSizeLimit} 字符)，当前长度: ${content.length}`);
      }

      // 3. 消息去重（如果启用）
      if (messageDeduplication && content) {
        const db = await this.getDb();
        const { sessionMessages } = require('../database/schema');

        const userId = context.userId || messageData.fromName || messageData.senderId || 'unknown';
        const dedupThreshold = new Date(Date.now() - dedupWindow * 1000);

        const duplicateMessage = await db.select()
          .from(sessionMessages)
          .where(
            and(
              eq(sessionMessages.content, content),
              eq(sessionMessages.userId, userId),
              gt(sessionMessages.timestamp, dedupThreshold)
            )
          )
          .limit(1);

        if (duplicateMessage.length > 0) {
          logger.warn('检测到重复消息，跳过处理', {
            content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            originalMessageId: duplicateMessage[0].id,
            timeDiff: Date.now() - new Date(duplicateMessage[0].timestamp).getTime()
          });

          return {
            success: true,
            isDuplicate: true,
            message: null,
            context: {
              ...context,
              lastNodeType: 'message_receive',
              isDuplicate: true,
              duplicateMessageId: duplicateMessage[0].id
            }
          };
        }
      }

      // 4. 发送者识别（如果启用）
      let senderInfo = {
        type: 'user',
        trustLevel: 'normal',
        tags: []
      };

      if (senderIdentification) {
        senderInfo = this.identifySender(messageData);
        logger.info('发送者识别结果', {
          senderType: senderInfo.type,
          trustLevel: senderInfo.trustLevel,
          tags: senderInfo.tags,
          sender: messageData.fromName
        });
      }

      // 5. 限流保护（如果启用）
      if (rateLimiting) {
        const userId = context.userId || messageData.fromName || messageData.senderId || 'unknown';
        const isRateLimited = await this.checkRateLimit(
          userId,
          rateLimitWindow,
          rateLimitMax
        );

        if (isRateLimited) {
          logger.warn('触发限流保护', {
            userId,
            window: rateLimitWindow,
            max: rateLimitMax
          });
          throw new Error(`发送频率过高，请在 ${rateLimitWindow} 秒后重试`);
        }
      }

      // 6. 保存到数据库
      let savedMessage = null;
      if (saveToDatabase || saveToInfoCenter) {
        // 使用 SessionMessageService 保存用户消息
        try {
          const messageId = messageData.messageId || requestId;
          
          await sessionMessageService.saveUserMessage(
            context.sessionId || `session_${messageData.groupName || messageData.fromName || 'default'}`,
            {
              userId: context.userId || messageData.fromName || messageData.senderId || 'unknown',
              userName: messageData.fromName || context.userId || messageData.senderId || 'unknown',
              groupId: messageData.groupName || null,
              groupName: messageData.groupName || null,
              content: content,
              timestamp: messageData.timestamp || new Date(),
              metadata: {
                ...messageData.metadata,
                senderInfo,
                flowExecutionId: context.flowExecutionId,
                traceId: context.traceId
              }
            },
            messageId,
            context.robot
          );
          
          savedMessage = {
            id: messageId,
            content: content,
            isFromUser: true,
            isFromBot: false,
            isHuman: senderInfo.type === 'staff',
            timestamp: messageData.timestamp || new Date()
          };
          
          logger.info('消息已保存到数据库', {
            messageId,
            userId: context.userId || messageData.fromName,
            sessionId: context.sessionId,
            contentLength: content.length,
            senderType: senderInfo.type
          });
        } catch (saveError) {
          logger.error('保存用户消息失败', {
            error: saveError.message,
            sessionId: context.sessionId
          });
          // 不阻断流程，继续返回结果
        }
      }

      return {
        success: true,
        message: savedMessage || messageData,
        messageId: savedMessage?.id || messageData.id,
        senderInfo,
        context: {
          ...context,
          message: savedMessage || messageData,
          messageId: savedMessage?.id || messageData.id,
          lastNodeType: 'message_receive',
          senderInfo,
          isStaff: senderInfo.type === 'staff',
          isDuplicate: false
        }
      };
    } catch (error) {
      logger.error('消息接收节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'message_receive',
          messageError: error.message
        }
      };
    }
  }

  /**
   * 辅助函数：发送者识别
   */
  identifySender(messageData) {
    const senderInfo = {
      type: 'user',      // user, staff, system, bot
      trustLevel: 'normal',  // low, normal, high
      tags: []
    };

    const companyName = messageData.companyName || '';
    const remark = messageData.remark || '';
    const nickname = messageData.fromName || messageData.senderName || '';
    const specialId = messageData.senderId || '';
    const groupId = messageData.groupName || '';

    // 工作人员识别关键词
    const staffKeywords = [
      'admin', 'manager', 'staff', 'support', 'operator',
      '运维', '管理员', '技术支持', '客服主管', '运营专员', '产品经理'
    ];

    // 特殊企业识别
    const companyNames = ['WorkTool', '扣子', 'Coze', '测试公司', '演示公司'];

    // 1. 识别工作人员
    const isStaff = staffKeywords.some(keyword =>
      nickname.toLowerCase().includes(keyword) ||
      remark.toLowerCase().includes(keyword) ||
      specialId.toLowerCase().includes(keyword)
    );

    if (isStaff) {
      senderInfo.type = 'staff';
      senderInfo.trustLevel = 'high';
      senderInfo.tags.push('staff');
    }

    // 2. 识别特殊企业用户
    const isCompany = companyNames.some(name => companyName.includes(name));

    if (isCompany) {
      senderInfo.trustLevel = 'high';
      senderInfo.tags.push('company_user');
    }

    // 3. 识别系统用户（机器人）
    const botKeywords = ['bot', 'robot', '机器人', '系统'];
    const isBot = botKeywords.some(keyword =>
      nickname.toLowerCase().includes(keyword) ||
      specialId.toLowerCase().includes(keyword)
    );

    if (isBot) {
      senderInfo.type = 'bot';
      senderInfo.tags.push('bot');
    }

    // 4. 根据群组识别
    if (groupId && (groupId.includes('staff') || groupId.includes('admin'))) {
      senderInfo.trustLevel = 'high';
      senderInfo.tags.push('staff_group');
    }

    logger.debug('发送者识别详情', {
      nickname,
      companyName,
      remark,
      specialId,
      result: senderInfo
    });

    return senderInfo;
  }

  /**
   * 辅助函数：限流检查
   */
  async checkRateLimit(userId, windowSeconds, maxRequests) {
    const db = await this.getDb();
    const { sessionMessages } = require('../database/schema');

    const threshold = new Date(Date.now() - windowSeconds * 1000);

    const recentMessages = await db.select()
      .from(sessionMessages)
      .where(
        and(
          eq(sessionMessages.userId, userId),
          eq(sessionMessages.isFromUser, true),
          gt(sessionMessages.timestamp, threshold)
        )
      );

    const isLimited = recentMessages.length >= maxRequests;

    if (isLimited) {
      logger.warn('限流触发', {
        userId,
        windowSeconds,
        maxRequests,
        actualCount: recentMessages.length
      });
    }

    return isLimited;
  }

  /**
   * 处理创建会话节点（优化版）
   * 支持会话复用、超时管理、TTL管理、并发合并
   */
  async handleSessionCreateNode(node, context) {
    logger.info('执行创建会话节点', { node, context });

    try {
      const { data } = node;
      const { config = {} } = data;
      const {
        sessionType = 'chat',
        autoCreate = true,
        sessionTimeout = 1800000,  // 30分钟
        sessionTTL = 86400000,      // 24小时
        mergeConcurrentSessions = false,
        autoAssignStaff = false,
        queueId,
        priority = 'normal'
      } = config;

      const db = await this.getDb();
      const { sessions, users } = require('../database/schema');

      // 获取或创建用户
      let user = null;
      let userId = context.userId || context.message?.fromName || context.senderId;

      if (userId) {
        // 查询用户是否存在
        const usersResult = await db.select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        user = usersResult[0] || null;
      }

      if (!user && context.userName) {
        // 创建新用户
        userId = uuidv4();
        const newUser = {
          id: userId,
          name: context.userName,
          email: context.userEmail,
          phone: context.userPhone,
          role: 'customer',
          createdAt: new Date()
        };
        await db.insert(users).values(newUser);
        user = newUser;
      }

      userId = user?.id || userId;

      // 如果禁用自动创建，尝试获取现有会话
      if (!autoCreate) {
        const existingSession = await this.getExistingSession(userId, sessionTimeout);
        if (existingSession) {
          logger.info('使用现有会话', { sessionId: existingSession.sessionId });
          await this.updateSessionActivity(existingSession.sessionId);

          return {
            success: true,
            session: existingSession,
            sessionId: existingSession.sessionId,
            isExisting: true,
            isNew: false,
            context: {
              ...context,
              session: existingSession,
              sessionId: existingSession.sessionId,
              userId,
              lastNodeType: 'session_create'
            }
          };
        }
      }

      // 处理并发会话合并
      if (mergeConcurrentSessions) {
        const concurrentSession = await this.getConcurrentSession(userId, sessionType);
        if (concurrentSession) {
          logger.info('合并到并发会话', { sessionId: concurrentSession.sessionId });
          await this.updateSessionActivity(concurrentSession.sessionId);

          return {
            success: true,
            session: concurrentSession,
            sessionId: concurrentSession.sessionId,
            isMerged: true,
            isNew: false,
            context: {
              ...context,
              session: concurrentSession,
              sessionId: concurrentSession.sessionId,
              userId,
              lastNodeType: 'session_create'
            }
          };
        }
      }

      // 清理过期的会话
      await this.cleanExpiredSessions(userId, sessionTTL);

      // 创建新会话
      const sessionId = uuidv4();
      const now = new Date();

      const session = {
        sessionId,
        userId,
        staffId: null,
        status: autoAssignStaff ? 'assigned' : 'active',
        sessionType,
        queueId,
        priority,
        source: context.source || 'web',
        metadata: config.metadata || {},
        startedAt: now,
        createdAt: now,
        lastActivityAt: now,
        expiresAt: new Date(now.getTime() + sessionTTL)
      };

      await db.insert(sessions).values(session);

      logger.info('会话创建成功', {
        sessionId,
        userId,
        status: session.status,
        sessionType,
        isExisting: false
      });

      return {
        success: true,
        session,
        sessionId,
        isExisting: false,
        isNew: true,
        context: {
          ...context,
          session,
          sessionId,
          userId,
          lastNodeType: 'session_create'
        }
      };
    } catch (error) {
      logger.error('创建会话节点执行失败', { error: error.message, stack: error.stack });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'session_create',
          sessionError: error.message
        }
      };
    }
  }

  /**
   * 获取现有活跃会话
   */
  async getExistingSession(userId, timeout) {
    const db = await this.getDb();
    const { sessions } = require('../database/schema');

    const timeoutThreshold = new Date(Date.now() - timeout);

    const existingSessions = await db.select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          inArray(sessions.status, ['active', 'assigned']),
          gt(sessions.lastActivityAt, timeoutThreshold),
          gt(sessions.expiresAt, new Date())
        )
      )
      .orderBy(desc(sessions.lastActivityAt))
      .limit(1);

    return existingSessions[0] || null;
  }

  /**
   * 获取并发会话
   */
  async getConcurrentSession(userId, sessionType) {
    const db = await this.getDb();
    const { sessions } = require('../database/schema');

    const activeThreshold = new Date(Date.now() - 300000); // 5分钟内活跃

    const concurrentSessions = await db.select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.sessionType, sessionType),
          inArray(sessions.status, ['active', 'assigned']),
          gt(sessions.lastActivityAt, activeThreshold),
          gt(sessions.expiresAt, new Date())
        )
      )
      .orderBy(desc(sessions.lastActivityAt))
      .limit(1);

    return concurrentSessions[0] || null;
  }

  /**
   * 更新会话活跃时间
   */
  async updateSessionActivity(sessionId) {
    const db = await this.getDb();
    const { sessions } = require('../database/schema');

    await db.update(sessions)
      .set({
        lastActivityAt: new Date()
      })
      .where(eq(sessions.sessionId, sessionId));
  }

  /**
   * 清理过期的会话
   */
  async cleanExpiredSessions(userId, ttl) {
    const db = await this.getDb();
    const { sessions } = require('../database/schema');

    const expiredThreshold = new Date(Date.now() - ttl);

    await db.update(sessions)
      .set({
        status: 'expired',
        lastActivityAt: new Date()
      })
      .where(
        and(
          eq(sessions.userId, userId),
          lt(sessions.expiresAt, new Date()),
          inArray(sessions.status, ['active', 'assigned', 'pending'])
        )
      );
  }

  /**
   * 处理情感分析节点
   */
  async handleEmotionAnalyzeNode(node, context) {
    logger.info('执行情感分析节点', { node, context });

    try {
      const { data } = node;
      const { modelId, emotions = ['positive', 'neutral', 'negative'] } = data || {};

      // 获取消息内容
      const messageContent = context.message?.content ||
                             context.message?.spoken ||
                             context.userMessage;

      if (!messageContent) {
        logger.warn('情感分析节点没有可用的消息内容');
        return {
          success: true,
          emotion: 'neutral',
          confidence: 0.5,
          context: {
            ...context,
            emotion: 'neutral',
            confidence: 0.5,
            lastNodeType: 'emotion_analyze'
          }
        };
      }

      // 获取AI服务实例
      const aiService = await AIServiceFactory.createServiceByModelId(modelId);

      // 构建情感分析提示词
      const prompt = `请分析以下消息的情感倾向，并返回JSON格式结果。

支持的情感类型：${emotions.join(', ')}

消息内容：${messageContent}

请返回以下JSON格式：
{
  "emotion": "情感类型",
  "confidence": 置信度(0-1之间的小数),
  "reasoning": "分析理由",
  "keywords": ["关键词1", "关键词2"]
}`;

      const messages = [
        { role: 'system', content: '你是一个专业的情感分析专家。' },
        { role: 'user', content: prompt }
      ];

      // 调用AI进行情感分析
      const result = await aiService.generateReply(messages, {
        sessionId: context.sessionId,
        operationType: 'emotion_analyze',
        temperature: 0.3,
        maxTokens: 500
      });

      // 解析AI返回的JSON
      let emotionData;
      try {
        emotionData = JSON.parse(result.content);
      } catch (error) {
        // 解析失败，返回默认值
        emotionData = {
          emotion: 'neutral',
          confidence: 0.5,
          reasoning: 'AI响应解析失败',
          keywords: []
        };
      }

      logger.info('情感分析完成', {
        emotion: emotionData.emotion,
        confidence: emotionData.confidence,
        messageLength: messageContent.length
      });

      return {
        success: true,
        emotion: emotionData.emotion,
        confidence: emotionData.confidence,
        reasoning: emotionData.reasoning,
        keywords: emotionData.keywords,
        context: {
          ...context,
          emotion: emotionData.emotion,
          emotionConfidence: emotionData.confidence,
          lastNodeType: 'emotion_analyze'
        }
      };
    } catch (error) {
      logger.error('情感分析节点执行失败', { error: error.message });
      return {
        success: false,
        emotion: 'neutral',
        confidence: 0.5,
        error: error.message,
        context: {
          ...context,
          emotion: 'neutral',
          emotionConfidence: 0.5,
          lastNodeType: 'emotion_analyze',
          emotionError: error.message
        }
      };
    }
  }

  /**
   * 处理决策节点
   */
  async handleDecisionNode(node, context) {
    logger.info('执行决策节点', { node, context });

    try {
      const { data } = node;
      const { conditions, defaultBranch, expression } = data || {};

      // 如果使用表达式模式
      if (expression) {
        const result = this.evaluateExpression(expression, context);

        logger.info('决策节点结果（表达式模式）', {
          expression,
          result,
          contextKeys: Object.keys(context)
        });

        return {
          success: true,
          conditionResult: result ? 'true' : 'false',
          matchedCondition: result ? conditions?.[0] : null,
          context: {
            ...context,
            decisionResult: result,
            lastNodeType: 'decision'
          }
        };
      }

      // 如果使用条件列表模式
      if (conditions && Array.isArray(conditions)) {
        for (const condition of conditions) {
          const isMatch = this.evaluateCondition(condition, context);

          if (isMatch) {
            logger.info('决策节点结果（条件匹配）', {
              conditionId: condition.id,
              conditionName: condition.name,
              contextValues: this.extractContextValues(condition, context)
            });

            return {
              success: true,
              conditionResult: condition.id || condition.name,
              matchedCondition: condition,
              nextNodeId: condition.nextNodeId,
              context: {
                ...context,
                decisionResult: condition.id || condition.name,
                lastNodeType: 'decision'
              }
            };
          }
        }
      }

      // 如果没有匹配的条件，使用默认分支
      logger.info('决策节点结果（默认分支）', { defaultBranch });

      return {
        success: true,
        conditionResult: defaultBranch || 'default',
        matchedCondition: null,
        nextNodeId: defaultBranch,
        context: {
          ...context,
          decisionResult: defaultBranch || 'default',
          lastNodeType: 'decision'
        }
      };
    } catch (error) {
      logger.error('决策节点执行失败', { error: error.message });
      return {
        success: false,
        conditionResult: 'error',
        error: error.message,
        context: {
          ...context,
          decisionResult: 'error',
          lastNodeType: 'decision',
          decisionError: error.message
        }
      };
    }
  }

  /**
   * 评估表达式
   */
  evaluateExpression(expression, context) {
    try {
      // 简单实现：将表达式中的变量替换为context中的值
      let evalExpression = expression;

      for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        evalExpression = evalExpression.replace(regex, JSON.stringify(value));
      }

      // 注意：实际生产环境应使用更安全的表达式求值库
      // 这里仅作为示例
      return eval(evalExpression);
    } catch (error) {
      logger.error('表达式求值失败', { expression, error: error.message });
      return false;
    }
  }

  /**
   * 评估条件
   */
  evaluateCondition(condition, context) {
    const { field, operator, value } = condition;

    const fieldValue = context[field];

    switch (operator) {
      case '==':
        return fieldValue == value;
      case '===':
        return fieldValue === value;
      case '!=':
        return fieldValue != value;
      case '!==':
        return fieldValue !== value;
      case '>':
        return fieldValue > value;
      case '<':
        return fieldValue < value;
      case '>=':
        return fieldValue >= value;
      case '<=':
        return fieldValue <= value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'startsWith':
        return String(fieldValue).startsWith(String(value));
      case 'endsWith':
        return String(fieldValue).endsWith(String(value));
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'regex':
        return new RegExp(value).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * 提取上下文值
   */
  extractContextValues(condition, context) {
    const values = {};

    if (condition.field) {
      values[condition.field] = context[condition.field];
    }

    if (condition.expression) {
      const matches = condition.expression.match(/\{\{(\w+)\}\}/g);
      if (matches) {
        matches.forEach(match => {
          const key = match.replace(/\{\{|\}\}/g, '');
          values[key] = context[key];
        });
      }
    }

    return values;
  }

  /**
   * 处理AI回复节点
   */
  async handleAIReplyNode(node, context) {
    logger.info('执行AI回复节点', { 
      nodeId: node.id,
      nodeType: node.type,
      nodeDataKeys: Object.keys(node.data || {}),
      nodeData: node.data
    });

    try {
      const { data } = node;
      const { config = {} } = data;

      logger.info('AI回复节点配置', {
        nodeId: node.id,
        nodeName: node.data?.name,
        configKeys: Object.keys(config),
        hasModelId: !!config.modelId,
        modelIdValue: config.modelId,
        configFull: config
      });

      const {
        modelId,
        prompt,
        personaId,
        temperature = 0.7,
        maxTokens = 1000,
        useContextHistory = true,
        systemPrompt,
        useHistory = true,
        useContext = true,
        useDocuments = true,
        useTemplate = true,
        responseStyle = 'professional',
        templateMapping = {},
        historyLength = 10,
        enableKBMatch = true,
        kbConfig = {}
      } = config;

      logger.info('AI回复节点解析后的配置', {
        modelId,
        modelIdType: typeof modelId
      });

      // 解析模型 ID（支持 UUID 和模型名称）
      let resolvedModelId = modelId;
      if (modelId) {
        try {
          resolvedModelId = await this.resolveModelId(modelId);
          logger.info('模型 ID 解析成功', {
            input: modelId,
            resolved: resolvedModelId
          });
        } catch (error) {
          logger.error('模型 ID 解析失败', {
            input: modelId,
            error: error.message
          });
          // 使用默认模型
          resolvedModelId = '1ddd764b-33f3-44c4-afe7-a4da981cfe0a'; // doubao-pro-32k-general
          logger.warn('使用默认模型', { modelId: resolvedModelId });
        }
      } else {
        // 如果没有配置 modelId，使用默认模型
        resolvedModelId = '1ddd764b-33f3-44c4-afe7-a4da981cfe0a'; // doubao-pro-32k-general
        logger.warn('未配置模型 ID，使用默认模型', { modelId: resolvedModelId });
      }

      // 协同分析：检查工作人员状态，决定是否应该由AI回复
      try {
        const sessionId = context.sessionId || context.variables?.sessionId;
        if (sessionId) {
          const robotId = ContextHelper.getRobotId(context, node);
          const aiDecision = await collaborationService.shouldAIReply(sessionId, {
            robotId,
            groupName: context.groupName,
            userName: context.userName
          });

          logger.info('协同分析：AI回复决策', {
            sessionId,
            shouldReply: aiDecision.shouldReply,
            reason: aiDecision.reason,
            strategy: aiDecision.strategy,
            staffContext: aiDecision.staffContext
          });

          // 如果不应该AI回复，返回空结果
          if (!aiDecision.shouldReply) {
            logger.info('协同分析：AI暂停回复，等待工作人员处理', {
              sessionId,
              reason: aiDecision.reason
            });

            return {
              success: true,
              aiReply: null,
              skipped: true,
              skipReason: aiDecision.reason,
              strategy: aiDecision.strategy,
              staffContext: aiDecision.staffContext,
              context: {
                ...context,
                aiReply: null,
                lastNodeType: 'ai_reply',
                collaborationDecision: aiDecision
              }
            };
          }
        }
      } catch (error) {
        logger.error('协同分析检查失败（继续执行AI回复）', {
          error: error.message,
          sessionId: context.sessionId
        });
      }

      // 获取AI服务实例
      const aiService = await AIServiceFactory.createServiceByModelId(modelId);

      // 构建消息列表
      const messages = [];

      // 添加系统提示词
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      } else if (personaId) {
        const role = await this.getRoleById(personaId);
        if (role) {
          messages.push({ role: 'system', content: role.system_prompt });
          logger.info('使用角色提示词', { personaId, roleName: role.name });
        }
      } else {
        const defaultSystemPrompt = this.buildDefaultSystemPrompt(responseStyle);
        messages.push({ role: 'system', content: defaultSystemPrompt });
      }

      // 添加知识库匹配结果（如果启用）
      let kbMatchResult = null;
      if (enableKBMatch) {
        kbMatchResult = await this.matchKnowledgeBase(context, kbConfig);
        if (kbMatchResult && kbMatchResult.matches.length > 0) {
          logger.info('知识库匹配成功', {
            matchCount: kbMatchResult.matches.length,
            topMatch: kbMatchResult.matches[0]?.question?.substring(0, 50)
          });

          const kbContext = this.buildKnowledgeBaseContext(kbMatchResult);
          messages[0].content += '\n\n' + kbContext;
        }
      }

      // 添加历史对话
      if (useHistory && context.history && Array.isArray(context.history)) {
        const historyToUse = context.history.slice(-historyLength);
        messages.push(...historyToUse);
      }

      // 添加当前用户消息
      const userMessage = context.message?.content ||
                          context.message?.spoken ||
                          context.userMessage ||
                          prompt;

      if (userMessage) {
        messages.push({ role: 'user', content: userMessage });
      }

      // 调用AI生成回复
      const result = await aiService.generateReply(messages, {
        sessionId: context.sessionId,
        messageId: context.messageId,
        operationType: 'ai_reply',
        temperature,
        maxTokens
      });

      logger.info('AI回复节点执行成功', {
        model: modelId,
        responseLength: result.content.length,
        kbMatch: kbMatchResult?.matches.length > 0,
        usage: result.usage
      });

      // 记录AI IO日志
      logger.info('准备调用saveAILog', {
        contextSessionId: context.sessionId,
        contextMessageId: context.messageId,
        contextRobotId: context.robotId,
        contextRobotName: context.robotName
      });

      const robotId = ContextHelper.getRobotId(context, node);
      const robotName = ContextHelper.getRobotName(context, node);
      
      await this.saveAILog(context.sessionId, context.messageId, {
        robotId,
        robotName,
        operationType: 'ai_reply',
        aiInput: JSON.stringify(messages),
        aiOutput: result.content,
        modelId,
        temperature,
        requestDuration: result.usage?.duration || 0,
        status: 'success',
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        totalTokens: result.usage?.totalTokens || 0
      });

      // 保存 AI 回复到数据库
      try {
        await sessionMessageService.saveBotMessage(
          context.sessionId,
          result.content,
          {
            userId: context.userId || context.message?.fromName,
            userName: context.userName || context.message?.fromName,
            groupId: context.groupId || context.message?.groupName,
            groupName: context.groupName || context.message?.groupName,
          },
          null, // intent（暂时传 null）
          context.robot || { robotId, name: robotName }
        );
        logger.info('AI 回复已保存到数据库', {
          sessionId: context.sessionId,
          contentLength: result.content.length
        });
      } catch (saveError) {
        logger.error('保存 AI 回复失败', {
          error: saveError.message,
          sessionId: context.sessionId
        });
        // 不阻断流程，继续返回结果
      }

      return {
        success: true,
        aiReply: result.content,
        model: modelId,
        usage: result.usage,
        kbMatchResult,
        context: {
          ...context,
          aiReply: result.content,
          kbMatchResult,
          lastNodeType: 'ai_reply'
        }
      };
    } catch (error) {
      logger.error('AI回复节点执行失败', { error: error.message });

      return {
        success: false,
        aiReply: '抱歉，我暂时无法回复您的消息，请稍后再试。',
        error: error.message,
        context: {
          ...context,
          aiReply: '抱歉，我暂时无法回复您的消息，请稍后再试。',
          lastNodeType: 'ai_reply'
        }
      };
    }
  }

  /**
   * 构建默认系统提示词
   */
  buildDefaultSystemPrompt(responseStyle) {
    const stylePrompts = {
      professional: '你是一个专业的智能客服助手。请用专业、礼貌的语言回答用户问题，提供准确、有用的信息。',
      friendly: '你是一个友好的智能客服助手。请用亲切、温暖的语言与用户交流，让用户感受到关怀。',
      concise: '你是一个简洁的智能客服助手。请用简明扼要的语言回答用户问题，避免冗长。',
      detailed: '你是一个详细的智能客服助手。请提供详细、全面的解答，帮助用户深入理解问题。'
    };

    return stylePrompts[responseStyle] || stylePrompts.professional;
  }

  /**
   * 匹配知识库
   */
  async matchKnowledgeBase(context, kbConfig) {
    try {
      const { kbIds = [], similarityThreshold = 0.8, maxResults = 3 } = kbConfig;
      const userMessage = context.message?.content || context.userMessage;

      if (!userMessage || kbIds.length === 0) {
        return null;
      }

      const mockMatches = [];

      logger.info('知识库匹配（模拟）', {
        kbIds,
        userMessage: userMessage.substring(0, 50),
        threshold: similarityThreshold,
        maxResults
      });

      return {
        matches: mockMatches,
        query: userMessage,
        threshold: similarityThreshold
      };
    } catch (error) {
      logger.error('知识库匹配失败', { error: error.message });
      return null;
    }
  }

  /**
   * 构建知识库上下文
   */
  buildKnowledgeBaseContext(kbMatchResult) {
    if (!kbMatchResult || kbMatchResult.matches.length === 0) {
      return '';
    }

    let context = '参考知识库：\n';
    kbMatchResult.matches.forEach((match, index) => {
      context += `${index + 1}. 问题：${match.question}\n`;
      context += `   答案：${match.answer}\n\n`;
    });

    return context;
  }

  /**
   * 处理消息分发节点
   */
  async handleMessageDispatchNode(node, context) {
    logger.info('执行消息分发节点', { node, context });

    try {
      const { data } = node;
      const {
        distributionMode = 'single',
        recipients,
        groupId,
        isBroadcast = false,
        isPrivate = true
      } = data || {};

      // 确定目标接收者
      let targetRecipients = [];

      if (distributionMode === 'single') {
        // 单点发送
        if (recipients && recipients.length > 0) {
          targetRecipients = recipients;
        } else if (context.userId) {
          targetRecipients = [context.userId];
        }
      } else if (distributionMode === 'broadcast') {
        // 群发
        if (groupId) {
          targetRecipients = await this.getGroupMembers(groupId);
        } else if (context.groupId) {
          targetRecipients = await this.getGroupMembers(context.groupId);
        }
      } else if (distributionMode === 'private') {
        // 私发
        if (context.userId) {
          targetRecipients = [context.userId];
        }
      }

      const distributionResult = {
        mode: distributionMode,
        isBroadcast,
        isPrivate,
        recipients: targetRecipients,
        recipientCount: targetRecipients.length,
        timestamp: new Date().toISOString()
      };

      logger.info('消息分发完成', {
        mode: distributionMode,
        recipientCount: targetRecipients.length
      });

      return {
        success: true,
        distribution: distributionResult,
        context: {
          ...context,
          distribution: distributionResult,
          recipients: targetRecipients,
          lastNodeType: 'message_dispatch'
        }
      };
    } catch (error) {
      logger.error('消息分发节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          distributionError: error.message,
          lastNodeType: 'message_dispatch'
        }
      };
    }
  }

  /**
   * 处理发送指令节点
   */
  async handleSendCommandNode(node, context) {
    logger.info('执行发送指令节点', { node, context });

    try {
      const { data } = node;
      const {
        commandType = 'message',
        messageContent,
        recipients,
        robotId,
        saveLog = true
      } = data || {};

      // 获取发送内容
      const content = messageContent || context.aiReply || context.message?.content;

      if (!content) {
        throw new Error('没有可发送的内容');
      }

      // 获取机器人ID（支持多种来源：节点配置、context.robotId、context.robot.robotId）
      const botId = robotId || context.robotId || context.robot?.robotId;

      if (!botId) {
        logger.error('机器人ID获取失败，context结构:', {
          contextKeys: Object.keys(context),
          hasRobot: !!context.robot,
          hasRobotId: !!context.robotId,
          robotInfo: context.robot ? { id: context.robot.id, robotId: context.robot.robotId } : null
        });
        throw new Error('机器人ID不能为空');
      }

      // 获取接收者列表
      let targets = recipients || context.recipients;

      // 如果没有配置接收者，从消息中提取
      if (!targets || targets.length === 0) {
        const roomType = context.message?.roomType;
        
        if (roomType === 1 || roomType === 3) {
          // 群聊（外部群或内部群）：回复到群
          targets = [context.message.groupName];
        } else {
          // 私聊（外部联系人或内部联系人）：回复给发送者
          targets = [context.message.fromName];
        }
      }

      if (!targets || targets.length === 0) {
        throw new Error('接收者列表不能为空');
      }

      // 调用发送服务
      const worktoolService = require('./worktool.service');
      const sendResults = [];

      for (const target of targets) {
        try {
          const result = await worktoolService.sendTextMessage(botId, target, content);
          sendResults.push({
            target,
            success: true,
            result
          });
        } catch (error) {
          sendResults.push({
            target,
            success: false,
            error: error.message
          });
        }
      }

      // 如果需要保存日志
      if (saveLog) {
        await this.saveCommandLog({
          commandType,
          botId,
          targets,
          content,
          results: sendResults,
          sessionId: context.sessionId,
          messageId: context.messageId,
          status: sendResults.every(r => r.success) ? 'success' : 'partial_failure',
          timestamp: new Date()
        });
      }

      // 如果是 AI 回复消息，保存到数据库
      const isAIReply = content === context.aiReply || context.lastNodeType === 'ai_reply';
      if (isAIReply && sendResults.some(r => r.success)) {
        try {
          await sessionMessageService.saveBotMessage(
            context.sessionId,
            content,
            {
              userId: context.userId || context.message?.fromName,
              userName: context.userName || context.message?.fromName,
              groupId: context.groupId || context.message?.groupName,
              groupName: context.groupName || context.message?.groupName,
            },
            null, // intent（暂时传 null）
            context.robot || { robotId: botId }
          );
          logger.info('AI 回复已保存到数据库（通过 send_command 节点）', {
            sessionId: context.sessionId,
            contentLength: content.length
          });
        } catch (saveError) {
          logger.error('保存 AI 回复失败（通过 send_command 节点）', {
            error: saveError.message,
            sessionId: context.sessionId
          });
          // 不阻断流程，继续返回结果
        }
      }

      const commandResult = {
        commandType,
        botId,
        targets,
        content,
        results: sendResults,
        successCount: sendResults.filter(r => r.success).length,
        failCount: sendResults.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      };

      logger.info('指令发送完成', {
        commandType,
        successCount: commandResult.successCount,
        failCount: commandResult.failCount
      });

      return {
        success: true,
        command: commandResult,
        context: {
          ...context,
          command: commandResult,
          lastNodeType: 'send_command'
        }
      };
    } catch (error) {
      logger.error('发送指令节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          commandError: error.message,
          lastNodeType: 'send_command'
        }
      };
    }
  }

  /**
   * 处理工作人员干预节点
   */
  async handleStaffInterventionNode(node, context) {
    logger.info('执行工作人员干预节点', { node, context });

    try {
      const { data } = node;
      const {
        targetStaffId,
        priority = 'normal',
        message = '需要人工介入处理',
        autoAssign = false
      } = data || {};

      const db = await this.getDb();
      const { sessions, users } = require('../database/schema');

      // 查找会话
      const sessionResult = await db.select()
        .from(sessions)
        .where(eq(sessions.sessionId, context.sessionId))
        .limit(1);

      if (sessionResult.length === 0) {
        throw new Error('会话不存在');
      }

      const session = sessionResult[0];

      // 如果需要自动分配工作人员
      let assignedStaffId = targetStaffId;

      if (!assignedStaffId && autoAssign) {
        // 查找可用的工作人员
        const staffResult = await db.select()
          .from(users)
          .where(eq(users.role, 'staff'))
          .limit(1);

        if (staffResult.length > 0) {
          assignedStaffId = staffResult[0].id;
        }
      }

      // 更新会话状态为人工处理
      await db.update(sessions)
        .set({
          status: 'human',
          staffId: assignedStaffId,
          humanReason: message,
          humanTime: new Date().toISOString(),
          updatedAt: new Date()
        })
        .where(eq(sessions.sessionId, context.sessionId));

      logger.info('工作人员干预完成', {
        sessionId: context.sessionId,
        staffId: assignedStaffId,
        priority
      });

      return {
        success: true,
        intervention: {
          targetStaffId: assignedStaffId,
          status: assignedStaffId ? 'assigned' : 'pending',
          priority,
          message,
          timestamp: new Date().toISOString()
        },
        context: {
          ...context,
          isHuman: true,
          staffId: assignedStaffId,
          lastNodeType: 'staff_intervention'
        }
      };
    } catch (error) {
      logger.error('工作人员干预节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          interventionError: error.message,
          lastNodeType: 'staff_intervention'
        }
      };
    }
  }

  /**
   * 处理告警入库节点
   */
  async handleAlertSaveNode(node, context) {
    logger.info('执行告警入库节点', { node, context });

    try {
      const { data } = node;
      const {
        alertType = 'info',
        alertLevel = 'low',
        title,
        description,
        autoResolve = false,
        resolveTimeout = 3600
      } = data || {};

      const db = await this.getDb();
      const { alerts } = require('../database/schema');

      // 如果没有定义alerts表，创建一个临时日志记录
      const alertId = uuidv4();

      const alertData = {
        id: alertId,
        type: alertType,
        level: alertLevel,
        title: title || `${alertType}告警`,
        description: description || context.message?.content || '未提供描述',
        sessionId: context.sessionId,
        userId: context.userId,
        intent: context.intent,
        emotion: context.emotion,
        metadata: {
          ...context,
          source: 'flow_engine'
        },
        status: 'open',
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        await db.insert(alerts).values(alertData);
      } catch (error) {
        // 如果alerts表不存在，记录到日志
        logger.warn('告警表不存在，告警已记录到日志', {
          alertId,
          alertType,
          alertLevel
        });
      }

      logger.info('告警入库成功', {
        alertId,
        alertType,
        alertLevel,
        title: alertData.title
      });

      // 如果需要自动解决
      if (autoResolve) {
        setTimeout(async () => {
          try {
            await db.update(alerts)
              .set({
                status: 'resolved',
                resolvedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(alerts.id, alertId));

            logger.info('告警已自动解决', { alertId });
          } catch (error) {
            logger.error('告警自动解决失败', { alertId, error: error.message });
          }
        }, resolveTimeout * 1000);
      }

      return {
        success: true,
        alert: alertData,
        alertId,
        context: {
          ...context,
          alert: alertData,
          alertId,
          lastNodeType: 'alert_save'
        }
      };
    } catch (error) {
      logger.error('告警入库节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          alertError: error.message,
          lastNodeType: 'alert_save'
        }
      };
    }
  }

  /**
   * 处理告警规则判断节点
   */
  async handleAlertRuleNode(node, context) {
    logger.info('执行告警规则判断节点', { node, context });

    try {
      const { data } = node;
      const {
        rules,
        escalationEnabled = false,
        escalationLevels = []
      } = data || {};

      let matchedRule = null;
      let highestLevel = null;

      // 评估所有规则
      if (rules && Array.isArray(rules)) {
        for (const rule of rules) {
          const isMatch = this.evaluateAlertRule(rule, context);

          if (isMatch) {
            logger.info('告警规则匹配', {
              ruleId: rule.id,
              ruleName: rule.name,
              level: rule.level
            });

            matchedRule = rule;

            // 查找最高等级
            if (!highestLevel || this.compareAlertLevel(rule.level, highestLevel) > 0) {
              highestLevel = rule.level;
            }
          }
        }
      }

      // 如果启用了升级逻辑
      let escalationResult = null;

      if (escalationEnabled && escalationLevels.length > 0) {
        const currentLevelIndex = escalationLevels.indexOf(highestLevel);

        if (currentLevelIndex >= 0) {
          escalationResult = {
            currentLevel: highestLevel,
            nextLevel: escalationLevels[Math.min(currentLevelIndex + 1, escalationLevels.length - 1)],
            canEscalate: currentLevelIndex < escalationLevels.length - 1
          };
        }
      }

      return {
        success: true,
        matchedRule,
        highestLevel,
        shouldAlert: matchedRule !== null,
        escalation: escalationResult,
        context: {
          ...context,
          alertRuleMatched: matchedRule !== null,
          alertLevel: highestLevel,
          escalation: escalationResult,
          lastNodeType: 'alert_rule'
        }
      };
    } catch (error) {
      logger.error('告警规则判断节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          alertRuleError: error.message,
          lastNodeType: 'alert_rule'
        }
      };
    }
  }

  /**
   * 评估告警规则
   */
  evaluateAlertRule(rule, context) {
    const { conditions, matchMode = 'all' } = rule;

    if (!conditions || conditions.length === 0) {
      return false;
    }

    const results = conditions.map(condition => {
      const fieldValue = context[condition.field];

      switch (condition.operator) {
        case '==':
          return fieldValue == condition.value;
        case '===':
          return fieldValue === condition.value;
        case '!=':
          return fieldValue != condition.value;
        case '>':
          return fieldValue > condition.value;
        case '<':
          return fieldValue < condition.value;
        case '>=':
          return fieldValue >= condition.value;
        case '<=':
          return fieldValue <= condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'regex':
          return new RegExp(condition.value).test(String(fieldValue));
        default:
          return false;
      }
    });

    return matchMode === 'all' ? results.every(r => r) : results.some(r => r);
  }

  /**
   * 比较告警等级
   */
  compareAlertLevel(level1, level2) {
    const levels = {
      'info': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'critical': 5
    };

    const l1 = levels[level1] || 0;
    const l2 = levels[level2] || 0;

    return l1 - l2;
  }

  /**
   * 获取群组成员
   */
  async getGroupMembers(groupId) {
    try {
      const db = await this.getDb();
      const { groupMembers } = require('../database/schema');

      const members = await db.select()
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));

      return members.map(m => m.userId);
    } catch (error) {
      logger.error('获取群组成员失败', { groupId, error: error.message });
      return [];
    }
  }

  // ============================================
  // 额外节点处理器实现（风险、日志、告警）
  // ============================================

  /**
   * 处理风险检测节点
   */
  async handleRiskDetectNode(node, context) {
    logger.info('执行风险检测节点', { node, context });

    try {
      const { data } = node;
      const { riskRules } = data || {};

      let maxRiskLevel = 0;
      let matchedRules = [];

      // 评估所有风险规则
      if (riskRules && Array.isArray(riskRules)) {
        for (const rule of riskRules) {
          const isMatch = this.evaluateRiskRule(rule, context);

          if (isMatch) {
            matchedRules.push(rule);
            if (rule.riskLevel > maxRiskLevel) {
              maxRiskLevel = rule.riskLevel;
            }
          }
        }
      }

      logger.info('风险检测完成', {
        maxRiskLevel,
        matchedRulesCount: matchedRules.length,
        rules: matchedRules.map(r => r.ruleName)
      });

      return {
        success: true,
        riskLevel: maxRiskLevel,
        matchedRules,
        context: {
          ...context,
          riskLevel: maxRiskLevel,
          matchedRules,
          lastNodeType: 'risk_detect'
        }
      };
    } catch (error) {
      logger.error('风险检测节点执行失败', { error: error.message });
      return {
        success: false,
        riskLevel: 0,
        matchedRules: [],
        error: error.message,
        context: {
          ...context,
          riskLevel: 0,
          lastNodeType: 'risk_detect',
          riskError: error.message
        }
      };
    }
  }

  /**
   * 评估风险规则
   */
  evaluateRiskRule(rule, context) {
    const { conditions } = rule;

    if (!conditions) {
      return false;
    }

    // 检查所有条件
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'hasSensitiveKeywords') {
        // 检查消息是否包含敏感词
        const messageContent = context.message?.content ||
                               context.message?.spoken ||
                               context.userMessage || '';
        const keywords = value === true ? ['投诉', '骗子', '差评', '退款', '欺诈'] : value;

        if (Array.isArray(keywords)) {
          const hasKeyword = keywords.some(keyword => messageContent.includes(keyword));
          if (value && !hasKeyword) {
            return false;
          }
        }
      } else if (key === 'complaintCount') {
        // 检查投诉次数
        const complaintCount = context.complaintCount || 0;
        if (complaintCount < value) {
          return false;
        }
      } else if (key === 'messageFrequency') {
        // 检查消息频率
        const messageFrequency = context.messageFrequency || 0;
        const comparison = this.parseComparison(value, messageFrequency);
        if (!comparison) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 解析比较表达式
   */
  parseComparison(expression, value) {
    const match = expression.match(/^([<>]=?|==)\s*(\d+(?:\.\d+)?)$/);
    if (!match) {
      return false;
    }

    const operator = match[1];
    const target = parseFloat(match[2]);

    switch (operator) {
      case '>': return value > target;
      case '>=': return value >= target;
      case '<': return value < target;
      case '<=': return value <= target;
      case '==': return value === target;
      default: return false;
    }
  }

  /**
   * 处理记录日志节点
   */
  async handleLogSaveNode(node, context) {
    logger.info('执行记录日志节点', { node, context });

    try {
      const { data } = node;
      const { logLevel = 'info', message } = data || {};

      const logMessage = message || '日志记录';

      // 根据日志级别记录日志
      switch (logLevel.toLowerCase()) {
        case 'error':
          logger.error(logMessage, { context });
          break;
        case 'warn':
          logger.warn(logMessage, { context });
          break;
        case 'info':
          logger.info(logMessage, { context });
          break;
        case 'debug':
          logger.debug(logMessage, { context });
          break;
        default:
          logger.info(logMessage, { context });
      }

      return {
        success: true,
        logLevel,
        message: logMessage,
        timestamp: new Date().toISOString(),
        context: {
          ...context,
          lastNodeType: 'log_save'
        }
      };
    } catch (error) {
      logger.error('记录日志节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'log_save',
          logError: error.message
        }
      };
    }
  }

  /**
   * 处理告警通知节点
   */
  async handleAlertNotifyNode(node, context) {
    logger.info('执行告警通知节点', { node, context });

    try {
      const { data } = node;
      const {
        channels = [],
        recipients = [],
        priority = 'normal',
        message
      } = data || {};

      const notifyResults = [];

      // 根据渠道发送通知
      for (const channel of channels) {
        try {
          switch (channel) {
            case 'email':
              logger.info('发送邮件通知', { recipients, priority });
              notifyResults.push({
                channel: 'email',
                success: true,
                recipients,
                timestamp: new Date().toISOString()
              });
              break;

            case 'sms':
              logger.info('发送短信通知', { recipients, priority });
              notifyResults.push({
                channel: 'sms',
                success: true,
                recipients,
                timestamp: new Date().toISOString()
              });
              break;

            case 'phone':
              logger.info('拨打电话通知', { recipients, priority });
              notifyResults.push({
                channel: 'phone',
                success: true,
                recipients,
                timestamp: new Date().toISOString()
              });
              break;

            case 'websocket':
              logger.info('发送WebSocket通知', { recipients, priority });
              notifyResults.push({
                channel: 'websocket',
                success: true,
                recipients,
                timestamp: new Date().toISOString()
              });
              break;

            default:
              logger.warn('不支持的通知渠道', { channel });
              notifyResults.push({
                channel,
                success: false,
                error: '不支持的通知渠道'
              });
          }
        } catch (error) {
          logger.error(`发送${channel}通知失败`, { error: error.message });
          notifyResults.push({
            channel,
            success: false,
            error: error.message
          });
        }
      }

      logger.info('告警通知完成', {
        totalChannels: channels.length,
        successCount: notifyResults.filter(r => r.success).length,
        failCount: notifyResults.filter(r => !r.success).length
      });

      return {
        success: true,
        notifications: notifyResults,
        message,
        priority,
        context: {
          ...context,
          lastNodeType: 'alert_notify',
          notifications: notifyResults
        }
      };
    } catch (error) {
      logger.error('告警通知节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'alert_notify',
          notifyError: error.message
        }
      };
    }
  }

  /**
   * 处理告警升级节点
   */
  async handleAlertEscalateNode(node, context) {
    logger.info('执行告警升级节点', { node, context });

    try {
      const { data } = node;
      const { escalationRules } = data || {};

      let escalationResult = {
        shouldEscalate: false,
        escalateTo: null,
        reason: null
      };

      // 评估升级规则
      if (escalationRules && Array.isArray(escalationRules)) {
        for (const rule of escalationRules) {
          const isMatch = this.evaluateEscalationRule(rule, context);

          if (isMatch) {
            escalationResult = {
              shouldEscalate: true,
              escalateTo: rule.escalateTo,
              reason: rule.condition
            };

            logger.info('触发告警升级', {
              escalateTo: rule.escalateTo,
              condition: rule.condition
            });

            break;
          }
        }
      }

      return {
        success: true,
        escalation: escalationResult,
        context: {
          ...context,
          escalation: escalationResult,
          lastNodeType: 'alert_escalate'
        }
      };
    } catch (error) {
      logger.error('告警升级节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'alert_escalate',
          escalationError: error.message
        }
      };
    }
  }

  /**
   * 评估升级规则
   */
  evaluateEscalationRule(rule, context) {
    const { condition } = rule;

    if (!condition) {
      return false;
    }

    // 简单的条件评估
    if (condition.includes('repeatCount')) {
      const repeatCount = context.repeatCount || 0;
      const match = condition.match(/repeatCount\s*>=\s*(\d+)/);
      if (match) {
        return repeatCount >= parseInt(match[1], 10);
      }
    }

    return false;
  }

  /**
   * 保存指令日志
   */
  async saveCommandLog(logData) {
    try {
      const db = await this.getDb();
      const { commandLogs } = require('../database/schema');

      await db.insert(commandLogs).values({
        id: uuidv4(),
        ...logData
      });

      logger.info('指令日志保存成功', { sessionId: logData.sessionId });
    } catch (error) {
      logger.error('保存指令日志失败', { sessionId: logData.sessionId, error: error.message });
      // 不抛出异常，避免影响主流程
    }
  }

  // ============================================
  // HTTP 和任务相关节点处理器
  // ============================================

  /**
   * 处理HTTP请求节点
   */
  async handleHttpRequestNode(node, context) {
    logger.info('执行HTTP请求节点', { node, context });

    try {
      const { data } = node;
      const { url, method = 'POST', headers, body } = data || {};

      if (!url) {
        throw new Error('URL不能为空');
      }

      // 模拟HTTP请求（实际应该使用fetch或axios）
      logger.info(`发起${method}请求`, { url });

      const startTime = Date.now();

      // 模拟请求延迟
      await new Promise(resolve => setTimeout(resolve, 100));

      const responseTime = Date.now() - startTime;

      // 模拟成功响应
      const response = {
        status: 200,
        statusText: 'OK',
        data: {
          success: true,
          message: '请求已处理',
          timestamp: new Date().toISOString()
        },
        responseTime
      };

      logger.info('HTTP请求完成', {
        url,
        method,
        status: response.status,
        responseTime
      });

      return {
        success: true,
        response,
        context: {
          ...context,
          lastNodeType: 'http_request',
          httpResponse: response
        }
      };
    } catch (error) {
      logger.error('HTTP请求节点执行失败', { error: error.message });

      return {
        success: false,
        error: error.message,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          error: error.message
        },
        context: {
          ...context,
          lastNodeType: 'http_request',
          httpError: error.message
        }
      };
    }
  }

  /**
   * 处理任务分配节点
   */
  async handleTaskAssignNode(node, context) {
    logger.info('执行任务分配节点', { node, context });

    try {
      const { data } = node;
      const {
        taskName,
        taskType = 'normal',
        assignTo,
        dueTime,
        priority = 'normal'
      } = data || {};

      if (!taskName) {
        throw new Error('任务名称不能为空');
      }

      const taskId = uuidv4();
      const task = {
        id: taskId,
        name: taskName,
        type: taskType,
        assignedTo: assignTo,
        dueTime,
        priority,
        status: 'assigned',
        createdAt: new Date(),
        metadata: {
          ...context,
          source: 'flow_engine'
        }
      };

      // 这里应该将任务保存到数据库，暂时记录日志
      logger.info('任务分配成功', {
        taskId,
        taskName,
        assignTo,
        priority,
        dueTime
      });

      return {
        success: true,
        task,
        taskId,
        context: {
          ...context,
          lastNodeType: 'task_assign',
          assignedTask: task
        }
      };
    } catch (error) {
      logger.error('任务分配节点执行失败', { error: error.message });

      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'task_assign',
          taskError: error.message
        }
      };
    }
  }

  // ============================================
  // 群组协作相关节点处理器
  // ============================================

  /**
   * 处理机器人分发节点
   */
  async handleRobotDispatchNode(node, context) {
    logger.info('执行机器人分发节点', { node, context });

    try {
      const { data } = node;
      const { robotId, priority = 'normal' } = data || {};

      if (!robotId) {
        throw new Error('机器人ID不能为空');
      }

      const dispatchResult = {
        robotId,
        priority,
        dispatchedAt: new Date().toISOString(),
        status: 'assigned'
      };

      logger.info('机器人分发成功', {
        robotId,
        priority
      });

      return {
        success: true,
        dispatch: dispatchResult,
        context: {
          ...context,
          lastNodeType: 'robot_dispatch',
          dispatchResult,
          assignedRobot: robotId
        }
      };
    } catch (error) {
      logger.error('机器人分发节点执行失败', { error: error.message });

      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'robot_dispatch',
          dispatchError: error.message
        }
      };
    }
  }

  /**
   * 处理消息汇总节点
   */
  async handleMessageSyncNode(node, context) {
    logger.info('执行消息汇总节点', { node, context });

    try {
      const { data } = node;
      const { syncChannels = ['all'], deduplicate = true } = data || {};

      // 收集所有渠道的消息
      const allMessages = [];

      // 从context中收集消息
      if (context.message) {
        allMessages.push(context.message);
      }

      if (context.aiReply) {
        allMessages.push({
          type: 'ai',
          content: context.aiReply,
          timestamp: new Date().toISOString()
        });
      }

      if (context.distribution && context.distribution.results) {
        context.distribution.results.forEach(result => {
          allMessages.push({
            type: 'distribution',
            target: result.target,
            content: result.content,
            timestamp: result.timestamp
          });
        });
      }

      // 去重
      let syncedMessages = allMessages;
      if (deduplicate) {
        const seen = new Set();
        syncedMessages = allMessages.filter(msg => {
          const key = msg.content || JSON.stringify(msg);
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      }

      const syncResult = {
        channels: syncChannels,
        deduplicate,
        totalMessages: allMessages.length,
        uniqueMessages: syncedMessages.length,
        messages: syncedMessages,
        syncedAt: new Date().toISOString()
      };

      logger.info('消息汇总完成', {
        totalMessages: syncResult.totalMessages,
        uniqueMessages: syncResult.uniqueMessages
      });

      return {
        success: true,
        sync: syncResult,
        context: {
          ...context,
          lastNodeType: 'message_sync',
          syncResult,
          messages: syncedMessages
        }
      };
    } catch (error) {
      logger.error('消息汇总节点执行失败', { error: error.message });

      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'message_sync',
          syncError: error.message
        }
      };
    }
  }

  /**
   * 处理数据转换节点
   */
  async handleDataTransformNode(node, context) {
    logger.info('执行数据转换节点', { node, context });

    try {
      const { data } = node;
      const { transformRules = [] } = data || {};

      let transformedData = { ...context };

      // 应用转换规则
      for (const rule of transformRules) {
        const { ruleName, field, format } = rule;

        switch (ruleName) {
          case 'remove_duplicates':
            // 去重处理
            if (field && Array.isArray(transformedData[field])) {
              const seen = new Set();
              transformedData[field] = transformedData[field].filter(item => {
                const key = JSON.stringify(item);
                if (seen.has(key)) {
                  return false;
                }
                seen.add(key);
                return true;
              });
            }
            break;

          case 'format_timestamp':
            // 时间格式化
            if (field && transformedData[field]) {
              const date = new Date(transformedData[field]);
              if (format) {
                // 简单格式化
                transformedData[field + '_formatted'] = date.toISOString();
              }
            }
            break;

          case 'extract_fields':
            // 提取字段
            if (rule.fields) {
              const extracted = {};
              rule.fields.forEach(fieldName => {
                extracted[fieldName] = transformedData[fieldName];
              });
              transformedData = { ...transformedData, extracted };
            }
            break;

          case 'merge':
            // 合并数据
            if (rule.source) {
              const sourceData = transformedData[rule.source];
              transformedData = { ...transformedData, ...sourceData };
            }
            break;

          default:
            logger.warn('未知的转换规则', { ruleName });
        }
      }

      const transformResult = {
        rules: transformRules,
        rulesApplied: transformRules.length,
        transformedAt: new Date().toISOString()
      };

      logger.info('数据转换完成', {
        rulesApplied: transformResult.rulesApplied
      });

      return {
        success: true,
        transform: transformResult,
        transformedData,
        context: {
          ...context,
          lastNodeType: 'data_transform',
          transformResult
        }
      };
    } catch (error) {
      logger.error('数据转换节点执行失败', { error: error.message });

      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'data_transform',
          transformError: error.message
        }
      };
    }
  }

  // ============================================
  // 数据和满意度相关节点处理器
  // ============================================

  /**
   * 处理数据查询节点
   */
  async handleDataQueryNode(node, context) {
    logger.info('执行数据查询节点', { node, context });

    try {
      const { data } = node;
      const { queryType, table, filters, fields = '*' } = data || {};

      const db = await this.getDb();
      let queryResult = [];

      // 根据查询类型执行不同的查询
      switch (queryType) {
        case 'select':
          // 简单的SELECT查询
          if (table) {
            const { tables } = require('../database/schema');
            if (tables[table]) {
              const records = await db.select().from(tables[table]);
              queryResult = records;
            } else {
              throw new Error(`表不存在: ${table}`);
            }
          }
          break;

        case 'aggregate':
          // 聚合查询（计数、求和等）
          if (table && filters?.aggregate) {
            const { tables } = require('../database/schema');
            if (tables[table]) {
              const records = await db.select().from(tables[table]);
              queryResult = {
                count: records.length,
                data: records
              };
            }
          }
          break;

        case 'session_stats':
          // 会话统计查询
          if (context.sessionId) {
            const { sessions } = require('../database/schema');
            const { eq } = require('drizzle-orm');
            const records = await db
              .select()
              .from(sessions)
              .where(eq(sessions.sessionId, context.sessionId))
              .limit(1);

            queryResult = records[0] || null;
          }
          break;

        default:
          logger.warn('未知的查询类型', { queryType });
          queryResult = [];
      }

      logger.info('数据查询完成', {
        queryType,
        resultCount: Array.isArray(queryResult) ? queryResult.length : 1
      });

      return {
        success: true,
        query: {
          type: queryType,
          table,
          filters,
          fields
        },
        result: queryResult,
        context: {
          ...context,
          lastNodeType: 'data_query',
          queryResult
        }
      };
    } catch (error) {
      logger.error('数据查询节点执行失败', { error: error.message });

      return {
        success: false,
        error: error.message,
        result: null,
        context: {
          ...context,
          lastNodeType: 'data_query',
          queryError: error.message
        }
      };
    }
  }

  /**
   * 处理满意度推断节点
   */
  async handleSatisfactionInferNode(node, context) {
    logger.info('执行满意度推断节点', { node, context });

    try {
      const { data } = node;
      const { modelId, satisfactionLevels = ['very_low', 'low', 'medium', 'high', 'very_high'] } = data || {};

      // 获取会话数据
      const sessionData = context.queryResult || context.session || {};

      // 提取关键指标
      const metrics = {
        responseTime: context.responseTime || 0,
        messageCount: sessionData.messageCount || 0,
        resolutionTime: context.resolutionTime || 0,
        sentimentScore: context.emotionConfidence || 0.5,
        userRating: sessionData.userRating || 0
      };

      // 简单的满意度计算（实际应该使用AI）
      let satisfaction = 'medium';
      let score = 3;

      if (metrics.userRating > 4) {
        satisfaction = 'very_high';
        score = 5;
      } else if (metrics.userRating >= 4) {
        satisfaction = 'high';
        score = 4;
      } else if (metrics.userRating >= 3) {
        satisfaction = 'medium';
        score = 3;
      } else if (metrics.userRating >= 2) {
        satisfaction = 'low';
        score = 2;
      } else if (metrics.userRating > 0) {
        satisfaction = 'very_low';
        score = 1;
      } else if (metrics.sentimentScore > 0.7) {
        satisfaction = 'high';
        score = 4;
      } else if (metrics.sentimentScore > 0.5) {
        satisfaction = 'medium';
        score = 3;
      } else if (metrics.sentimentScore > 0) {
        satisfaction = 'low';
        score = 2;
      }

      const inferenceResult = {
        satisfaction,
        score,
        metrics,
        levels: satisfactionLevels,
        inferredAt: new Date().toISOString()
      };

      logger.info('满意度推断完成', {
        satisfaction,
        score,
        metrics
      });

      return {
        success: true,
        inference: inferenceResult,
        context: {
          ...context,
          lastNodeType: 'satisfaction_infer',
          satisfaction,
          satisfactionScore: score,
          satisfactionMetrics: metrics
        }
      };
    } catch (error) {
      logger.error('满意度推断节点执行失败', { error: error.message });

      return {
        success: false,
        error: error.message,
        satisfaction: 'unknown',
        score: 0,
        context: {
          ...context,
          lastNodeType: 'satisfaction_infer',
          satisfaction: 'unknown',
          satisfactionError: error.message
        }
      };
    }
  }

  /**
   * 处理变量设置节点
   */
  async handleVariableSetNode(node, context) {
    logger.info('执行变量设置节点', { node, context });

    try {
      const { data } = node;
      const { variables = {} } = data || {};

      // 设置变量到context中
      const updatedContext = { ...context };

      for (const [key, value] of Object.entries(variables)) {
        // 如果值是表达式，先求值
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
          const expression = value.slice(2, -2);
          updatedContext[key] = this.evaluateExpression(expression, context);
        } else {
          updatedContext[key] = value;
        }
      }

      logger.info('变量设置完成', {
        variableCount: Object.keys(variables).length,
        variables: Object.keys(variables)
      });

      return {
        success: true,
        variables,
        setVariables: Object.keys(variables),
        context: {
          ...updatedContext,
          lastNodeType: 'variable_set'
        }
      };
    } catch (error) {
      logger.error('变量设置节点执行失败', { error: error.message });

      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'variable_set',
          variableError: error.message
        }
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

  // ============================================
  // 图片识别相关节点处理器（新增）
  // ============================================

  /**
   * 处理图片处理复合节点（IMAGE_PROCESS）
   * 功能：检测 → 下载 → 识别 → 分析 → 决策（一步完成）
   */
  async handleImageProcessNode(node, context) {
    logger.info('执行图片处理节点', { node, context });

    try {
      const { data } = node;
      const config = data || {};

      // 步骤1：检测图片
      if (config.enableDetection) {
        const hasImage = context.message?.image ? true : false;
        if (!hasImage) {
          logger.info('消息中不包含图片，跳过图片处理', { context });
          return {
            success: true,
            hasImage: false,
            nextNodeId: config.skipNodeId,
            context: {
              ...context,
              hasImage: false,
              lastNodeType: 'image_process'
            }
          };
        }
        context.imageUrl = context.message.image.url;
        logger.info('检测到图片', { imageUrl: context.imageUrl });
      }

      // 步骤2：下载图片
      if (config.enableDownload && context.imageUrl) {
        const downloadResult = await this.downloadImage(context.imageUrl, config);
        context.storageUrl = downloadResult.storageUrl;
        context.localImagePath = downloadResult.localPath;
        logger.info('图片下载成功', { storageUrl: context.storageUrl });
      }

      // 步骤3：识别图片
      if (config.enableRecognition && context.imageUrl) {
        const recognitionResult = await this.recognizeImage(context.imageUrl, config);
        context.ocrText = recognitionResult.ocrText;
        context.gpt4vResult = recognitionResult.gpt4vResult;
        context.scene = recognitionResult.scene;
        context.recognitionMethod = recognitionResult.method;
        logger.info('图片识别成功', {
          scene: context.scene,
          method: context.recognitionMethod
        });
      }

      // 步骤4：分析内容
      if (config.enableAnalysis && context.scene && context.ocrText) {
        const analysisResult = await this.analyzeImageContent(
          context.ocrText,
          context.scene,
          context.imageUrl,
          config
        );
        context.imageAnalysis = analysisResult;
        logger.info('图片内容分析成功', {
          scene: context.scene,
          analysisKeys: Object.keys(analysisResult)
        });
      }

      // 步骤5：场景决策
      if (config.enableScenarioDecision && context.scene) {
        const sceneRouting = {
          video_account: config.videoAccountNodeId,
          account_violation: config.violationNodeId,
          product: config.productNodeId,
          order: config.orderNodeId,
          general: config.generalNodeId
        };

        const nextNodeId = sceneRouting[context.scene] || sceneRouting.general;
        logger.info('场景决策完成', {
          scene: context.scene,
          nextNodeId
        });

        return {
          success: true,
          hasImage: true,
          scene: context.scene,
          nextNodeId,
          context: {
            ...context,
            hasImage: true,
            scene: context.scene,
            lastNodeType: 'image_process'
          }
        };
      }

      // 默认：返回下一个节点ID
      return {
        success: true,
        hasImage: true,
        scene: context.scene,
        nextNodeId: node.nextNodeId,
        context: {
          ...context,
          hasImage: true,
          scene: context.scene,
          lastNodeType: 'image_process'
        }
      };
    } catch (error) {
      logger.error('图片处理节点执行失败', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        hasImage: false,
        context: {
          ...context,
          lastNodeType: 'image_process',
          imageProcessError: error.message
        }
      };
    }
  }

  /**
   * 处理增强AI回复节点（AI_REPLY_ENHANCED）
   * 功能：AI回复 + 支持图片上下文
   */
  async handleAIReplyEnhancedNode(node, context) {
    logger.info('执行增强AI回复节点', { node, context });

    try {
      const { data } = node;
      const {
        modelId,
        prompt,
        personaId,
        temperature = 0.7,
        maxTokens = 1000,
        useContextHistory = true,
        systemPrompt,
        enableImageContext = true,
        fallbackToOriginal = true
      } = data || {};

      // 协同分析：检查工作人员状态，决定是否应该由AI回复
      try {
        const sessionId = context.sessionId || context.variables?.sessionId;
        if (sessionId) {
          const robotId = ContextHelper.getRobotId(context, node);
          const aiDecision = await collaborationService.shouldAIReply(sessionId, {
            robotId,
            groupName: context.groupName,
            userName: context.userName
          });

          logger.info('协同分析：AI回复决策', {
            sessionId,
            shouldReply: aiDecision.shouldReply,
            reason: aiDecision.reason,
            strategy: aiDecision.strategy,
            staffContext: aiDecision.staffContext
          });

          // 如果不应该AI回复，返回空结果
          if (!aiDecision.shouldReply) {
            logger.info('协同分析：AI暂停回复，等待工作人员处理', {
              sessionId,
              reason: aiDecision.reason
            });

            return {
              success: true,
              aiReply: null,
              skipped: true,
              skipReason: aiDecision.reason,
              strategy: aiDecision.strategy,
              staffContext: aiDecision.staffContext,
              context: {
                ...context,
                aiReply: null,
                lastNodeType: 'ai_reply_enhanced',
                collaborationDecision: aiDecision
              }
            };
          }
        }
      } catch (error) {
        logger.error('协同分析检查失败（继续执行AI回复）', {
          error: error.message,
          sessionId: context.sessionId
        });
        // 协同分析失败不影响主流程，继续执行AI回复
      }

      // 获取AI服务实例
      const aiService = await AIServiceFactory.createServiceByModelId(modelId);

      // 构建消息列表
      const messages = [];

      // 添加系统提示词
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      } else if (personaId) {
        // 如果指定了角色，加载角色提示词
        const role = await this.getRoleById(personaId);
        if (role) {
          messages.push({ role: 'system', content: role.system_prompt });
          logger.info('使用角色提示词', { personaId, roleName: role.name });
        }
      }

      // 添加历史对话
      if (useContextHistory && context.history && Array.isArray(context.history)) {
        messages.push(...context.history);
      }

      // 添加当前用户消息
      let userMessage = context.message?.content ||
                       context.message?.spoken ||
                       context.userMessage ||
                       prompt;

      // 如果有图片上下文，构建增强的消息
      if (enableImageContext && context.imageAnalysis && context.scene) {
        const contextPrefix = this.buildImageContextPrefix(
          context.scene,
          context.imageAnalysis
        );

        // 将图片上下文信息添加到用户消息中
        userMessage = `${contextPrefix}\n\n用户问题：${userMessage}`;

        logger.info('使用图片上下文增强AI回复', {
          scene: context.scene,
          contextLength: contextPrefix.length
        });
      }

      if (userMessage) {
        messages.push({ role: 'user', content: userMessage });
      }

      // 调用AI生成回复
      const result = await aiService.generateReply(messages, {
        sessionId: context.sessionId,
        messageId: context.messageId,
        operationType: 'ai_reply_enhanced',
        temperature,
        maxTokens
      });

      logger.info('增强AI回复节点执行成功', {
        model: modelId,
        responseLength: result.content.length,
        usage: result.usage,
        hasImageContext: enableImageContext && !!context.imageAnalysis
      });

      // 记录AI IO日志
      await this.saveAILog(context.sessionId, context.messageId, {
        robotId: context.robotId,
        robotName: context.robotName,
        operationType: 'ai_reply_enhanced',
        aiInput: JSON.stringify(messages),
        aiOutput: result.content,
        modelId,
        temperature,
        requestDuration: result.usage?.duration || 0,
        status: 'success',
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        totalTokens: result.usage?.totalTokens || 0
      });

      return {
        success: true,
        aiReply: result.content,
        model: modelId,
        usage: result.usage,
        context: {
          ...context,
          aiReply: result.content,
          lastNodeType: 'ai_reply_enhanced'
        }
      };
    } catch (error) {
      logger.error('增强AI回复节点执行失败', { error: error.message });

      // 返回默认回复，避免中断流程
      return {
        success: false,
        aiReply: '抱歉，我暂时无法回复您的消息，请稍后再试。',
        error: error.message,
        context: {
          ...context,
          aiReply: '抱歉，我暂时无法回复您的消息，请稍后再试。',
          lastNodeType: 'ai_reply_enhanced'
        }
      };
    }
  }

  /**
   * 下载图片
   */
  async downloadImage(imageUrl, config) {
    logger.info('开始下载图片', { imageUrl });

    try {
      // 这里应该使用实际的HTTP请求下载图片
      // 暂时模拟下载
      const mockDownloadResult = {
        storageUrl: imageUrl, // 暂时使用原始URL
        localPath: `/tmp/images/${Date.now()}.jpg`
      };

      logger.info('图片下载完成', { storageUrl: mockDownloadResult.storageUrl });

      return mockDownloadResult;
    } catch (error) {
      logger.error('图片下载失败', { imageUrl, error: error.message });
      throw new Error(`图片下载失败: ${error.message}`);
    }
  }

  /**
   * 识别图片
   */
  async recognizeImage(imageUrl, config) {
    logger.info('开始识别图片', { imageUrl });

    try {
      // 这里应该调用实际的图片识别服务（GPT-4V + OCR）
      // 暂时模拟识别结果
      const mockResult = {
        ocrText: '模拟OCR识别的文字内容',
        gpt4vResult: {
          scene: 'video_account',
          confidence: 0.95,
          details: {}
        },
        scene: 'video_account',
        method: 'mixed'
      };

      logger.info('图片识别完成', {
        scene: mockResult.scene,
        method: mockResult.method
      });

      return mockResult;
    } catch (error) {
      logger.error('图片识别失败', { imageUrl, error: error.message });
      throw new Error(`图片识别失败: ${error.message}`);
    }
  }

  /**
   * 分析图片内容
   */
  async analyzeImageContent(ocrText, scene, imageUrl, config) {
    logger.info('开始分析图片内容', { scene });

    try {
      // 这里应该根据场景进行内容分析
      // 暂时模拟分析结果
      const mockAnalysis = {};

      switch (scene) {
        case 'video_account':
          mockAnalysis.status = '进行中';
          mockAnalysis.step = '身份认证';
          mockAnalysis.error = null;
          break;
        case 'account_violation':
          mockAnalysis.severity = 'medium';
          mockAnalysis.reason = '违规发布内容';
          mockAnalysis.banDays = 7;
          break;
        case 'product':
          mockAnalysis.productName = 'iPhone 15 Pro';
          mockAnalysis.price = '7999元';
          mockAnalysis.specs = '256GB, 钛金属原色';
          break;
        default:
          mockAnalysis.general = '通用图片内容';
      }

      logger.info('图片内容分析完成', {
        scene,
        analysisKeys: Object.keys(mockAnalysis)
      });

      return mockAnalysis;
    } catch (error) {
      logger.error('图片内容分析失败', { scene, error: error.message });
      throw new Error(`图片内容分析失败: ${error.message}`);
    }
  }

  /**
   * 构建图片上下文前缀
   */
  buildImageContextPrefix(scene, imageAnalysis) {
    const contextMap = {
      video_account: `用户发送了视频号开通截图，识别结果：${JSON.stringify(imageAnalysis)}。`,
      account_violation: `用户发送了账号违规截图，识别结果：${JSON.stringify(imageAnalysis)}。`,
      product: `用户发送了产品截图，识别结果：${JSON.stringify(imageAnalysis)}。`,
      order: `用户发送了订单截图，识别结果：${JSON.stringify(imageAnalysis)}。`,
      payment: `用户发送了支付截图，识别结果：${JSON.stringify(imageAnalysis)}。`
    };

    return contextMap[scene] || `用户发送了图片，识别结果：${JSON.stringify(imageAnalysis)}。`;
  }

  // ============================================
  // 协同分析相关节点处理器
  // ============================================

  /**
   * 处理协同分析节点
   * 识别工作人员、记录工作人员消息、检测工作人员回复
   */
  async handleCollaborationAnalyzeNode(node, context) {
    logger.info('执行协同分析节点', { node, context });

    try {
      const { data } = node;
      const { config } = data || {};
      const {
        enableStaffIdentification = true,
        enableStaffMessageRecording = true,
        enableActivityTracking = true,
        enableStaffReplyDetection = true,
        staffFeatures = {}
      } = config || {};

      const {
        companyNames = [],
        remarkNames = [],
        nicknames = [],
        specialIds = []
      } = staffFeatures;

      const messageData = context.message || {};

      // 1. 工作人员识别
      let senderInfo = {
        type: 'user',
        trustLevel: 'normal',
        tags: []
      };

      if (enableStaffIdentification) {
        const companyName = messageData.companyName || '';
        const remark = messageData.remark || '';
        const nickname = messageData.fromName || messageData.senderName || '';
        const specialId = messageData.senderId || '';

        // 综合识别（使用流程配置的特征）
        const isStaffByConfig = nicknames.some(name =>
          nickname.includes(name)
        ) || remarkNames.some(name =>
          remark.includes(name)
        ) || specialIds.some(id =>
          specialId.includes(id)
        ) || companyNames.some(company =>
          companyName.includes(company)
        );

        if (isStaffByConfig) {
          senderInfo.type = 'staff';
          senderInfo.trustLevel = 'high';
          senderInfo.tags.push('staff');
        }

        logger.info('工作人员识别结果', {
          nickname,
          isStaff: senderInfo.type === 'staff',
          matchType: isStaffByConfig ? 'config' : 'none'
        });
      }

      // 2. 工作人员回复检测（基于上下文）
      let hasStaffReplied = false;
      let staffReplyInfo = null;

      if (enableStaffReplyDetection && context.sessionId) {
        staffReplyInfo = await this.detectStaffReply(context);

        hasStaffReplied = staffReplyInfo.hasReplied;

        if (hasStaffReplied) {
          logger.info('检测到工作人员已回复', {
            sessionId: context.sessionId,
            replyTime: staffReplyInfo.replyTime,
            replyContent: staffReplyInfo.replyContent?.substring(0, 50)
          });
        }
      }

      // 3. 活动跟踪
      if (enableActivityTracking && senderInfo.type === 'staff') {
        await this.trackStaffActivity(context, senderInfo);
      }

      // 4. 工作人员消息记录
      if (enableStaffMessageRecording && senderInfo.type === 'staff') {
        await this.recordStaffMessage(context, senderInfo);
      }

      return {
        success: true,
        senderInfo,
        hasStaffReplied,
        staffReplyInfo,
        context: {
          ...context,
          senderInfo,
          isStaff: senderInfo.type === 'staff',
          hasStaffReplied,
          staffReplyInfo,
          lastNodeType: 'collaboration_analyze'
        }
      };
    } catch (error) {
      logger.error('协同分析节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'collaboration_analyze',
          collaborationError: error.message
        }
      };
    }
  }

  /**
   * 检测工作人员是否已回复（基于上下文）
   */
  async detectStaffReply(context) {
    const { sessionId, message } = context;

    if (!sessionId || !message) {
      return { hasReplied: false };
    }

    try {
      const db = await this.getDb();
      const { sessionMessages } = require('../database/schema');

      // 查询最近的消息记录（最近5分钟）
      const timeThreshold = new Date(Date.now() - 5 * 60 * 1000);

      const recentMessages = await db.select()
        .from(sessionMessages)
        .where(
          and(
            eq(sessionMessages.sessionId, sessionId),
            eq(sessionMessages.isFromBot, false),
            eq(sessionMessages.isHuman, true),
            gt(sessionMessages.timestamp, timeThreshold)
          )
        )
        .orderBy(desc(sessionMessages.timestamp))
        .limit(10);

      // 分析最近的消息，判断是否有工作人员回复
      // 回复特征：
      // 1. 包含关键词：已回复、收到、好的、没问题、稍等、处理中、我会处理
      // 2. 消息来自工作人员
      // 3. 消息时间在当前用户消息之后

      const replyKeywords = ['已回复', '收到', '好的', '没问题', '稍等', '处理中', '我会处理', '正在处理'];

      let staffReply = null;

      for (const msg of recentMessages) {
        const content = msg.content || '';

        // 检查是否包含回复关键词
        const hasReplyKeyword = replyKeywords.some(keyword => content.includes(keyword));

        if (hasReplyKeyword) {
          staffReply = msg;
          break;
        }
      }

      return {
        hasReplied: staffReply !== null,
        replyTime: staffReply?.timestamp,
        replyContent: staffReply?.content,
        replyMessageId: staffReply?.id
      };
    } catch (error) {
      logger.error('工作人员回复检测失败', { error: error.message });
      return { hasReplied: false };
    }
  }

  /**
   * 跟踪工作人员活动
   */
  async trackStaffActivity(context, senderInfo) {
    try {
      // 记录活动日志
      logger.info('工作人员活动跟踪', {
        sessionId: context.sessionId,
        staffName: context.userName,
        activity: 'message_sent',
        timestamp: new Date()
      });

      // 这里可以扩展为保存到专门的活动表
      return { success: true };
    } catch (error) {
      logger.error('活动跟踪失败', { error: error.message });
      return { success: false };
    }
  }

  /**
   * 记录工作人员消息
   */
  async recordStaffMessage(context, senderInfo) {
    try {
      const db = await this.getDb();
      const { sessionMessages } = require('../database/schema');

      // 更新消息记录，标记为工作人员消息
      const messageId = context.messageId;

      if (messageId) {
        await db.update(sessionMessages)
          .set({
            isHuman: true,
            extraData: {
              ...context.message?.extraData,
              senderInfo,
              isStaffMessage: true
            }
          })
          .where(eq(sessionMessages.id, messageId));
      }

      logger.info('工作人员消息已记录', { messageId });
      return { success: true };
    } catch (error) {
      logger.error('工作人员消息记录失败', { error: error.message });
      return { success: false };
    }
  }

  /**
   * 处理工作人员消息节点
   * 处理工作人员消息，记录活动，不触发AI回复
   */
  async handleStaffMessageNode(node, context) {
    logger.info('执行工作人员消息节点', { node, context });

    try {
      const { data } = node;
      const { config } = data || {};
      const {
        enableActivityTracking = true,
        skipAIReply = true,
        enableNotification = true
      } = config || {};

      // 1. 记录活动
      if (enableActivityTracking) {
        await this.trackStaffActivity(context, {
          type: 'staff',
          trustLevel: 'high',
          tags: ['staff', 'message_processed']
        });
      }

      // 2. 发送通知（如果启用）
      if (enableNotification) {
        logger.info('工作人员消息通知', {
          sessionId: context.sessionId,
          staffName: context.userName
        });
        // 这里可以扩展为发送通知给其他工作人员
      }

      // 3. 设置不触发AI回复
      const result = {
        success: true,
        skipAIReply: skipAIReply,
        message: '工作人员消息已处理',
        context: {
          ...context,
          skipAIReply: skipAIReply,
          lastNodeType: 'staff_message',
          staffMessageProcessed: true
        }
      };

      logger.info('工作人员消息处理完成', {
        skipAIReply: result.skipAIReply,
        sessionId: context.sessionId
      });

      return result;
    } catch (error) {
      logger.error('工作人员消息节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'staff_message',
          staffMessageError: error.message
        }
      };
    }
  }

  /**
   * 处理智能分析节点
   * 同时进行意图识别和情绪分析（一次AI调用）
   */
  async handleSmartAnalyzeNode(node, context) {
    logger.info('执行智能分析节点', { node, context });

    try {
      const { data } = node;
      const { config } = data || {};
      const {
        modelId,
        enableIntentRecognition = true,
        enableEmotionAnalysis = true,
        intentConfig = {},
        emotionConfig = {},
        skipDirectReply = false
      } = config || {};

      const messageContent = context.message?.content ||
                             context.message?.spoken ||
                             context.userMessage;

      if (!messageContent) {
        logger.warn('智能分析节点没有可用的消息内容');
        return {
          success: true,
          intent: intentConfig.fallbackIntent || '咨询',
          emotion: 'neutral',
          confidence: 0.5,
          context: {
            ...context,
            intent: intentConfig.fallbackIntent || '咨询',
            emotion: 'neutral',
            confidence: 0.5,
            needReply: true,
            lastNodeType: 'smart_analyze'
          }
        };
      }

      // 获取AI服务实例
      const aiService = await AIServiceFactory.createServiceByModelId(modelId);

      // 构建智能分析提示词（同时识别意图和情绪）
      const prompt = this.buildSmartAnalyzePrompt(
        messageContent,
        enableIntentRecognition,
        enableEmotionAnalysis,
        intentConfig,
        emotionConfig
      );

      // 调用AI进行智能分析
      const aiResponse = await aiService.chat({
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: messageContent
          }
        ],
        temperature: 0.3,
        maxTokens: 500
      });

      // 解析AI响应
      const analysisResult = this.parseSmartAnalyzeResponse(aiResponse.content);

      logger.info('智能分析完成', {
        intent: analysisResult.intent,
        emotion: analysisResult.emotion,
        confidence: analysisResult.confidence,
        reasoning: analysisResult.reasoning
      });

      // 根据 skipDirectReply 配置决定是否需要回复
      const needReply = skipDirectReply ? true :
                        analysisResult.intent !== '其他' &&
                        analysisResult.confidence > 0.5;

      return {
        success: true,
        intent: analysisResult.intent,
        emotion: analysisResult.emotion,
        confidence: analysisResult.confidence,
        reasoning: analysisResult.reasoning,
        keywords: analysisResult.keywords,
        needReply,
        context: {
          ...context,
          intent: analysisResult.intent,
          emotion: analysisResult.emotion,
          confidence: analysisResult.confidence,
          reasoning: analysisResult.reasoning,
          keywords: analysisResult.keywords,
          needReply,
          lastNodeType: 'smart_analyze'
        }
      };
    } catch (error) {
      logger.error('智能分析节点执行失败', { error: error.message });
      return {
        success: false,
        error: error.message,
        intent: '咨询',
        emotion: 'neutral',
        needReply: true,
        context: {
          ...context,
          intent: '咨询',
          emotion: 'neutral',
          needReply: true,
          lastNodeType: 'smart_analyze',
          analyzeError: error.message
        }
      };
    }
  }

  /**
   * 构建智能分析提示词
   */
  buildSmartAnalyzePrompt(messageContent, enableIntent, enableEmotion, intentConfig, emotionConfig) {
    let prompt = '你是一个智能客服分析助手。请分析用户的消息，返回JSON格式结果。\n\n';

    if (enableIntent) {
      const intents = intentConfig.supportedIntents || ['咨询', '投诉', '售后', '互动', '购买', '预约', '查询', '其他'];
      prompt += `支持的意图类型：${intents.join('、')}\n`;
      prompt += `置信度阈值：${intentConfig.confidenceThreshold || 0.7}\n`;
      prompt += `默认意图：${intentConfig.fallbackIntent || '咨询'}\n\n`;
    }

    if (enableEmotion) {
      const emotions = emotionConfig.emotionTypes || ['positive', 'neutral', 'negative', 'angry', 'sad', 'happy'];
      prompt += `支持的情绪类型：${emotions.join('、')}\n`;
      prompt += `情绪阈值：${emotionConfig.emotionThreshold || 0.6}\n\n`;
    }

    prompt += `请返回以下JSON格式：\n`;
    prompt += `{\n`;
    if (enableIntent) {
      prompt += `  "intent": "意图类型",\n`;
      prompt += `  "intentConfidence": 意图置信度,\n`;
    }
    if (enableEmotion) {
      prompt += `  "emotion": "情绪类型",\n`;
      prompt += `  "emotionConfidence": 情绪置信度,\n`;
    }
    prompt += `  "reasoning": "分析理由",\n`;
    prompt += `  "keywords": ["关键词1", "关键词2"]\n`;
    prompt += `}\n\n`;
    prompt += `消息内容：${messageContent}`;

    return prompt;
  }

  /**
   * 解析智能分析响应
   */
  parseSmartAnalyzeResponse(response) {
    try {
      // 提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中未找到JSON格式');
      }

      const result = JSON.parse(jsonMatch[0]);

      // 综合置信度（取意图和情绪的平均值）
      const confidence = result.intentConfidence && result.emotionConfidence
        ? (result.intentConfidence + result.emotionConfidence) / 2
        : (result.intentConfidence || result.emotionConfidence || 0.5);

      return {
        intent: result.intent || '咨询',
        emotion: result.emotion || 'neutral',
        confidence,
        reasoning: result.reasoning || '',
        keywords: result.keywords || []
      };
    } catch (error) {
      logger.error('解析智能分析响应失败', { error: error.message, response });
      return {
        intent: '咨询',
        emotion: 'neutral',
        confidence: 0.5,
        reasoning: '解析失败，使用默认值',
        keywords: []
      };
    }
  }

  /**
   * 处理上下文增强器节点
   * 功能：提取流程上下文变量并生成补充提示词，写入流程上下文供AI节点使用
   */
  async handleContextEnhancerNode(node, context) {
    logger.info('执行上下文增强器节点', { node, context });
    try {
      const { data } = node;
      const { config } = data || {};
      
      const {
        modelId,
        contextVariables = [],
        outputVariable = 'contextEnhancement',
        customPrompt = '',
        promptTemplate = '',
        includeAllContext = false
      } = config || {};
      
      // 1. 提取上下文变量
      const extractedContext = {};
      
      if (includeAllContext) {
        // 包含所有上下文变量
        Object.assign(extractedContext, context);
      } else {
        // 只提取指定的变量
        for (const varConfig of contextVariables) {
          const { name, source, defaultValue, format } = varConfig;
          let value;
          
          if (source && typeof source === 'string') {
            // 从源路径获取值（支持嵌套属性，如 user.name）
            value = this.getNestedValue(context, source);
          } else if (name) {
            // 从上下文中直接获取
            value = context[name];
          }
          
          // 应用格式化
          if (format && value !== undefined) {
            value = this.formatContextValue(value, format);
          }
          
          // 使用默认值
          if (value === undefined && defaultValue !== undefined) {
            value = defaultValue;
          }
          
          if (value !== undefined) {
            extractedContext[name] = value;
          }
        }
      }
      
      logger.info('提取的上下文变量', {
        variableCount: Object.keys(extractedContext).length,
        variables: Object.keys(extractedContext)
      });
      
      // 2. 生成补充提示词
      let enhancedPrompt = '';
      
      if (customPrompt) {
        // 使用自定义提示词
        enhancedPrompt = this.renderTemplate(customPrompt, extractedContext);
      } else if (promptTemplate) {
        // 使用提示词模板
        enhancedPrompt = this.renderTemplate(promptTemplate, extractedContext);
      } else {
        // 自动生成提示词
        enhancedPrompt = this.generateContextPrompt(extractedContext, config);
      }
      
      logger.info('生成的上下文增强提示词', {
        promptLength: enhancedPrompt.length,
        preview: enhancedPrompt.substring(0, 100)
      });
      
      // 3. 使用AI优化提示词（如果指定了模型）
      let optimizedPrompt = enhancedPrompt;
      if (modelId && config.useAIForOptimization) {
        try {
          const aiService = await AIServiceFactory.createServiceByModelId(modelId);
          const optimizationResult = await aiService.chat({
            messages: [
              {
                role: 'system',
                content: '你是一个专业的提示词优化助手。请优化用户提供的上下文提示词，使其更加清晰、简洁、易于AI理解。返回优化后的提示词。'
              },
              {
                role: 'user',
                content: `请优化以下上下文提示词：\n\n${enhancedPrompt}`
              }
            ],
            temperature: 0.3,
            maxTokens: 500
          });
          
          optimizedPrompt = optimizationResult.content;
          logger.info('提示词优化完成', {
            originalLength: enhancedPrompt.length,
            optimizedLength: optimizedPrompt.length
          });
        } catch (error) {
          logger.warn('提示词优化失败，使用原始提示词', { error: error.message });
          optimizedPrompt = enhancedPrompt;
        }
      }
      
      // 4. 写入流程上下文
      const updatedContext = {
        ...context,
        [outputVariable]: optimizedPrompt,
        [`${outputVariable}_raw`]: enhancedPrompt,
        [`${outputVariable}_variables`]: extractedContext,
        lastNodeType: 'context_enhancer'
      };
      
      logger.info('上下文增强器节点执行成功', {
        outputVariable,
        promptLength: optimizedPrompt.length,
        variableCount: Object.keys(extractedContext).length
      });
      
      return {
        success: true,
        enhancedPrompt: optimizedPrompt,
        extractedContext,
        outputVariable,
        context: updatedContext
      };
      
    } catch (error) {
      logger.error('上下文增强器节点执行失败', { error: error.message });
      
      // 返回错误但不中断流程
      return {
        success: false,
        enhancedPrompt: '',
        extractedContext: {},
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'context_enhancer',
          contextEnhancerError: error.message
        }
      };
    }
  }
  
  /**
   * 从嵌套对象中获取值
   * @param {Object} obj - 源对象
   * @param {string} path - 属性路径（如 'user.name' 或 'message.content'）
   * @returns {*} - 获取到的值
   */
  getNestedValue(obj, path) {
    if (!path || typeof path !== 'string') {
      return undefined;
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
  
  /**
   * 格式化上下文值
   * @param {*} value - 原始值
   * @param {string} format - 格式化类型
   * @returns {*} - 格式化后的值
   */
  formatContextValue(value, format) {
    switch (format) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'json':
        return JSON.stringify(value);
      case 'date':
        if (value instanceof Date) {
          return value.toISOString();
        }
        return new Date(value).toISOString();
      case 'datetime':
        if (value instanceof Date) {
          return value.toLocaleString();
        }
        return new Date(value).toLocaleString();
      case 'truncate':
        if (typeof value === 'string' && value.length > 100) {
          return value.substring(0, 100) + '...';
        }
        return String(value);
      default:
        return value;
    }
  }
  
  /**
   * 渲染模板字符串
   * @param {string} template - 模板字符串，支持 {{variable}} 语法
   * @param {Object} context - 上下文对象
   * @returns {string} - 渲染后的字符串
   */
  renderTemplate(template, context) {
    if (!template || typeof template !== 'string') {
      return '';
    }
    
    // 替换 {{variable}} 占位符
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = context[key];
      return value !== undefined ? String(value) : match;
    });
  }
  
  /**
   * 自动生成上下文提示词
   * @param {Object} extractedContext - 提取的上下文
   * @param {Object} config - 配置对象
   * @returns {string} - 生成的提示词
   */
  generateContextPrompt(extractedContext, config) {
    const sections = [];
    
    // 1. 用户信息
    if (extractedContext.userName || extractedContext.userId) {
      sections.push(`用户信息：${extractedContext.userName || extractedContext.userId}`);
    }
    
    // 2. 意图信息
    if (extractedContext.intent) {
      sections.push(`用户意图：${extractedContext.intent}`);
      if (extractedContext.confidence) {
        sections.push(`置信度：${(extractedContext.confidence * 100).toFixed(1)}%`);
      }
    }
    
    // 3. 情绪信息
    if (extractedContext.emotion) {
      const emotionMap = {
        positive: '积极',
        neutral: '中性',
        negative: '消极',
        angry: '愤怒',
        sad: '悲伤',
        happy: '开心'
      };
      const emotionText = emotionMap[extractedContext.emotion] || extractedContext.emotion;
      sections.push(`用户情绪：${emotionText}`);
      if (extractedContext.emotionConfidence) {
        sections.push(`情绪置信度：${(extractedContext.emotionConfidence * 100).toFixed(1)}%`);
      }
    }
    
    // 4. 会话信息
    if (extractedContext.sessionId) {
      sections.push(`会话ID：${extractedContext.sessionId}`);
    }
    if (extractedContext.history && Array.isArray(extractedContext.history)) {
      sections.push(`历史对话轮数：${extractedContext.history.length}`);
    }
    
    // 5. 时间信息
    if (extractedContext.timestamp || extractedContext.lastActivityAt) {
      const timestamp = extractedContext.timestamp || extractedContext.lastActivityAt;
      const date = new Date(timestamp);
      sections.push(`时间：${date.toLocaleString()}`);
    }
    
    // 6. 优先级信息
    if (extractedContext.priority) {
      sections.push(`优先级：${extractedContext.priority}`);
    }
    
    // 7. 消息内容
    if (extractedContext.message?.content || extractedContext.userMessage) {
      const message = extractedContext.message?.content || extractedContext.userMessage;
      sections.push(`用户消息：${message}`);
    }
    
    // 8. 其他自定义字段
    const reservedKeys = [
      'userName', 'userId', 'intent', 'confidence', 'emotion', 'emotionConfidence',
      'sessionId', 'history', 'timestamp', 'lastActivityAt', 'priority', 'message',
      'userMessage', 'robotId', 'robotName', 'groupId', 'groupName', 'source'
    ];
    
    const customFields = Object.keys(extractedContext).filter(
      key => !reservedKeys.includes(key)
    );
    
    if (customFields.length > 0) {
      sections.push('其他信息：');
      customFields.forEach(key => {
        sections.push(`  - ${key}：${JSON.stringify(extractedContext[key])}`);
      });
    }
    
    // 组合成最终提示词
    let prompt = '';
    
    if (config.promptPrefix) {
      prompt += config.promptPrefix + '\n\n';
    }
    
    if (sections.length > 0) {
      prompt += sections.join('\n');
    } else {
      prompt += '未提取到上下文信息';
    }
    
    if (config.promptSuffix) {
      prompt += '\n\n' + config.promptSuffix;
    }
    
    return prompt;
  }

  /**
   * 处理统一AI分析节点
   * 使用UnifiedAnalysisService进行上下文准备+意图识别+情感分析
   */
  async handleUnifiedAnalyzeNode(node, context) {
    logger.info('执行统一AI分析节点', { node, context });

    try {
      const { data } = node;
      const { config } = data || {};
      
      const {
        enableContext = true,
        enableIntent = true,
        enableSentiment = true,
        sessionId,
        message,
        robot
      } = config || {};

      // 从上下文中获取必要的参数
      const actualSessionId = sessionId || context.sessionId;
      const actualMessage = message || context.message;
      const actualRobot = robot || context.robot;

      // 验证必需参数
      if (!actualSessionId) {
        logger.warn('统一AI分析节点缺少sessionId');
        return {
          success: false,
          error: '缺少sessionId参数',
          context: {
            ...context,
            lastNodeType: 'unified_analyze',
            analyzeError: '缺少sessionId参数'
          }
        };
      }

      if (!actualMessage) {
        logger.warn('统一AI分析节点缺少message');
        return {
          success: false,
          error: '缺少message参数',
          context: {
            ...context,
            lastNodeType: 'unified_analyze',
            analyzeError: '缺少message参数'
          }
        };
      }

      if (!actualRobot) {
        logger.warn('统一AI分析节点缺少robot');
        return {
          success: false,
          error: '缺少robot参数',
          context: {
            ...context,
            lastNodeType: 'unified_analyze',
            analyzeError: '缺少robot参数'
          }
        };
      }

      // 调用UnifiedAnalysisService进行统一分析
      const analysisResult = await unifiedAnalysisService.analyze(
        actualSessionId,
        actualMessage,
        actualRobot,
        {
          enableContext,
          enableIntent,
          enableSentiment
        }
      );

      logger.info('统一AI分析完成', {
        sessionId: actualSessionId,
        intent: analysisResult.intent?.intent,
        sentiment: analysisResult.sentiment?.sentiment,
        hasActionSuggestions: analysisResult.action_suggestions.length > 0,
        shouldTriggerAlert: analysisResult.alert_trigger.should_trigger
      });

      // 将分析结果写入上下文
      const updatedContext = {
        ...context,
        // 上下文数据
        context_data: analysisResult.context,
        
        // 用户画像摘要
        user_profile: analysisResult.user_profile_summary,
        
        // 意图识别结果
        intent: analysisResult.intent?.intent,
        intent_confidence: analysisResult.intent?.confidence,
        intent_reasoning: analysisResult.intent?.reasoning,
        
        // 情感分析结果
        sentiment: analysisResult.sentiment?.sentiment,
        sentiment_confidence: analysisResult.sentiment?.confidence,
        emotional_intensity: analysisResult.sentiment?.emotional_intensity,
        key_emotions: analysisResult.sentiment?.key_emotions,
        
        // 行动建议
        action_suggestions: analysisResult.action_suggestions,
        
        // 告警触发判断
        alert_trigger: analysisResult.alert_trigger,
        
        // 原始分析结果
        analysis_result: analysisResult,
        
        // 标记节点类型
        lastNodeType: 'unified_analyze'
      };

      return {
        success: true,
        analysisResult,
        context: updatedContext
      };

    } catch (error) {
      logger.error('统一AI分析节点执行失败', { error: error.message, stack: error.stack });
      
      return {
        success: false,
        error: error.message,
        context: {
          ...context,
          lastNodeType: 'unified_analyze',
          analyzeError: error.message
        }
      };
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
