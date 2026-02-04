/**
 * WorkTool AI 2.1 - 流程引擎 API 路由
 * 提供流程定义、流程实例、执行日志的增删改查接口
 */

const { flowEngine, NodeType, FlowStatus, TriggerType } = require('../services/flow-engine.service');
const { getLogger } = require('../lib/logger');

const logger = getLogger('FLOW_ENGINE_API');

/**
 * 流程引擎路由注册
 */
async function flowEngineRoutes(fastify, options) {
  // ============================================
  // 流程定义管理
  // ============================================

  /**
   * 创建流程定义
   * POST /api/flow-engine/definitions
   */
  fastify.post('/definitions', async (request, reply) => {
    try {
      const flowData = request.body;
      const flowDef = await flowEngine.createFlowDefinition(flowData);

      logger.info('创建流程定义成功', { id: flowDef.id, name: flowDef.name });

      return reply.code(201).send({
        success: true,
        data: flowDef,
        message: '流程定义创建成功'
      });
    } catch (error) {
      logger.error('创建流程定义失败', { error: error.message });
      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 查询流程定义列表
   * GET /api/flow-engine/definitions
   */
  fastify.get('/definitions', async (request, reply) => {
    try {
      const filters = {
        isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined,
        triggerType: request.query.triggerType,
        limit: request.query.limit ? parseInt(request.query.limit) : undefined,
        offset: request.query.offset ? parseInt(request.query.offset) : undefined
      };

      const flowDefs = await flowEngine.listFlowDefinitions(filters);

      logger.info('查询流程定义列表成功', { count: flowDefs.length });

      return reply.send({
        success: true,
        data: flowDefs,
        total: flowDefs.length
      });
    } catch (error) {
      logger.error('查询流程定义列表失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取流程定义详情
   * GET /api/flow-engine/definitions/:id
   */
  fastify.get('/definitions/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const flowDef = await flowEngine.getFlowDefinition(id);

      if (!flowDef) {
        return reply.code(404).send({
          success: false,
          error: '流程定义不存在'
        });
      }

      logger.info('获取流程定义详情成功', { id });

      return reply.send({
        success: true,
        data: flowDef
      });
    } catch (error) {
      logger.error('获取流程定义详情失败', { id: request.params.id, error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新流程定义
   * PUT /api/flow-engine/definitions/:id
   */
  fastify.put('/definitions/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const flowDef = await flowEngine.updateFlowDefinition(id, updateData);

      logger.info('更新流程定义成功', { id });

      return reply.send({
        success: true,
        data: flowDef,
        message: '流程定义更新成功'
      });
    } catch (error) {
      logger.error('更新流程定义失败', { id: request.params.id, error: error.message });
      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除流程定义
   * DELETE /api/flow-engine/definitions/:id
   */
  fastify.delete('/definitions/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      await flowEngine.deleteFlowDefinition(id);

      logger.info('删除流程定义成功', { id });

      return reply.send({
        success: true,
        message: '流程定义删除成功'
      });
    } catch (error) {
      logger.error('删除流程定义失败', { id: request.params.id, error: error.message });
      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // 流程实例管理
  // ============================================

  /**
   * 创建流程实例
   * POST /api/flow-engine/instances
   */
  fastify.post('/instances', async (request, reply) => {
    try {
      const { flowDefinitionId, triggerData, metadata } = request.body;

      if (!flowDefinitionId) {
        return reply.code(400).send({
          success: false,
          error: '缺少流程定义ID'
        });
      }

      const instance = await flowEngine.createFlowInstance(
        flowDefinitionId,
        triggerData || {},
        metadata || {}
      );

      logger.info('创建流程实例成功', { instanceId: instance.id, flowDefinitionId });

      return reply.code(201).send({
        success: true,
        data: instance,
        message: '流程实例创建成功'
      });
    } catch (error) {
      logger.error('创建流程实例失败', { error: error.message });
      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 查询流程实例列表
   * GET /api/flow-engine/instances
   */
  fastify.get('/instances', async (request, reply) => {
    try {
      const filters = {
        flowDefinitionId: request.query.flowDefinitionId,
        status: request.query.status,
        limit: request.query.limit ? parseInt(request.query.limit) : undefined,
        offset: request.query.offset ? parseInt(request.query.offset) : undefined
      };

      const instances = await flowEngine.listFlowInstances(filters);

      logger.info('查询流程实例列表成功', { count: instances.length });

      return reply.send({
        success: true,
        data: instances,
        total: instances.length
      });
    } catch (error) {
      logger.error('查询流程实例列表失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取流程实例详情
   * GET /api/flow-engine/instances/:id
   */
  fastify.get('/instances/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const instance = await flowEngine.getFlowInstance(id);

      if (!instance) {
        return reply.code(404).send({
          success: false,
          error: '流程实例不存在'
        });
      }

      logger.info('获取流程实例详情成功', { id });

      return reply.send({
        success: true,
        data: instance
      });
    } catch (error) {
      logger.error('获取流程实例详情失败', { id: request.params.id, error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 执行流程实例（异步）
   * POST /api/flow-engine/instances/:id/execute
   */
  fastify.post('/instances/:id/execute', async (request, reply) => {
    try {
      const { id } = request.params;

      // 先返回响应，再异步执行
      reply.send({
        success: true,
        message: '流程实例执行中',
        instanceId: id
      });

      // 异步执行流程
      flowEngine.executeFlow(id).catch(error => {
        logger.error('异步执行流程失败', { instanceId: id, error: error.message });
      });

      logger.info('流程实例执行已启动', { instanceId: id });
    } catch (error) {
      logger.error('执行流程实例失败', { id: request.params.id, error: error.message });
      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 创建并执行流程实例（快捷方式）
   * POST /api/flow-engine/execute
   */
  fastify.post('/execute', async (request, reply) => {
    try {
      const { flowDefinitionId, triggerData, metadata } = request.body;

      if (!flowDefinitionId) {
        return reply.code(400).send({
          success: false,
          error: '缺少流程定义ID'
        });
      }

      // 创建流程实例
      const instance = await flowEngine.createFlowInstance(
        flowDefinitionId,
        triggerData || {},
        metadata || {}
      );

      // 先返回响应，再异步执行
      reply.send({
        success: true,
        message: '流程实例创建成功，执行中',
        instanceId: instance.id,
        instance
      });

      // 异步执行流程
      flowEngine.executeFlow(instance.id).catch(error => {
        logger.error('异步执行流程失败', { instanceId: instance.id, error: error.message });
      });

      logger.info('流程实例创建并执行已启动', { instanceId: instance.id });
    } catch (error) {
      logger.error('创建并执行流程实例失败', { error: error.message });
      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // 执行日志查询
  // ============================================

  /**
   * 获取流程执行日志
   * GET /api/flow-engine/logs
   */
  fastify.get('/logs', async (request, reply) => {
    try {
      const filters = {
        flowInstanceId: request.query.flowInstanceId,
        flowDefinitionId: request.query.flowDefinitionId,
        nodeId: request.query.nodeId,
        status: request.query.status,
        limit: request.query.limit ? parseInt(request.query.limit) : undefined
      };

      const logs = await flowEngine.getFlowExecutionLogs(filters);

      logger.info('获取流程执行日志成功', { count: logs.length });

      return reply.send({
        success: true,
        data: logs,
        total: logs.length
      });
    } catch (error) {
      logger.error('获取流程执行日志失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // 节点类型和常量
  // ============================================

  /**
   * 获取节点类型列表
   * GET /api/flow-engine/node-types
   */
  fastify.get('/node-types', async (request, reply) => {
    try {
      const nodeTypes = Object.entries(NodeType).map(([key, value]) => ({
        key,
        value,
        description: getNodeDescription(value)
      }));

      return reply.send({
        success: true,
        data: nodeTypes
      });
    } catch (error) {
      logger.error('获取节点类型列表失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取流程状态列表
   * GET /api/flow-engine/flow-statuses
   */
  fastify.get('/flow-statuses', async (request, reply) => {
    try {
      const flowStatuses = Object.entries(FlowStatus).map(([key, value]) => ({
        key,
        value,
        description: getFlowStatusDescription(value)
      }));

      return reply.send({
        success: true,
        data: flowStatuses
      });
    } catch (error) {
      logger.error('获取流程状态列表失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取触发类型列表
   * GET /api/flow-engine/trigger-types
   */
  fastify.get('/trigger-types', async (request, reply) => {
    try {
      const triggerTypes = Object.entries(TriggerType).map(([key, value]) => ({
        key,
        value,
        description: getTriggerTypeDescription(value)
      }));

      return reply.send({
        success: true,
        data: triggerTypes
      });
    } catch (error) {
      logger.error('获取触发类型列表失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}

// ============================================
// 辅助函数
// ============================================

function getNodeDescription(nodeType) {
  const descriptions = {
    start: '开始节点 - 流程的起点',
    end: '结束节点 - 流程的终点',
    condition: '条件节点 - 根据条件选择不同的分支',
    ai_chat: 'AI对话节点 - 使用AI生成回复',
    intent: '意图识别节点 - 识别用户意图',
    service: '服务节点 - 调用外部服务',
    human_handover: '人工转接节点 - 转接到人工客服',
    notification: '通知节点 - 发送通知'
  };
  return descriptions[nodeType] || nodeType;
}

function getFlowStatusDescription(status) {
  const descriptions = {
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    failed: '执行失败',
    cancelled: '已取消',
    timeout: '执行超时'
  };
  return descriptions[status] || status;
}

function getTriggerTypeDescription(triggerType) {
  const descriptions = {
    webhook: 'Webhook触发',
    manual: '手动触发',
    scheduled: '定时触发'
  };
  return descriptions[triggerType] || triggerType;
}

// ============================================
// 导出
// ============================================

module.exports = flowEngineRoutes;
