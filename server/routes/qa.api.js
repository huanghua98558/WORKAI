/**
 * QA 问答库 API 路由
 */

const qaService = require('../services/qa.service');

// 认证中间件
const { authMiddleware, requireRole, ROLES } = require('../middleware/auth');

const qaApiRoutes = async function (fastify, options) {
  console.log('[qa.api.js] QA API 路由已加载');

  // 获取所有 QA 问答 - 需要认证
  fastify.get('/qa', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { groupName, isActive, receiverType } = request.query;
      const qaList = await qaService.getAllQAs({ groupName, isActive, receiverType });
      
      return reply.send({
        code: 0,
        message: 'success',
        data: qaList
      });
    } catch (error) {
      console.error('获取 QA 列表失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取 QA 列表失败',
        error: error.message
      });
    }
  });

  // 根据 ID 获取 QA 问答 - 需要认证
  fastify.get('/qa/:id', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const qa = await qaService.getQAById(id);
      
      if (!qa) {
        return reply.status(404).send({
          code: -1,
          message: 'QA 问答不存在'
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: qa
      });
    } catch (error) {
      console.error('获取 QA 问答失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取 QA 问答失败',
        error: error.message
      });
    }
  });

  // 添加 QA 问答 - 需要认证，仅管理员和操作员可操作
  fastify.post('/qa', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const data = request.body;
      const qa = await qaService.addQA(data);
      
      return reply.send({
        code: 0,
        message: '添加成功',
        data: qa
      });
    } catch (error) {
      console.error('添加 QA 问答失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '添加 QA 问答失败',
        error: error.message
      });
    }
  });

  // 更新 QA 问答 - 需要认证
  fastify.put('/qa/:id', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const qa = await qaService.updateQA(id, data);
      
      if (!qa) {
        return reply.status(404).send({
          code: -1,
          message: 'QA 问答不存在'
        });
      }

      return reply.send({
        code: 0,
        message: '更新成功',
        data: qa
      });
    } catch (error) {
      console.error('更新 QA 问答失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '更新 QA 问答失败',
        error: error.message
      });
    }
  });

  // 删除 QA 问答 - 需要认证，仅管理员和操作员可操作
  fastify.delete('/qa/:id', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const qa = await qaService.deleteQA(id);
      
      if (!qa) {
        return reply.status(404).send({
          code: -1,
          message: 'QA 问答不存在'
        });
      }

      return reply.send({
        code: 0,
        message: '删除成功',
        data: qa
      });
    } catch (error) {
      console.error('删除 QA 问答失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '删除 QA 问答失败',
        error: error.message
      });
    }
  });

  // 批量导入 QA 问答
  fastify.post('/qa/batch', async (request, reply) => {
    try {
      const { qaList } = request.body;
      const results = await qaService.batchImportQAs(qaList);
      
      return reply.send({
        code: 0,
        message: '批量导入完成',
        data: results
      });
    } catch (error) {
      console.error('批量导入 QA 问答失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '批量导入 QA 问答失败',
        error: error.message
      });
    }
  });
};

module.exports = qaApiRoutes;
