/**
 * Operation Logs API 路由
 * 提供运营日志查询和清理接口
 */

const operationLogsApiRoutes = async function (fastify, options) {
  const operationLogService = require('../services/operation-log.service');

  /**
   * 获取运营日志列表
   */
  fastify.get('/operation-logs', async (request, reply) => {
    try {
      const { 
        userId, 
        username, 
        module, 
        action, 
        targetId, 
        status, 
        limit = 50, 
        offset = 0,
        startTime,
        endTime
      } = request.query;

      const logs = await operationLogService.getLogs({
        userId,
        username,
        module,
        action,
        targetId,
        status,
        startTime,
        endTime,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        data: logs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: logs.length
        }
      };
    } catch (error) {
      console.error('获取运营日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取运营日志统计
   */
  fastify.get('/operation-logs/stats', async (request, reply) => {
    try {
      const { module, userId, startTime, endTime } = request.query;

      const stats = await operationLogService.getStats({
        module,
        userId,
        startTime,
        endTime
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('获取运营日志统计失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取模块统计
   */
  fastify.get('/operation-logs/module-stats', async (request, reply) => {
    try {
      const { startTime, endTime } = request.query;

      const stats = await operationLogService.getModuleStats({
        startTime,
        endTime
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('获取模块统计失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 根据 targetId 查询日志
   */
  fastify.get('/operation-logs/target/:targetId', async (request, reply) => {
    try {
      const { targetId } = request.params;
      const { targetType, limit = 50 } = request.query;

      const logs = await operationLogService.getLogsByTargetId(
        targetId,
        targetType,
        parseInt(limit)
      );

      return {
        success: true,
        data: logs
      };
    } catch (error) {
      console.error('获取目标日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 根据 userId 查询日志
   */
  fastify.get('/operation-logs/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { limit = 100 } = request.query;

      const logs = await operationLogService.getLogsByUserId(
        userId,
        parseInt(limit)
      );

      return {
        success: true,
        data: logs
      };
    } catch (error) {
      console.error('获取用户日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除单条日志
   */
  fastify.delete('/operation-logs/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const result = await operationLogService.deleteById(id);

      if (result) {
        return {
          success: true,
          message: '日志删除成功'
        };
      } else {
        return reply.status(404).send({
          success: false,
          error: '日志不存在'
        });
      }
    } catch (error) {
      console.error('删除日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 批量删除日志
   */
  fastify.post('/operation-logs/batch-delete', async (request, reply) => {
    try {
      const { ids } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({
          success: false,
          error: '请提供要删除的日志ID列表'
        });
      }

      const deletedCount = await operationLogService.batchDelete(ids);

      return {
        success: true,
        deletedCount,
        message: `成功删除 ${deletedCount} 条日志`
      };
    } catch (error) {
      console.error('批量删除日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 按条件删除日志
   */
  fastify.delete('/operation-logs/by-filters', async (request, reply) => {
    try {
      const { 
        userId, 
        username, 
        module, 
        action, 
        status, 
        startTime,
        endTime
      } = request.query;

      const deletedCount = await operationLogService.deleteByFilters({
        userId,
        username,
        module,
        action,
        status,
        startTime,
        endTime
      });

      return {
        success: true,
        deletedCount,
        message: `成功删除 ${deletedCount} 条日志`
      };
    } catch (error) {
      console.error('按条件删除日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 清空所有日志
   */
  fastify.post('/operation-logs/clear-all', async (request, reply) => {
    try {
      const { confirm } = request.body;

      if (confirm !== true) {
        return reply.status(400).send({
          success: false,
          error: '请确认清空操作（设置 confirm: true）'
        });
      }

      const deletedCount = await operationLogService.clearAll();

      return {
        success: true,
        deletedCount,
        message: `成功清空 ${deletedCount} 条日志`
      };
    } catch (error) {
      console.error('清空日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 清理旧日志
   */
  fastify.delete('/operation-logs', async (request, reply) => {
    try {
      const { days = 90 } = request.query;

      const deletedCount = await operationLogService.cleanup(parseInt(days));

      return {
        success: true,
        deletedCount,
        message: `成功清理 ${deletedCount} 条旧日志（${days}天前）`
      };
    } catch (error) {
      console.error('清理运营日志失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

module.exports = operationLogsApiRoutes;
