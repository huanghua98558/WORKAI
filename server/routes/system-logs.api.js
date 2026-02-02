/**
 * System Logs API 路由
 * 提供系统日志查询和清理接口
 */

const systemLogsApiRoutes = async function (fastify, options) {
  const systemLogger = require('../services/system-logger.service');

  /**
   * 获取系统日志
   */
  fastify.get('/system-logs', async (request, reply) => {
    try {
      const { level, module, limit = 100, offset = 0, days = 7 } = request.query;

      // 时间范围过滤
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - days);

      const logs = await systemLogger.getDatabaseLogs({
        level,
        module,
        limit: parseInt(limit),
        offset: parseInt(offset),
        startTime: startTime.toISOString()
      });

      // 获取统计信息
      const stats = await systemLogger.getStats(parseInt(days));

      return {
        success: true,
        data: logs,
        stats,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: logs.length
        }
      };
    } catch (error) {
      console.error('获取系统日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 清理旧日志
   */
  fastify.delete('/system-logs', async (request, reply) => {
    try {
      const { days = 30 } = request.query;

      const deletedCount = await systemLogger.cleanup(parseInt(days));

      return {
        success: true,
        deletedCount
      };
    } catch (error) {
      console.error('清理日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

module.exports = systemLogsApiRoutes;
