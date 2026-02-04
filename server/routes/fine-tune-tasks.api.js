/**
 * 微调训练任务管理 API
 * 用于管理微调训练任务的创建、查询和更新
 */

const fineTuneTasksApiRoutes = async function (fastify, options) {
  const { getDb } = require('coze-coding-dev-sdk');
  const { sql } = require('drizzle-orm');

  /**
   * 创建训练任务
   */
  fastify.post('/fine-tune/tasks', async (request, reply) => {
    try {
      const {
        taskName,
        baseModel,
        datasetId,
        fineTuneType,
        trainingMethod,
        hyperParameters
      } = request.body;

      if (!taskName || !baseModel || !datasetId) {
        return reply.status(400).send({
          success: false,
          error: '任务名称、基础模型和数据集不能为空'
        });
      }

      const db = await getDb();

      // 验证数据集是否存在
      const datasetResult = await db.execute(sql`
        SELECT id, name FROM fine_tune_datasets WHERE id = ${datasetId}
      `);

      if (!datasetResult.rows[0]) {
        return reply.status(400).send({
          success: false,
          error: '数据集不存在'
        });
      }

      const result = await db.execute(sql`
        INSERT INTO fine_tune_tasks (
          task_name,
          base_model,
          dataset_id,
          fine_tune_type,
          training_method,
          hyper_parameters,
          status
        )
        VALUES (
          ${taskName},
          ${baseModel},
          ${datasetId},
          ${fineTuneType || 'lora'},
          ${trainingMethod || 'sft'},
          ${JSON.stringify(hyperParameters || {})},
          'pending'
        )
        RETURNING 
          id, 
          task_name as "taskName", 
          base_model as "baseModel",
          dataset_id as "datasetId",
          fine_tune_type as "fineTuneType",
          training_method as "trainingMethod",
          hyper_parameters as "hyperParameters",
          pai_task_id as "paiTaskId",
          status,
          start_time as "startTime",
          end_time as "endTime",
          error_message as "errorMessage",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `);

      const task = result.rows[0];

      return {
        success: true,
        data: task
      };
    } catch (error) {
      console.error('创建训练任务失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取所有训练任务
   */
  fastify.get('/fine-tune/tasks', async (request, reply) => {
    try {
      const { status, datasetId, page = 1, pageSize = 10 } = request.query;
      const offset = (page - 1) * pageSize;

      const db = await getDb();

      let query = sql`
        SELECT 
          t.id, 
          t.task_name as "taskName", 
          t.base_model as "baseModel",
          t.dataset_id as "datasetId",
          t.fine_tune_type as "fineTuneType",
          t.training_method as "trainingMethod",
          t.hyper_parameters as "hyperParameters",
          t.pai_task_id as "paiTaskId",
          t.status,
          t.start_time as "startTime",
          t.end_time as "endTime",
          t.error_message as "errorMessage",
          t.created_at as "createdAt",
          t.updated_at as "updatedAt",
          d.name as "datasetName"
        FROM fine_tune_tasks t
        LEFT JOIN fine_tune_datasets d ON t.dataset_id = d.id
        WHERE 1=1
      `;

      if (status) {
        query = sql`${query} AND t.status = ${status}`;
      }

      if (datasetId) {
        query = sql`${query} AND t.dataset_id = ${datasetId}`;
      }

      query = sql`${query} ORDER BY t.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;

      const result = await db.execute(query);
      const tasks = result.rows || [];

      // 获取总数
      let countQuery = sql`SELECT COUNT(*) as total FROM fine_tune_tasks WHERE 1=1`;
      if (status) {
        countQuery = sql`${countQuery} AND status = ${status}`;
      }
      if (datasetId) {
        countQuery = sql`${countQuery} AND dataset_id = ${datasetId}`;
      }
      const countResult = await db.execute(countQuery);
      const total = parseInt(countResult.rows[0].total);

      return {
        success: true,
        data: {
          list: tasks,
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      };
    } catch (error) {
      console.error('获取训练任务列表失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取单个训练任务详情
   */
  fastify.get('/fine-tune/tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const db = await getDb();

      const result = await db.execute(sql`
        SELECT 
          t.id, 
          t.task_name as "taskName", 
          t.base_model as "baseModel",
          t.dataset_id as "datasetId",
          t.fine_tune_type as "fineTuneType",
          t.training_method as "trainingMethod",
          t.hyper_parameters as "hyperParameters",
          t.pai_task_id as "paiTaskId",
          t.status,
          t.start_time as "startTime",
          t.end_time as "endTime",
          t.error_message as "errorMessage",
          t.created_at as "createdAt",
          t.updated_at as "updatedAt",
          d.name as "datasetName",
          d.data_count as "dataCount"
        FROM fine_tune_tasks t
        LEFT JOIN fine_tune_datasets d ON t.dataset_id = d.id
        WHERE t.id = ${id}
      `);

      const task = result.rows[0];

      if (!task) {
        return reply.status(404).send({
          success: false,
          error: '训练任务不存在'
        });
      }

      return {
        success: true,
        data: task
      };
    } catch (error) {
      console.error('获取训练任务详情失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新训练任务（用于更新 PAI 任务 ID、状态等）
   */
  fastify.put('/fine-tune/tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const {
        paiTaskId,
        status,
        startTime,
        endTime,
        errorMessage
      } = request.body;

      const db = await getDb();

      const result = await db.execute(sql`
        UPDATE fine_tune_tasks
        SET 
          pai_task_id = COALESCE(${paiTaskId}, pai_task_id),
          status = COALESCE(${status}, status),
          start_time = COALESCE(${startTime}, start_time),
          end_time = COALESCE(${endTime}, end_time),
          error_message = COALESCE(${errorMessage}, error_message),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING 
          id, 
          task_name as "taskName", 
          base_model as "baseModel",
          dataset_id as "datasetId",
          fine_tune_type as "fineTuneType",
          training_method as "trainingMethod",
          hyper_parameters as "hyperParameters",
          pai_task_id as "paiTaskId",
          status,
          start_time as "startTime",
          end_time as "endTime",
          error_message as "errorMessage",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `);

      const task = result.rows[0];

      if (!task) {
        return reply.status(404).send({
          success: false,
          error: '训练任务不存在'
        });
      }

      return {
        success: true,
        data: task
      };
    } catch (error) {
      console.error('更新训练任务失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 开始训练任务（更新状态为 running 并记录开始时间）
   */
  fastify.post('/fine-tune/tasks/:id/start', async (request, reply) => {
    try {
      const { id } = request.params;

      const db = await getDb();

      const result = await db.execute(sql`
        UPDATE fine_tune_tasks
        SET 
          status = 'running',
          start_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, task_name as "taskName", status
      `);

      const task = result.rows[0];

      if (!task) {
        return reply.status(404).send({
          success: false,
          error: '训练任务不存在'
        });
      }

      return {
        success: true,
        data: task,
        message: '训练任务已启动'
      };
    } catch (error) {
      console.error('启动训练任务失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 完成训练任务（更新状态为 completed 并记录结束时间）
   */
  fastify.post('/fine-tune/tasks/:id/complete', async (request, reply) => {
    try {
      const { id } = request.params;

      const db = await getDb();

      const result = await db.execute(sql`
        UPDATE fine_tune_tasks
        SET 
          status = 'completed',
          end_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, task_name as "taskName", status
      `);

      const task = result.rows[0];

      if (!task) {
        return reply.status(404).send({
          success: false,
          error: '训练任务不存在'
        });
      }

      return {
        success: true,
        data: task,
        message: '训练任务已完成'
      };
    } catch (error) {
      console.error('完成训练任务失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 失败训练任务（更新状态为 failed 并记录错误信息）
   */
  fastify.post('/fine-tune/tasks/:id/fail', async (request, reply) => {
    try {
      const { id } = request.params;
      const { errorMessage } = request.body;

      const db = await getDb();

      const result = await db.execute(sql`
        UPDATE fine_tune_tasks
        SET 
          status = 'failed',
          end_time = CURRENT_TIMESTAMP,
          error_message = ${errorMessage || 'Unknown error'},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, task_name as "taskName", status
      `);

      const task = result.rows[0];

      if (!task) {
        return reply.status(404).send({
          success: false,
          error: '训练任务不存在'
        });
      }

      return {
        success: true,
        data: task,
        message: '训练任务已标记为失败'
      };
    } catch (error) {
      console.error('标记训练任务失败状态失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除训练任务
   */
  fastify.delete('/fine-tune/tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const db = await getDb();

      // 检查是否有关联的微调模型
      const checkResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM fine_tune_models WHERE task_id = ${id}
      `);

      if (parseInt(checkResult.rows[0].count) > 0) {
        return reply.status(400).send({
          success: false,
          error: '该训练任务已关联微调模型，无法删除'
        });
      }

      await db.execute(sql`DELETE FROM fine_tune_tasks WHERE id = ${id}`);

      return {
        success: true,
        message: '训练任务删除成功'
      };
    } catch (error) {
      console.error('删除训练任务失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

module.exports = fineTuneTasksApiRoutes;
