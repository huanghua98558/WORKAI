/**
 * Prompt 训练 API 路由
 */

const promptService = require('../services/prompt.service');

const promptApiRoutes = async function (fastify, options) {
  console.log('[prompt.api.js] Prompt 训练 API 路由已加载');

  // ========== Prompt 模板管理 ==========

  // 获取所有 Prompt 模板
  fastify.get('/prompt-templates', async (request, reply) => {
    try {
      const { type, isActive } = request.query;
      const filters = {};
      if (type) filters.type = type;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const templates = await promptService.getAllTemplates(filters);

      return reply.send({
        code: 0,
        message: 'success',
        data: templates,
      });
    } catch (error) {
      console.error('获取 Prompt 模板列表失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取 Prompt 模板列表失败',
        error: error.message,
      });
    }
  });

  // 根据 ID 获取 Prompt 模板
  fastify.get('/prompt-templates/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const template = await promptService.getTemplateById(id);

      if (!template) {
        return reply.status(404).send({
          code: -1,
          message: 'Prompt 模板不存在',
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: template,
      });
    } catch (error) {
      console.error('获取 Prompt 模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取 Prompt 模板失败',
        error: error.message,
      });
    }
  });

  // 创建 Prompt 模板
  fastify.post('/prompt-templates', async (request, reply) => {
    try {
      const data = request.body;
      const template = await promptService.createTemplate(data);

      return reply.send({
        code: 0,
        message: '创建成功',
        data: template,
      });
    } catch (error) {
      console.error('创建 Prompt 模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '创建 Prompt 模板失败',
        error: error.message,
      });
    }
  });

  // 更新 Prompt 模板
  fastify.put('/prompt-templates/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const template = await promptService.updateTemplate(id, data);

      if (!template) {
        return reply.status(404).send({
          code: -1,
          message: 'Prompt 模板不存在',
        });
      }

      return reply.send({
        code: 0,
        message: '更新成功',
        data: template,
      });
    } catch (error) {
      console.error('更新 Prompt 模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '更新 Prompt 模板失败',
        error: error.message,
      });
    }
  });

  // 删除 Prompt 模板
  fastify.delete('/prompt-templates/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      await promptService.deleteTemplate(id);

      return reply.send({
        code: 0,
        message: '删除成功',
      });
    } catch (error) {
      console.error('删除 Prompt 模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '删除 Prompt 模板失败',
        error: error.message,
      });
    }
  });

  // 激活/停用 Prompt 模板
  fastify.patch('/prompt-templates/:id/toggle', async (request, reply) => {
    try {
      const { id } = request.params;
      const { isActive } = request.body;

      const template = await promptService.toggleTemplateStatus(id, isActive);

      if (!template) {
        return reply.status(404).send({
          code: -1,
          message: 'Prompt 模板不存在',
        });
      }

      return reply.send({
        code: 0,
        message: '状态更新成功',
        data: template,
      });
    } catch (error) {
      console.error('切换模板状态失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '切换模板状态失败',
        error: error.message,
      });
    }
  });

  // ========== Prompt 测试管理 ==========

  // 运行 Prompt 测试
  fastify.post('/prompt-tests/run', async (request, reply) => {
    try {
      const testData = request.body;
      const result = await promptService.runTest(testData);

      return reply.send({
        code: 0,
        message: '测试执行成功',
        data: result,
      });
    } catch (error) {
      console.error('运行 Prompt 测试失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '运行 Prompt 测试失败',
        error: error.message,
      });
    }
  });

  // 批量测试
  fastify.post('/prompt-tests/batch', async (request, reply) => {
    try {
      const { templateId, testCases, aiConfig } = request.body;

      const results = await promptService.batchTest(templateId, testCases, aiConfig);

      return reply.send({
        code: 0,
        message: '批量测试完成',
        data: results,
      });
    } catch (error) {
      console.error('批量测试失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '批量测试失败',
        error: error.message,
      });
    }
  });

  // 获取测试记录列表
  fastify.get('/prompt-tests', async (request, reply) => {
    try {
      const { templateId, status, limit, offset } = request.query;
      const filters = {};
      if (templateId) filters.templateId = templateId;
      if (status) filters.status = status;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const tests = await promptService.getTests(filters);

      return reply.send({
        code: 0,
        message: 'success',
        data: tests,
      });
    } catch (error) {
      console.error('获取测试记录失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取测试记录失败',
        error: error.message,
      });
    }
  });

  // 获取测试记录详情
  fastify.get('/prompt-tests/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const test = await promptService.getTestById(id);

      if (!test) {
        return reply.status(404).send({
          code: -1,
          message: '测试记录不存在',
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: test,
      });
    } catch (error) {
      console.error('获取测试记录详情失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取测试记录详情失败',
        error: error.message,
      });
    }
  });

  // 更新测试记录（评分、反馈）
  fastify.patch('/prompt-tests/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;

      const test = await promptService.updateTest(id, data);

      if (!test) {
        return reply.status(404).send({
          code: -1,
          message: '测试记录不存在',
        });
      }

      return reply.send({
        code: 0,
        message: '更新成功',
        data: test,
      });
    } catch (error) {
      console.error('更新测试记录失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '更新测试记录失败',
        error: error.message,
      });
    }
  });

  // 删除测试记录
  fastify.delete('/prompt-tests/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      await promptService.deleteTest(id);

      return reply.send({
        code: 0,
        message: '删除成功',
      });
    } catch (error) {
      console.error('删除测试记录失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '删除测试记录失败',
        error: error.message,
      });
    }
  });

  // 获取测试统计
  fastify.get('/prompt-tests/statistics', async (request, reply) => {
    try {
      const { templateId } = request.query;
      const stats = await promptService.getTestStatistics(templateId);

      return reply.send({
        code: 0,
        message: 'success',
        data: stats,
      });
    } catch (error) {
      console.error('获取测试统计失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取测试统计失败',
        error: error.message,
      });
    }
  });

  // ========== Prompt 模板高级功能 ==========

  // 复制 Prompt 模板
  fastify.post('/prompt-templates/:id/duplicate', async (request, reply) => {
    try {
      const { id } = request.params;
      const { name } = request.body;

      const newTemplate = await promptService.duplicateTemplate(id, name);

      if (!newTemplate) {
        return reply.status(404).send({
          code: -1,
          message: '源模板不存在',
        });
      }

      return reply.send({
        code: 0,
        message: '复制成功',
        data: newTemplate,
      });
    } catch (error) {
      console.error('复制模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '复制模板失败',
        error: error.message,
      });
    }
  });

  // 导出 Prompt 模板
  fastify.get('/prompt-templates/:id/export', async (request, reply) => {
    try {
      const { id } = request.params;
      const template = await promptService.getTemplateById(id);

      if (!template) {
        return reply.status(404).send({
          code: -1,
          message: '模板不存在',
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          name: template.name,
          type: template.type,
          description: template.description,
          systemPrompt: template.systemPrompt,
          userPrompt: template.userPrompt,
          temperature: template.temperature,
          maxTokens: template.maxTokens,
          variables: template.variables,
          version: template.version,
          exportedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('导出模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '导出模板失败',
        error: error.message,
      });
    }
  });

  // 导入 Prompt 模板
  fastify.post('/prompt-templates/import', async (request, reply) => {
    try {
      const data = request.body;

      const template = await promptService.createTemplate({
        name: data.name,
        type: data.type,
        description: data.description,
        systemPrompt: data.systemPrompt,
        userPrompt: data.userPrompt,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        variables: data.variables,
        version: data.version
      });

      return reply.send({
        code: 0,
        message: '导入成功',
        data: template,
      });
    } catch (error) {
      console.error('导入模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '导入模板失败',
        error: error.message,
      });
    }
  });

  // 批量激活/停用 Prompt 模板
  fastify.post('/prompt-templates/batch-toggle', async (request, reply) => {
    try {
      const { ids, isActive } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({
          code: -1,
          message: '请提供模板 ID 数组',
        });
      }

      const results = await promptService.batchToggleTemplateStatus(ids, isActive);

      return reply.send({
        code: 0,
        message: '批量操作完成',
        data: results,
      });
    } catch (error) {
      console.error('批量操作失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '批量操作失败',
        error: error.message,
      });
    }
  });

  // 获取模板使用统计（按类型分组）
  fastify.get('/prompt-templates/usage-stats', async (request, reply) => {
    try {
      const stats = await promptService.getTemplateUsageStats();

      return reply.send({
        code: 0,
        message: 'success',
        data: stats,
      });
    } catch (error) {
      console.error('获取使用统计失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取使用统计失败',
        error: error.message,
      });
    }
  });
};

module.exports = promptApiRoutes;
