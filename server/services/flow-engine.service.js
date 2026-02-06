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
const { flowSelector, SelectionStrategy } = require('./flow-selector.service'); // 流程选择器

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
  VARIABLE_SET: 'variable_set' // 变量设置节点
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
      [NodeType.VARIABLE_SET]: this.handleVariableSetNode.bind(this)
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
      const { messageSource, saveToDatabase, validateMessage } = data || {};

      // 从context中获取消息数据
      const messageData = context.message || context.triggerData || {};

      // 如果需要验证消息
      if (validateMessage && !messageData.content) {
        throw new Error('消息内容不能为空');
      }

      let savedMessage = null;

      // 如果需要保存到数据库
      if (saveToDatabase) {
        const db = await this.getDb();
        const { messages } = require('../database/schema');

        const messageId = uuidv4();
        const messageRecord = {
          id: messageId,
          userId: context.userId,
          sessionId: context.sessionId,
          senderType: messageData.senderType || 'user',
          senderId: messageData.senderId || context.userId,
          content: messageData.content || messageData.spoken || '',
          messageType: messageData.messageType || 'text',
          metadata: messageData.metadata || {},
          createdAt: new Date()
        };

        await db.insert(messages).values(messageRecord);
        savedMessage = messageRecord;

        logger.info('消息已保存到数据库', { messageId, contentLength: messageRecord.content.length });
      }

      return {
        success: true,
        message: savedMessage || messageData,
        messageId: savedMessage?.id || messageData.id,
        context: {
          ...context,
          message: savedMessage || messageData,
          messageId: savedMessage?.id || messageData.id,
          lastNodeType: 'message_receive'
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
   * 处理创建会话节点
   */
  async handleSessionCreateNode(node, context) {
    logger.info('执行创建会话节点', { node, context });

    try {
      const { data } = node;
      const { sessionType = 'chat', autoAssignStaff = false, queueId } = data || {};

      const db = await this.getDb();
      const { sessions, users } = require('../database/schema');

      // 查询用户是否存在
      let user = null;
      if (context.userId) {
        const usersResult = await db.select()
          .from(users)
          .where(eq(users.id, context.userId))
          .limit(1);
        user = usersResult[0] || null;
      }

      // 如果用户不存在，创建用户
      if (!user && context.userName) {
        const userId = uuidv4();
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

      // 创建会话
      const sessionId = uuidv4();
      const session = {
        sessionId,
        userId: user?.id || context.userId,
        staffId: null,
        status: autoAssignStaff ? 'assigned' : 'pending',
        sessionType,
        queueId,
        priority: data.priority || 'normal',
        source: context.source || 'web',
        metadata: data.metadata || {},
        startedAt: new Date(),
        createdAt: new Date()
      };

      await db.insert(sessions).values(session);

      logger.info('会话创建成功', { sessionId, userId: user?.id, status: session.status });

      return {
        success: true,
        session,
        sessionId,
        context: {
          ...context,
          session,
          sessionId,
          userId: user?.id || context.userId,
          lastNodeType: 'session_create'
        }
      };
    } catch (error) {
      logger.error('创建会话节点执行失败', { error: error.message });
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
    logger.info('执行AI回复节点', { node, context });

    try {
      const { data } = node;
      const {
        modelId,
        prompt,
        personaId,
        temperature = 0.7,
        maxTokens = 1000,
        useContextHistory = true,
        systemPrompt
      } = data || {};

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
        usage: result.usage
      });

      // 记录AI IO日志
      await this.saveAILog(context.sessionId, context.messageId, {
        robotId: context.robotId,
        robotName: context.robotName,
        operationType: 'ai_reply',
        aiInput: JSON.stringify(messages),
        aiOutput: result.content,
        modelId,
        requestDuration: result.usage?.duration || 0,
        status: 'success'
      });

      return {
        success: true,
        aiReply: result.content,
        model: modelId,
        usage: result.usage,
        context: {
          ...context,
          aiReply: result.content,
          lastNodeType: 'ai_reply'
        }
      };
    } catch (error) {
      logger.error('AI回复节点执行失败', { error: error.message });

      // 返回默认回复，避免中断流程
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

      // 获取机器人ID
      const botId = robotId || context.robotId;

      if (!botId) {
        throw new Error('机器人ID不能为空');
      }

      // 获取接收者列表
      const targets = recipients || context.recipients || [context.userId];

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
