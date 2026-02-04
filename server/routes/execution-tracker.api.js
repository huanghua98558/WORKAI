/**
 * 执行追踪 API 路由
 * 提供执行结果追踪的查询接口
 */

const executionTrackerApiRoutes = async function (fastify, options) {
  const executionTrackerService = require('../services/execution-tracker.service');
  const messageProcessingService = require('../services/message-processing.service');

  /**
   * 获取执行统计
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const { timeRange = '24h' } = request.query;
      const stats = await messageProcessingService.getStats(timeRange);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('获取执行统计失败:', error);
      return reply.status(500).send({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * 获取最近执行记录
   */
  fastify.get('/records', async (request, reply) => {
    try {
      const { limit = 50 } = request.query;
      const records = await messageProcessingService.getRecentRecords(parseInt(limit));
      
      return {
        success: true,
        data: records
      };
    } catch (error) {
      console.error('获取执行记录失败:', error);
      return reply.status(500).send({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * 获取执行详情
   */
  fastify.get('/detail/:processingId', async (request, reply) => {
    try {
      const { processingId } = request.params;
      const detail = await executionTrackerService.getProcessingDetail(processingId);
      
      if (!detail) {
        return reply.status(404).send({
          success: false,
          message: '执行记录不存在'
        });
      }
      
      return {
        success: true,
        data: detail
      };
    } catch (error) {
      console.error('获取执行详情失败:', error);
      return reply.status(500).send({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * 搜索执行记录
   */
  fastify.get('/search', async (request, reply) => {
    try {
      const { q, limit = 20 } = request.query;
      
      if (!q) {
        return reply.status(400).send({
          success: false,
          message: '缺少搜索关键词'
        });
      }
      
      const records = await executionTrackerService.searchRecords(q, parseInt(limit));
      
      return {
        success: true,
        data: records
      };
    } catch (error) {
      console.error('搜索执行记录失败:', error);
      return reply.status(500).send({
        success: false,
        message: error.message
      });
    }
  });
};

module.exports = executionTrackerApiRoutes;
