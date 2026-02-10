/**
 * WorkTool AI - 跟踪任务 API 路由
 * 提供跟踪任务的增删改查接口
 * 用于运营消息跟踪、售后任务跟踪、告警跟踪等
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { eq, and, or, desc, lt, gt, inArray } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('TRACK_TASKS_API');

/**
 * 跟踪任务路由注册
 */
async function trackTasksRoutes(fastify, options) {
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
      const [newTask] = await db.execute(sql`
        INSERT INTO track_tasks (
          id, task_type, task_status,
          group_id, group_name,
          operation_id, operation_name,
          staff_id, staff_name,
          target_user_id, target_user_name,
          task_requirement, task_description,
          priority, deadline,
          metadata
        ) VALUES (
          ${taskId}, ${task_type}, 'pending',
          ${group_id || null}, ${group_name || null},
          ${operation_id || null}, ${operation_name || null},
          ${staff_id || null}, ${staff_name || null},
          ${target_user_id}, ${target_user_name || null},
          ${task_requirement || null}, ${task_description || null},
          ${priority}, ${deadline || null},
          ${JSON.stringify(metadata || {})}::jsonb
        ) RETURNING *
      `);

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
   * 更新跟踪任务
   * PUT /api/flow-engine/track-tasks/:id
   */
  fastify.put('/track-tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const db = await getDb();
      const updateFields = [];
      const updateValues = [];

      // 构建动态更新语句
      if (updateData.task_status !== undefined) {
        updateFields.push(`task_status = $${updateValues.length + 1}`);
        updateValues.push(updateData.task_status);
      }
      if (updateData.priority !== undefined) {
        updateFields.push(`priority = $${updateValues.length + 1}`);
        updateValues.push(updateData.priority);
      }
      if (updateData.deadline !== undefined) {
        updateFields.push(`deadline = $${updateValues.length + 1}`);
        updateValues.push(updateData.deadline);
      }
      if (updateData.response_detected_at !== undefined) {
        updateFields.push(`response_detected_at = $${updateValues.length + 1}`);
        updateValues.push(updateData.response_detected_at);
      }
      if (updateData.completed_at !== undefined) {
        updateFields.push(`completed_at = $${updateValues.length + 1}`);
        updateValues.push(updateData.completed_at);
      }
      if (updateData.conflict_detected !== undefined) {
        updateFields.push(`conflict_detected = $${updateValues.length + 1}`);
        updateValues.push(updateData.conflict_detected);
      }
      if (updateData.conflict_resolved !== undefined) {
        updateFields.push(`conflict_resolved = $${updateValues.length + 1}`);
        updateValues.push(updateData.conflict_resolved);
      }
      if (updateData.metadata !== undefined) {
        updateFields.push(`metadata = $${updateValues.length + 1}::jsonb`);
        updateValues.push(JSON.stringify(updateData.metadata));
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      const query = `
        UPDATE track_tasks
        SET ${updateFields.join(', ')}
        WHERE id = $${updateValues.length}
        RETURNING *
      `;

      const [updatedTask] = await db.execute(query, updateValues);

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

      await db.execute(sql`
        DELETE FROM track_tasks WHERE id = ${id}
      `);

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
        group_id,
        staff_id,
        operation_id,
        limit = 20,
        offset = 0
      } = request.query;

      const db = await getDb();
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      // 构建查询条件
      if (task_type) {
        conditions.push(`task_type = $${paramIndex++}`);
        params.push(task_type);
      }
      if (task_status) {
        conditions.push(`task_status = $${paramIndex++}`);
        params.push(task_status);
      }
      if (priority) {
        conditions.push(`priority = $${paramIndex++}`);
        params.push(priority);
      }
      if (target_user_id) {
        conditions.push(`target_user_id = $${paramIndex++}`);
        params.push(target_user_id);
      }
      if (group_id) {
        conditions.push(`group_id = $${paramIndex++}`);
        params.push(group_id);
      }
      if (staff_id) {
        conditions.push(`staff_id = $${paramIndex++}`);
        params.push(staff_id);
      }
      if (operation_id) {
        conditions.push(`operation_id = $${paramIndex++}`);
        params.push(operation_id);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // 查询任务列表
      const query = `
        SELECT * FROM track_tasks
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(parseInt(limit), parseInt(offset));

      const tasks = await db.execute(query, params);

      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total FROM track_tasks ${whereClause}
      `;
      const [countResult] = await db.execute(countQuery, params.slice(0, paramIndex - 2));

      logger.info('查询跟踪任务列表成功', {
        count: tasks.length,
        total: countResult.total
      });

      return reply.send({
        success: true,
        data: tasks,
        total: parseInt(countResult.total),
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
   * 完成跟踪任务
   * POST /api/flow-engine/track-tasks/:id/complete
   */
  fastify.post('/track-tasks/:id/complete', async (request, reply) => {
    try {
      const { id } = request.params;
      const { completion_note } = request.body;

      const db = await getDb();
      const metadata = completion_note
        ? { completion_note }
        : {};

      const [updatedTask] = await db.execute(sql`
        UPDATE track_tasks
        SET
          task_status = 'completed',
          completed_at = NOW(),
          metadata = COALESCE(track_tasks.metadata, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);

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
