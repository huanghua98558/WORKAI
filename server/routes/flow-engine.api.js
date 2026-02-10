/**
 * WorkTool AI 2.1 - 流程引擎 API 路由
 * 提供流程定义、流程实例、执行日志的增删改查接口
 */

const { flowEngine, NodeType, FlowStatus, TriggerType } = require('../services/flow-engine.service');
const { getLogger } = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { eq, and, desc } = require('drizzle-orm');
const { trackTasks } = require('../database/schema');

const logger = getLogger('FLOW_ENGINE_API');

/**
 * 流程引擎路由注册
 */
async function flowEngineRoutes(fastify, options) {
  logger.info('FlowEngine API 路由正在注册');

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

  /**
   * 激活流程定义
   * POST /api/flow-engine/definitions/:id/activate
   */
  fastify.post('/definitions/:id/activate', async (request, reply) => {
    try {
      const { id } = request.params;

      const flowDef = await flowEngine.updateFlowDefinition(id, {
        isActive: true,
        updatedAt: new Date().toISOString()
      });

      if (!flowDef) {
        return reply.code(404).send({
          success: false,
          error: '流程定义不存在'
        });
      }

      logger.info('激活流程定义成功', { id, name: flowDef.name });

      return reply.send({
        success: true,
        data: flowDef,
        message: '流程定义激活成功'
      });
    } catch (error) {
      logger.error('激活流程定义失败', { id: request.params.id, error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 停用流程定义
   * POST /api/flow-engine/definitions/:id/deactivate
   */
  fastify.post('/definitions/:id/deactivate', async (request, reply) => {
    try {
      const { id } = request.params;

      const flowDef = await flowEngine.updateFlowDefinition(id, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });

      if (!flowDef) {
        return reply.code(404).send({
          success: false,
          error: '流程定义不存在'
        });
      }

      logger.info('停用流程定义成功', { id, name: flowDef.name });

      return reply.send({
        success: true,
        data: flowDef,
        message: '流程定义停用成功'
      });
    } catch (error) {
      logger.error('停用流程定义失败', { id: request.params.id, error: error.message });
      return reply.code(500).send({
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
   * 取消流程实例
   * POST /api/flow-engine/instances/:id/cancel
   */
  fastify.post('/instances/:id/cancel', async (request, reply) => {
    try {
      const { id } = request.params;
      const { reason } = request.body;

      const instance = await flowEngine.cancelFlowInstance(id, reason);

      if (!instance) {
        return reply.code(404).send({
          success: false,
          error: '流程实例不存在'
        });
      }

      logger.info('取消流程实例成功', { id, reason });

      return reply.send({
        success: true,
        data: instance,
        message: '流程实例已取消'
      });
    } catch (error) {
      logger.error('取消流程实例失败', { id: request.params.id, error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 查询流程实例执行日志
   * GET /api/flow-engine/instances/:id/logs
   */
  fastify.get('/instances/:id/logs', async (request, reply) => {
    try {
      const { id } = request.params;
      const {
        nodeId,
        status,
        limit = 50,
        offset = 0
      } = request.query;

      const filters = {
        flowInstanceId: id,
        nodeId,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const logs = await flowEngine.getFlowExecutionLogs(filters);

      logger.info('查询流程实例执行日志成功', {
        instanceId: id,
        count: logs.length
      });

      return reply.send({
        success: true,
        data: logs,
        total: logs.length
      });
    } catch (error) {
      logger.error('查询流程实例执行日志失败', {
        instanceId: request.params.id,
        error: error.message
      });
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

  /**
   * 初始化 v6.1 流程文件
   * 批量导入默认流程到数据库
   * POST /api/flow-engine/initialize
   */
  fastify.post('/initialize', async (request, reply) => {
    try {
      const fs = require('fs');
      const path = require('path');

      // 流程文件列表（v3.0 - 使用统一消息处理流程）
      const flowFiles = [
        'flows/default/unified-message-routing-v3.json'
      ];

      const results = [];
      const errors = [];

      for (const fileName of flowFiles) {
        const filePath = path.join(process.cwd(), fileName);
        
        try {
          if (!fs.existsSync(filePath)) {
            errors.push({ file: fileName, error: '文件不存在' });
            continue;
          }

          const flowData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

          // 检查流程是否已存在
          const existing = await flowEngine.getFlowDefinition(flowData.id);
          
          if (existing) {
            // 更新现有流程
            const updated = await flowEngine.updateFlowDefinition(flowData.id, flowData);
            results.push({ file: fileName, action: 'updated', id: flowData.id, name: flowData.name });
            logger.info('流程定义更新成功', { id: flowData.id, name: flowData.name });
          } else {
            // 创建新流程
            const created = await flowEngine.createFlowDefinition(flowData);
            results.push({ file: fileName, action: 'created', id: flowData.id, name: flowData.name });
            logger.info('流程定义创建成功', { id: flowData.id, name: flowData.name });
          }
        } catch (error) {
          errors.push({ file: fileName, error: error.message });
          logger.error('流程定义导入失败', { file: fileName, error: error.message });
        }
      }

      return reply.send({
        success: true,
        message: '流程初始化完成',
        data: {
          total: flowFiles.length,
          success: results.length,
          failed: errors.length,
          results,
          errors
        }
      });
    } catch (error) {
      logger.error('初始化流程失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // 跟踪任务管理
  // ============================================

  /**
   * 创建跟踪任务
   * POST /api/flow-engine/track-tasks
   */
  fastify.post('/track-tasks', async (request, reply) => {
    try {
      const {
        task_type,
        group_id,
        group_name,
        operation_id,
        operation_name,
        staff_id,
        staff_name,
        target_user_id,
        target_user_name,
        task_requirement,
        task_description,
        priority = 'medium',
        deadline,
        metadata
      } = request.body;

      // 必填字段验证
      if (!task_type || !target_user_id) {
        return reply.code(400).send({
          success: false,
          error: '缺少必填字段：task_type, target_user_id'
        });
      }

      const db = await getDb();
      const taskId = uuidv4();

      // 创建跟踪任务
      const [newTask] = await db.insert(trackTasks).values({
        id: taskId,
        taskType: task_type,
        taskStatus: 'pending',
        groupId: group_id || null,
        groupName: group_name || null,
        operationId: operation_id || null,
        operationName: operation_name || null,
        staffId: staff_id || null,
        staffName: staff_name || null,
        targetUserId: target_user_id,
        targetUserName: target_user_name || null,
        taskRequirement: task_requirement || null,
        taskDescription: task_description || null,
        priority: priority,
        deadline: deadline || null,
        metadata: metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      logger.info('创建跟踪任务成功', {
        id: taskId,
        task_type,
        target_user_id
      });

      return reply.code(201).send({
        success: true,
        data: newTask,
        message: '跟踪任务创建成功'
      });
    } catch (error) {
      logger.error('创建跟踪任务失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 查询跟踪任务列表
   * GET /api/flow-engine/track-tasks
   */
  fastify.get('/track-tasks', async (request, reply) => {
    try {
      const {
        task_type,
        task_status,
        priority,
        target_user_id,
        limit = 20,
        offset = 0
      } = request.query;

      const db = await getDb();
      const conditions = [];

      // 构建查询条件
      if (task_type) {
        conditions.push(eq(trackTasks.taskType, task_type));
      }
      if (task_status) {
        conditions.push(eq(trackTasks.taskStatus, task_status));
      }
      if (priority) {
        conditions.push(eq(trackTasks.priority, priority));
      }
      if (target_user_id) {
        conditions.push(eq(trackTasks.targetUserId, target_user_id));
      }

      // 查询任务列表
      const tasks = await db.select()
        .from(trackTasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(trackTasks.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      const total = tasks.length;

      logger.info('查询跟踪任务列表成功', {
        count: tasks.length,
        total
      });

      return reply.send({
        success: true,
        data: tasks,
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      logger.error('查询跟踪任务列表失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新跟踪任务
   * PUT /api/flow-engine/track-tasks/:id
   */
  fastify.put('/track-tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const db = await getDb();

      // 构建更新数据
      const updateValues = {};
      if (updateData.task_status !== undefined) {
        updateValues.taskStatus = updateData.task_status;
      }
      if (updateData.priority !== undefined) {
        updateValues.priority = updateData.priority;
      }
      if (updateData.deadline !== undefined) {
        updateValues.deadline = updateData.deadline;
      }
      if (updateData.response_detected_at !== undefined) {
        updateValues.responseDetectedAt = updateData.response_detected_at;
      }
      if (updateData.completed_at !== undefined) {
        updateValues.completedAt = updateData.completed_at;
      }
      if (updateData.conflict_detected !== undefined) {
        updateValues.conflictDetected = updateData.conflict_detected;
      }
      if (updateData.conflict_resolved !== undefined) {
        updateValues.conflictResolved = updateData.conflict_resolved;
      }
      if (updateData.metadata !== undefined) {
        updateValues.metadata = updateData.metadata;
      }
      updateValues.updatedAt = new Date();

      const [updatedTask] = await db.update(trackTasks)
        .set(updateValues)
        .where(eq(trackTasks.id, id))
        .returning();

      if (!updatedTask) {
        return reply.code(404).send({
          success: false,
          error: '跟踪任务不存在'
        });
      }

      logger.info('更新跟踪任务成功', { id });

      return reply.send({
        success: true,
        data: updatedTask,
        message: '跟踪任务更新成功'
      });
    } catch (error) {
      logger.error('更新跟踪任务失败', { id: request.params.id, error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除跟踪任务
   * DELETE /api/flow-engine/track-tasks/:id
   */
  fastify.delete('/track-tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();

      await db.delete(trackTasks).where(eq(trackTasks.id, id));

      logger.info('删除跟踪任务成功', { id });

      return reply.send({
        success: true,
        message: '跟踪任务删除成功'
      });
    } catch (error) {
      logger.error('删除跟踪任务失败', { id: request.params.id, error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 完成跟踪任务
   * POST /api/flow-engine/track-tasks/:id/complete
   */
  fastify.post('/track-tasks/:id/complete', async (request, reply) => {
    try {
      const { id } = request.params;
      const { completion_note } = request.body;

      const db = await getDb();

      const [updatedTask] = await db.update(trackTasks)
        .set({
          taskStatus: 'completed',
          completedAt: new Date(),
          metadata: completion_note ? { completion_note } : {},
          updatedAt: new Date()
        })
        .where(eq(trackTasks.id, id))
        .returning();

      if (!updatedTask) {
        return reply.code(404).send({
          success: false,
          error: '跟踪任务不存在'
        });
      }

      logger.info('完成跟踪任务成功', { id });

      return reply.send({
        success: true,
        data: updatedTask,
        message: '跟踪任务已完成'
      });
    } catch (error) {
      logger.error('完成跟踪任务失败', { id: request.params.id, error: error.message });
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
    // ========== 基础节点（6种）==========
    start: '开始节点 - 流程的起点',
    end: '结束节点 - 流程的终点',
    decision: '决策节点 - 根据条件路由到不同节点',
    condition: '条件节点 - 条件判断',
    flow_call: '流程调用节点 - 调用其他流程',
    delay: '延迟节点 - 延迟执行',

    // ========== 多任务节点（8种）==========
    multi_task_ai: 'AI处理多任务 - 对话/分析/识别/生成（v6.1）',
    multi_task_data: '数据处理多任务 - 查询/转换/聚合（v6.1）',
    multi_task_http: 'HTTP请求多任务 - 请求/上传/下载（v6.1）',
    multi_task_task: '任务管理多任务 - 创建/分配/更新（v6.1）',
    multi_task_alert: '告警管理多任务 - 规则评估/保存/通知/升级（v6.1）',
    multi_task_staff: '人员管理多任务 - 匹配/转移/通知/介入（v6.1）',
    multi_task_analysis: '协同分析多任务 - 活跃度/满意度/报告（v6.1）',
    multi_task_robot: '机器人交互多任务 - 调度/指令/状态（v6.1）',
    multi_task_message: '消息管理多任务 - 接收/分发/同步（v6.1）',

    // ========== 专用节点（5种）==========
    session: '会话管理节点 - 创建/获取/更新会话（v6.1）',
    context: '上下文节点 - 检索和增强上下文（v6.1）',
    notification: '通知节点 - 发送通知',
    log: '日志节点 - 记录日志（v6.1）',
    custom: '自定义节点 - 执行自定义代码（v6.1）',

    // ========== 流程控制节点（3种）==========
    loop: '循环节点 - 循环执行（v6.1）',
    parallel: '并行节点 - 并行执行（v6.1）',
    try_catch: '异常处理节点 - 异常捕获（v6.1）',

    // ========== 已废弃的节点类型（保留兼容性）==========
    ai_chat: '[已废弃] AI对话节点 - 请使用 multi_task_ai',
    intent: '[已废弃] 意图识别节点 - 请使用 multi_task_ai',
    emotion_analyze: '[已废弃] 情感分析节点 - 请使用 multi_task_ai',
    ai_reply: '[已废弃] AI回复节点 - 请使用 multi_task_ai',
    ai_reply_enhanced: '[已废弃] 增强AI回复节点 - 请使用 multi_task_ai',
    risk_detect: '[已废弃] 风险检测节点 - 请使用 multi_task_ai',
    smart_analyze: '[已废弃] 智能分析节点 - 请使用 multi_task_ai',
    unified_analyze: '[已废弃] 统一AI分析节点 - 请使用 multi_task_ai',

    data_query: '[已废弃] 数据查询节点 - 请使用 multi_task_data',
    data_transform: '[已废弃] 数据转换节点 - 请使用 multi_task_data',
    variable_set: '[已废弃] 变量设置节点 - 请使用 multi_task_data',
    satisfaction_infer: '[已废弃] 满意度推断节点 - 请使用 multi_task_data',

    http_request: '[已废弃] HTTP请求节点 - 请使用 multi_task_http',
    image_process: '[已废弃] 图片处理节点 - 请使用 multi_task_http',

    task_assign: '[已废弃] 任务分配节点 - 请使用 multi_task_task',

    alert_rule: '[已废弃] 告警规则节点 - 请使用 multi_task_alert',
    alert_save: '[已废弃] 告警保存节点 - 请使用 multi_task_alert',
    alert_notify: '[已废弃] 告警通知节点 - 请使用 multi_task_alert',
    alert_escalate: '[已废弃] 告警升级节点 - 请使用 multi_task_alert',

    staff_intervention: '[已废弃] 员工干预节点 - 请使用 multi_task_staff',
    human_handover: '[已废弃] 人工转接节点 - 请使用 multi_task_staff',

    collaboration_analyze: '[已废弃] 协同分析节点 - 请使用 multi_task_analysis',
    staff_message: '[已废弃] 员工消息节点 - 请使用 multi_task_analysis',

    robot_dispatch: '[已废弃] 机器人分发节点 - 请使用 multi_task_robot',
    send_command: '[已废弃] 发送指令节点 - 请使用 multi_task_robot',
    command_status: '[已废弃] 指令状态节点 - 请使用 multi_task_robot',

    message_receive: '[已废弃] 消息接收节点 - 请使用 multi_task_message',
    message_dispatch: '[已废弃] 消息分发节点 - 请使用 multi_task_message',
    message_sync: '[已废弃] 消息同步节点 - 请使用 multi_task_message',

    session_create: '[已废弃] 会话创建节点 - 请使用 session',
    context_enhancer: '[已废弃] 上下文增强器节点 - 请使用 context',
    log_save: '[已废弃] 日志保存节点 - 请使用 log',

    service: '[已废弃] 服务节点 - 请使用 multi_task_http 或 custom',
    risk_handler: '[已废弃] 风险处理节点 - 请使用 multi_task_alert',
    monitor: '[已废弃] 监控节点 - 请使用 multi_task_analysis 或 custom'
  };
  return descriptions[nodeType] || `${nodeType} (未定义描述)`;
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

/**
 * 获取节点类型描述（辅助函数）
 */
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
