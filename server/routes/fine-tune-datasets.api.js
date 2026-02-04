/**
 * 微调数据集管理 API
 * 用于管理微调训练所需的数据集
 */

const fineTuneDatasetsApiRoutes = async function (fastify, options) {
  const { getDb } = require('coze-coding-dev-sdk');
  const { sql } = require('drizzle-orm');

  /**
   * 创建训练数据集
   */
  fastify.post('/fine-tune/datasets', async (request, reply) => {
    try {
      const { name, description, datasetType } = request.body;

      if (!name) {
        return reply.status(400).send({
          success: false,
          error: '数据集名称不能为空'
        });
      }

      const db = await getDb();

      const result = await db.execute(sql`
        INSERT INTO fine_tune_datasets (name, description, dataset_type, status)
        VALUES (${name}, ${description || null}, ${datasetType || 'sft'}, 'draft')
        RETURNING id, name, description, dataset_type as "datasetType", data_file_path as "dataFilePath", data_count as "dataCount", status, created_at as "createdAt", updated_at as "updatedAt"
      `);

      const dataset = result.rows[0];

      return {
        success: true,
        data: dataset
      };
    } catch (error) {
      console.error('创建训练数据集失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取所有训练数据集
   */
  fastify.get('/fine-tune/datasets', async (request, reply) => {
    try {
      const { status, page = 1, pageSize = 10 } = request.query;
      const offset = (page - 1) * pageSize;

      const db = await getDb();

      let query = sql`
        SELECT 
          id, 
          name, 
          description, 
          dataset_type as "datasetType", 
          data_file_path as "dataFilePath", 
          data_count as "dataCount", 
          status, 
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM fine_tune_datasets
        WHERE 1=1
      `;

      if (status) {
        query = sql`${query} AND status = ${status}`;
      }

      query = sql`${query} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;

      const result = await db.execute(query);
      const datasets = result.rows || [];

      // 获取总数
      let countQuery = sql`SELECT COUNT(*) as total FROM fine_tune_datasets WHERE 1=1`;
      if (status) {
        countQuery = sql`${countQuery} AND status = ${status}`;
      }
      const countResult = await db.execute(countQuery);
      const total = parseInt(countResult.rows[0].total);

      return {
        success: true,
        data: {
          list: datasets,
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      };
    } catch (error) {
      console.error('获取训练数据集列表失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取单个训练数据集详情
   */
  fastify.get('/fine-tune/datasets/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const db = await getDb();

      const result = await db.execute(sql`
        SELECT 
          id, 
          name, 
          description, 
          dataset_type as "datasetType", 
          data_file_path as "dataFilePath", 
          data_count as "dataCount", 
          status, 
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM fine_tune_datasets
        WHERE id = ${id}
      `);

      const dataset = result.rows[0];

      if (!dataset) {
        return reply.status(404).send({
          success: false,
          error: '数据集不存在'
        });
      }

      return {
        success: true,
        data: dataset
      };
    } catch (error) {
      console.error('获取训练数据集详情失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新训练数据集
   */
  fastify.put('/fine-tune/datasets/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, description, datasetType, dataFilePath, dataCount, status } = request.body;

      const db = await getDb();

      const result = await db.execute(sql`
        UPDATE fine_tune_datasets
        SET 
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          dataset_type = COALESCE(${datasetType}, dataset_type),
          data_file_path = COALESCE(${dataFilePath}, data_file_path),
          data_count = COALESCE(${dataCount}, data_count),
          status = COALESCE(${status}, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, name, description, dataset_type as "datasetType", data_file_path as "dataFilePath", data_count as "dataCount", status, created_at as "createdAt", updated_at as "updatedAt"
      `);

      const dataset = result.rows[0];

      if (!dataset) {
        return reply.status(404).send({
          success: false,
          error: '数据集不存在'
        });
      }

      return {
        success: true,
        data: dataset
      };
    } catch (error) {
      console.error('更新训练数据集失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除训练数据集
   */
  fastify.delete('/fine-tune/datasets/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const db = await getDb();

      // 检查是否有关联的训练任务
      const checkResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM fine_tune_tasks WHERE dataset_id = ${id}
      `);

      if (parseInt(checkResult.rows[0].count) > 0) {
        return reply.status(400).send({
          success: false,
          error: '该数据集已关联训练任务，无法删除'
        });
      }

      await db.execute(sql`DELETE FROM fine_tune_datasets WHERE id = ${id}`);

      return {
        success: true,
        message: '数据集删除成功'
      };
    } catch (error) {
      console.error('删除训练数据集失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

module.exports = fineTuneDatasetsApiRoutes;
