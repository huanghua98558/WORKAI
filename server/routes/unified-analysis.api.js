/**
 * Unified Analysis API Routes
 * 
 * 提供统一AI分析服务的API端点
 */

const unifiedAnalysisService = require('../services/unified-analysis.service');

module.exports = async function (fastify, opts) {
  // 统一分析API
  fastify.post('/unified-analysis', async (request, reply) => {
    try {
      const { sessionId, message, robot, options } = request.body;

      // 参数验证
      if (!sessionId) {
        return reply.code(400).send({
          success: false,
          error: '缺少sessionId参数'
        });
      }

      if (!message) {
        return reply.code(400).send({
          success: false,
          error: '缺少message参数'
        });
      }

      if (!robot) {
        return reply.code(400).send({
          success: false,
          error: '缺少robot参数'
        });
      }

      // 执行统一分析
      const analysisResult = await unifiedAnalysisService.analyze(
        sessionId,
        message,
        robot,
        options
      );

      return reply.send({
        success: true,
        data: analysisResult
      });

    } catch (error) {
      console.error('[UnifiedAnalysisAPI] ❌ 统一分析失败:', error);
      console.error('[UnifiedAnalysisAPI] 错误堆栈:', error.stack);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // 快速意图识别
  fastify.post('/analyze-intent', async (request, reply) => {
    try {
      const { sessionId, message, robot } = request.body;

      // 参数验证
      if (!sessionId) {
        return reply.code(400).send({
          success: false,
          error: '缺少sessionId参数'
        });
      }

      if (!message) {
        return reply.code(400).send({
          success: false,
          error: '缺少message参数'
        });
      }

      if (!robot) {
        return reply.code(400).send({
          success: false,
          error: '缺少robot参数'
        });
      }

      // 执行意图识别
      const result = await unifiedAnalysisService.quickAnalyzeIntent(
        sessionId,
        message,
        robot
      );

      return reply.send({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[UnifiedAnalysisAPI] ❌ 意图识别失败:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // 快速情感分析
  fastify.post('/analyze-sentiment', async (request, reply) => {
    try {
      const { sessionId, message, robot } = request.body;

      // 参数验证
      if (!sessionId) {
        return reply.code(400).send({
          success: false,
          error: '缺少sessionId参数'
        });
      }

      if (!message) {
        return reply.code(400).send({
          success: false,
          error: '缺少message参数'
        });
      }

      if (!robot) {
        return reply.code(400).send({
          success: false,
          error: '缺少robot参数'
        });
      }

      // 执行情感分析
      const result = await unifiedAnalysisService.quickAnalyzeSentiment(
        sessionId,
        message,
        robot
      );

      return reply.send({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[UnifiedAnalysisAPI] ❌ 情感分析失败:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // 测试端点
  fastify.get('/test', async (request, reply) => {
    return reply.send({
      success: true,
      message: 'Unified Analysis API is running',
      endpoints: [
        'POST /unified-analysis - 统一分析（意图+情感）',
        'POST /analyze-intent - 快速意图识别',
        'POST /analyze-sentiment - 快速情感分析'
      ]
    });
  });
};
