/**
 * 流程变量管理 API
 * 提供流程全局变量的增删改查接口
 */

const { getDb } = require('coze-coding-dev-sdk');
const { flowVariables } = require('../database/schema');
const { eq, and, desc } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('FLOW_VARIABLES_API');

async function flowVariablesRoutes(fastify, options) {
  logger.info('流程变量管理 API 路由正在注册');

  /**
   * 获取所有流程变量
   * GET /api/flow-engine/variables
   */
  fastify.get('/variables', async (request, reply) => {
    try {
      const db = await getDb();
      const variables = await db
        .select()
        .from(flowVariables)
        .orderBy(flowVariables.variableName);

      return reply.send({
        success: true,
        data: variables
      });
    } catch (error) {
      logger.error('获取流程变量失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取单个流程变量
   * GET /api/flow-engine/variables/:name
   */
  fastify.get('/variables/:name', async (request, reply) => {
    try {
      const { name } = request.params;
      const db = await getDb();

      const variable = await db
        .select()
        .from(flowVariables)
        .where(eq(flowVariables.variableName, name))
        .limit(1);

      if (variable.length === 0) {
        return reply.code(404).send({
          success: false,
          error: `变量 ${name} 不存在`
        });
      }

      return reply.send({
        success: true,
        data: variable[0]
      });
    } catch (error) {
      logger.error('获取流程变量失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 创建流程变量
   * POST /api/flow-engine/variables
   */
  fastify.post('/variables', async (request, reply) => {
    try {
      const {
        variable_name,
        variable_value,
        description,
        variable_type = 'string',
        is_system = false,
        is_encrypted = false
      } = request.body;

      // 验证必填字段
      if (!variable_name || variable_value === undefined) {
        return reply.code(400).send({
          success: false,
          error: '缺少必填字段：variable_name, variable_value'
        });
      }

      const db = await getDb();
      const newVariable = {
        id: crypto.randomUUID(),
        variableName: variable_name,
        variableValue: String(variable_value),
        description,
        variableType: variable_type,
        isSystem: is_system,
        isEncrypted: is_encrypted,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [inserted] = await db
        .insert(flowVariables)
        .values(newVariable)
        .returning();

      logger.info('创建流程变量成功', { variableName: variable_name });

      return reply.code(201).send({
        success: true,
        data: inserted,
        message: '流程变量创建成功'
      });
    } catch (error) {
      logger.error('创建流程变量失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新流程变量
   * PUT /api/flow-engine/variables/:name
   */
  fastify.put('/variables/:name', async (request, reply) => {
    try {
      const { name } = request.params;
      const {
        variable_value,
        description,
        variable_type,
        is_system,
        is_encrypted
      } = request.body;

      const db = await getDb();

      // 检查变量是否存在
      const existing = await db
        .select()
        .from(flowVariables)
        .where(eq(flowVariables.variableName, name))
        .limit(1);

      if (existing.length === 0) {
        return reply.code(404).send({
          success: false,
          error: `变量 ${name} 不存在`
        });
      }

      // 构建更新数据
      const updateData = {
        updatedAt: new Date()
      };

      if (variable_value !== undefined) updateData.variableValue = String(variable_value);
      if (description !== undefined) updateData.description = description;
      if (variable_type !== undefined) updateData.variableType = variable_type;
      if (is_system !== undefined) updateData.isSystem = is_system;
      if (is_encrypted !== undefined) updateData.isEncrypted = is_encrypted;

      const [updated] = await db
        .update(flowVariables)
        .set(updateData)
        .where(eq(flowVariables.variableName, name))
        .returning();

      logger.info('更新流程变量成功', { variableName: name });

      return reply.send({
        success: true,
        data: updated,
        message: '流程变量更新成功'
      });
    } catch (error) {
      logger.error('更新流程变量失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除流程变量
   * DELETE /api/flow-engine/variables/:name
   */
  fastify.delete('/variables/:name', async (request, reply) => {
    try {
      const { name } = request.params;
      const db = await getDb();

      // 检查是否为系统变量
      const existing = await db
        .select()
        .from(flowVariables)
        .where(eq(flowVariables.variableName, name))
        .limit(1);

      if (existing.length === 0) {
        return reply.code(404).send({
          success: false,
          error: `变量 ${name} 不存在`
        });
      }

      if (existing[0].isSystem) {
        return reply.code(400).send({
          success: false,
          error: '系统变量不能删除'
        });
      }

      await db
        .delete(flowVariables)
        .where(eq(flowVariables.variableName, name));

      logger.info('删除流程变量成功', { variableName: name });

      return reply.send({
        success: true,
        message: '流程变量删除成功'
      });
    } catch (error) {
      logger.error('删除流程变量失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 批量获取流程变量（用于流程初始化）
   * GET /api/flow-engine/variables/batch
   */
  fastify.get('/variables/batch', async (request, reply) => {
    try {
      const { names } = request.query;

      let variables;

      const db = await getDb();

      if (names) {
        // 获取指定的变量
        const nameList = names.split(',').map(n => n.trim());
        variables = await db
          .select()
          .from(flowVariables)
          .where(flowVariables.variableName in nameList);
      } else {
        // 获取所有变量
        variables = await db
          .select()
          .from(flowVariables)
          .orderBy(flowVariables.variableName);
      }

      // 转换为键值对格式
      const variableMap = {};
      variables.forEach(v => {
        variableMap[v.variableName] = parseVariableValue(v.variableValue, v.variableType);
      });

      return reply.send({
        success: true,
        data: variableMap
      });
    } catch (error) {
      logger.error('批量获取流程变量失败', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * 解析变量值
 */
function parseVariableValue(value, type) {
  switch (type) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'true';
    case 'json':
      return JSON.parse(value);
    default:
      return value;
  }
}

module.exports = flowVariablesRoutes;
