/**
 * 微调模型管理 API
 * 用于管理微调后的模型
 */

const fineTuneModelsApiRoutes = async function (fastify, options) {
  const { getDb } = require('coze-coding-dev-sdk');
  const { sql } = require('drizzle-orm');

  /**
   * 创建微调模型（训练完成后注册）
   */
  fastify.post('/fine-tune/models', async (request, reply) => {
    try {
      const {
        modelName,
        taskId,
        modelId,
        endpointUrl,
        baseModel,
        fineTuneType,
        performanceMetrics
      } = request.body;

      if (!modelName || !taskId || !modelId) {
        return reply.status(400).send({
          success: false,
          error: '模型名称、任务ID和模型ID不能为空'
        });
      }

      const db = await getDb();

      // 验证训练任务是否存在
      const taskResult = await db.execute(sql`
        SELECT id, base_model FROM fine_tune_tasks WHERE id = ${taskId}
      `);

      if (!taskResult.rows[0]) {
        return reply.status(400).send({
          success: false,
          error: '训练任务不存在'
        });
      }

      const result = await db.execute(sql`
        INSERT INTO fine_tune_models (
          model_name,
          task_id,
          model_id,
          endpoint_url,
          base_model,
          fine_tune_type,
          performance_metrics,
          status
        )
        VALUES (
          ${modelName},
          ${taskId},
          ${modelId},
          ${endpointUrl || null},
          ${baseModel || taskResult.rows[0].base_model},
          ${fineTuneType || 'lora'},
          ${JSON.stringify(performanceMetrics || {})},
          'active'
        )
        RETURNING 
          id, 
          model_name as "modelName", 
          task_id as "taskId",
          model_id as "modelId",
          endpoint_url as "endpointUrl",
          base_model as "baseModel",
          fine_tune_type as "fineTuneType",
          performance_metrics as "performanceMetrics",
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `);

      const model = result.rows[0];

      return {
        success: true,
        data: model
      };
    } catch (error) {
      console.error('创建微调模型失败:', error);

      // 检查是否是唯一性约束错误
      if (error.code === '23505') {
        return reply.status(400).send({
          success: false,
          error: '模型名称已存在'
        });
      }

      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取所有微调模型
   */
  fastify.get('/fine-tune/models', async (request, reply) => {
    try {
      const { status, taskId, page = 1, pageSize = 10 } = request.query;
      const offset = (page - 1) * pageSize;

      const db = await getDb();

      let query = sql`
        SELECT 
          m.id, 
          m.model_name as "modelName", 
          m.task_id as "taskId",
          m.model_id as "modelId",
          m.endpoint_url as "endpointUrl",
          m.base_model as "baseModel",
          m.fine_tune_type as "fineTuneType",
          m.performance_metrics as "performanceMetrics",
          m.status,
          m.created_at as "createdAt",
          m.updated_at as "updatedAt",
          t.task_name as "taskName"
        FROM fine_tune_models m
        LEFT JOIN fine_tune_tasks t ON m.task_id = t.id
        WHERE 1=1
      `;

      if (status) {
        query = sql`${query} AND m.status = ${status}`;
      }

      if (taskId) {
        query = sql`${query} AND m.task_id = ${taskId}`;
      }

      query = sql`${query} ORDER BY m.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;

      const result = await db.execute(query);
      const models = result.rows || [];

      // 获取总数
      let countQuery = sql`SELECT COUNT(*) as total FROM fine_tune_models WHERE 1=1`;
      if (status) {
        countQuery = sql`${countQuery} AND status = ${status}`;
      }
      if (taskId) {
        countQuery = sql`${countQuery} AND task_id = ${taskId}`;
      }
      const countResult = await db.execute(countQuery);
      const total = parseInt(countResult.rows[0].total);

      return {
        success: true,
        data: {
          list: models,
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      };
    } catch (error) {
      console.error('获取微调模型列表失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取可用的微调模型列表（用于 AI 服务设置）
   */
  fastify.get('/fine-tune/models/available', async (request, reply) => {
    try {
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT 
          id, 
          model_name as "modelName",
          model_id as "modelId",
          endpoint_url as "endpointUrl",
          base_model as "baseModel",
          fine_tune_type as "fineTuneType",
          created_at as "createdAt"
        FROM fine_tune_models
        WHERE status = 'active'
        ORDER BY created_at DESC
      `);

      const models = result.rows || [];

      return {
        success: true,
        data: models
      };
    } catch (error) {
      console.error('获取可用微调模型列表失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取单个微调模型详情
   */
  fastify.get('/fine-tune/models/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const db = await getDb();

      const result = await db.execute(sql`
        SELECT 
          m.id, 
          m.model_name as "modelName", 
          m.task_id as "taskId",
          m.model_id as "modelId",
          m.endpoint_url as "endpointUrl",
          m.base_model as "baseModel",
          m.fine_tune_type as "fineTuneType",
          m.performance_metrics as "performanceMetrics",
          m.status,
          m.created_at as "createdAt",
          m.updated_at as "updatedAt",
          t.task_name as "taskName",
          t.base_model as "taskBaseModel",
          t.fine_tune_type as "taskFineTuneType",
          t.hyper_parameters as "hyperParameters",
          d.name as "datasetName",
          d.data_count as "datasetDataCount"
        FROM fine_tune_models m
        LEFT JOIN fine_tune_tasks t ON m.task_id = t.id
        LEFT JOIN fine_tune_datasets d ON t.dataset_id = d.id
        WHERE m.id = ${id}
      `);

      const model = result.rows[0];

      if (!model) {
        return reply.status(404).send({
          success: false,
          error: '微调模型不存在'
        });
      }

      return {
        success: true,
        data: model
      };
    } catch (error) {
      console.error('获取微调模型详情失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新微调模型
   */
  fastify.put('/fine-tune/models/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const {
        modelName,
        endpointUrl,
        status,
        performanceMetrics
      } = request.body;

      const db = await getDb();

      const result = await db.execute(sql`
        UPDATE fine_tune_models
        SET 
          model_name = COALESCE(${modelName}, model_name),
          endpoint_url = COALESCE(${endpointUrl}, endpoint_url),
          status = COALESCE(${status}, status),
          performance_metrics = COALESCE(${JSON.stringify(performanceMetrics)}, performance_metrics),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING 
          id, 
          model_name as "modelName", 
          task_id as "taskId",
          model_id as "modelId",
          endpoint_url as "endpointUrl",
          base_model as "baseModel",
          fine_tune_type as "fineTuneType",
          performance_metrics as "performanceMetrics",
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `);

      const model = result.rows[0];

      if (!model) {
        return reply.status(404).send({
          success: false,
          error: '微调模型不存在'
        });
      }

      return {
        success: true,
        data: model
      };
    } catch (error) {
      console.error('更新微调模型失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除微调模型（软删除，标记为 deleted）
   */
  fastify.delete('/fine-tune/models/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const db = await getDb();

      await db.execute(sql`
        UPDATE fine_tune_models
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `);

      return {
        success: true,
        message: '微调模型删除成功'
      };
    } catch (error) {
      console.error('删除微调模型失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

module.exports = fineTuneModelsApiRoutes;
