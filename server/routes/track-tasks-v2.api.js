/**
 * WorkTool AI - 跟踪任务 API 路由（独立版本）
 * 提供跟踪任务的增删改查接口
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { eq, and, desc } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');
const { trackTasks } = require('../database/schema');

const logger = getLogger('TRACK_TASKS_API');

/**
 * 跟踪任务路由注册
 */
async function trackTasksRoutes(fastify, options) {
  logger.info('Track Tasks API 路由正在注册');

  /**
   * 测试路由
   * GET /api/track-tasks/test
   */
  fastify.get('/test', async (request, reply) => {
    try {
      logger.info('测试跟踪任务路由被调用');
      return reply.send({
        success: true,
        message: '测试路由正常',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('测试路由失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 创建跟踪任务
   * POST /api/track-tasks
   */
  fastify.post('/', async (request, reply) => {
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

      if (!task_type || !target_user_id) {
        return reply.code(400).send({
          success: false,
          error: '缺少必填字段：task_type, target_user_id'
        });
      }

      const db = await getDb();
      const taskId = uuidv4();

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

      logger.info('创建跟踪任务成功', { id: taskId, task_type, target_user_id });

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
   * GET /api/track-tasks
   */
  fastify.get('/', async (request, reply) => {
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

      if (task_type) conditions.push(eq(trackTasks.taskType, task_type));
      if (task_status) conditions.push(eq(trackTasks.taskStatus, task_status));
      if (priority) conditions.push(eq(trackTasks.priority, priority));
      if (target_user_id) conditions.push(eq(trackTasks.targetUserId, target_user_id));

      const tasks = await db.select()
        .from(trackTasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(trackTasks.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      const total = tasks.length;

      logger.info('查询跟踪任务列表成功', { count: tasks.length, total });

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
   * PUT /api/track-tasks/:id
   */
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const db = await getDb();

      const updateValues = {};
      if (updateData.task_status !== undefined) updateValues.taskStatus = updateData.task_status;
      if (updateData.priority !== undefined) updateValues.priority = updateData.priority;
      if (updateData.deadline !== undefined) updateValues.deadline = updateData.deadline;
      if (updateData.response_detected_at !== undefined) updateValues.responseDetectedAt = updateData.response_detected_at;
      if (updateData.completed_at !== undefined) updateValues.completedAt = updateData.completed_at;
      if (updateData.conflict_detected !== undefined) updateValues.conflictDetected = updateData.conflict_detected;
      if (updateData.conflict_resolved !== undefined) updateValues.conflictResolved = updateData.conflict_resolved;
      if (updateData.metadata !== undefined) updateValues.metadata = updateData.metadata;
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
   * DELETE /api/track-tasks/:id
   */
  fastify.delete('/:id', async (request, reply) => {
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
   * POST /api/track-tasks/:id/complete
   */
  fastify.post('/:id/complete', async (request, reply) => {
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

module.exports = { trackTasksRoutes };
