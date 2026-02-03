/**
 * 告警增强功能 API
 * 包含分组管理、批量处理、升级和统计分析功能
 */

const alertGroupService = require('../services/alert-group.service');
const alertBatchService = require('../services/alert-batch.service');
const alertEscalationService = require('../services/alert-escalation.service');
const alertAnalyticsService = require('../services/alert-analytics.service');

/**
 * 注册告警增强功能路由
 * @param {FastifyInstance} fastify - Fastify 实例
 */
module.exports = async function (fastify) {
  // ==================== 告警分组管理 ====================

  // 获取所有告警分组
  fastify.get('/alerts/groups', async (request, reply) => {
    try {
      const groups = await alertGroupService.getAllGroups();
      return {
        success: true,
        data: groups,
      };
    } catch (error) {
      console.error('[API] 获取告警分组失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取分组详情
  fastify.get('/alerts/groups/:groupId', async (request, reply) => {
    try {
      const { groupId } = request.params;
      const group = await alertGroupService.getGroupById(groupId);

      if (!group) {
        reply.code(404);
        return {
          success: false,
          error: '分组不存在',
        };
      }

      return {
        success: true,
        data: group,
      };
    } catch (error) {
      console.error('[API] 获取分组详情失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取分组统计
  fastify.get('/alerts/groups/:groupId/stats', async (request, reply) => {
    try {
      const { groupId } = request.params;
      const stats = await alertGroupService.getGroupStatistics(groupId);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('[API] 获取分组统计失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取分组趋势
  fastify.get('/alerts/groups/:groupId/trends', async (request, reply) => {
    try {
      const { groupId } = request.params;
      const { days } = request.query;
      const trends = await alertGroupService.getGroupTrends(groupId, parseInt(days) || 7);
      return {
        success: true,
        data: trends,
      };
    } catch (error) {
      console.error('[API] 获取分组趋势失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 创建分组
  fastify.post('/alerts/groups', async (request, reply) => {
    try {
      const groupData = request.body;
      const group = await alertGroupService.createGroup(groupData);
      return {
        success: true,
        data: group,
      };
    } catch (error) {
      console.error('[API] 创建分组失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 更新分组
  fastify.put('/alerts/groups/:groupId', async (request, reply) => {
    try {
      const { groupId } = request.params;
      const groupData = request.body;
      const group = await alertGroupService.updateGroup(groupId, groupData);
      return {
        success: true,
        data: group,
      };
    } catch (error) {
      console.error('[API] 更新分组失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 删除分组
  fastify.delete('/alerts/groups/:groupId', async (request, reply) => {
    try {
      const { groupId } = request.params;
      const result = await alertGroupService.deleteGroup(groupId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 删除分组失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ==================== 批量处理操作 ====================

  // 批量标记已处理
  fastify.post('/alerts/batch/mark-handled', async (request, reply) => {
    try {
      const { filterConditions, handledBy, handledNote } = request.body;

      // 创建批量操作记录
      const batchOp = await alertBatchService.createBatchOperation('mark_handled', filterConditions, handledBy);

      // 执行批量操作
      const result = await alertBatchService.batchMarkHandled(
        filterConditions,
        handledBy,
        handledNote,
        batchOp.id
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 批量标记已处理失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 批量忽略
  fastify.post('/alerts/batch/ignore', async (request, reply) => {
    try {
      const { filterConditions, ignoredBy, ignoredNote } = request.body;

      const batchOp = await alertBatchService.createBatchOperation('ignore', filterConditions, ignoredBy);
      const result = await alertBatchService.batchIgnore(
        filterConditions,
        ignoredBy,
        ignoredNote,
        batchOp.id
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 批量忽略失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 批量删除
  fastify.post('/alerts/batch/delete', async (request, reply) => {
    try {
      const { filterConditions } = request.body;

      const batchOp = await alertBatchService.createBatchOperation('delete', filterConditions, 'system');
      const result = await alertBatchService.batchDelete(filterConditions, batchOp.id);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 批量删除失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 批量升级
  fastify.post('/alerts/batch/escalate', async (request, reply) => {
    try {
      const { filterConditions, escalationLevel, escalateReason, escalatedBy } = request.body;

      const batchOp = await alertBatchService.createBatchOperation('escalate', filterConditions, escalatedBy);
      const result = await alertBatchService.batchEscalate(
        filterConditions,
        escalationLevel,
        escalateReason,
        escalatedBy,
        batchOp.id
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 批量升级失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 批量重新分配
  fastify.post('/alerts/batch/reassign', async (request, reply) => {
    try {
      const { filterConditions, newAssignee, reassignedBy } = request.body;

      const batchOp = await alertBatchService.createBatchOperation('reassign', filterConditions, reassignedBy);
      const result = await alertBatchService.batchReassign(
        filterConditions,
        newAssignee,
        reassignedBy,
        batchOp.id
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 批量重新分配失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取批量操作历史
  fastify.get('/alerts/batch/operations', async (request, reply) => {
    try {
      const { limit, offset } = request.query;
      const operations = await alertBatchService.getBatchOperations(
        parseInt(limit) || 20,
        parseInt(offset) || 0
      );
      return {
        success: true,
        data: operations,
      };
    } catch (error) {
      console.error('[API] 获取批量操作历史失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取批量操作详情
  fastify.get('/alerts/batch/operations/:operationId', async (request, reply) => {
    try {
      const { operationId } = request.params;
      const operation = await alertBatchService.getBatchOperationById(operationId);

      if (!operation) {
        reply.code(404);
        return {
          success: false,
          error: '批量操作不存在',
        };
      }

      return {
        success: true,
        data: operation,
      };
    } catch (error) {
      console.error('[API] 获取批量操作详情失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取批量操作影响的告警列表
  fastify.get('/alerts/batch/operations/:operationId/alerts', async (request, reply) => {
    try {
      const { operationId } = request.params;
      const alerts = await alertBatchService.getBatchOperationAlerts(operationId);
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      console.error('[API] 获取批量操作告警列表失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ==================== 告警升级管理 ====================

  // 检查并执行告警升级
  fastify.post('/alerts/:alertId/escalate', async (request, reply) => {
    try {
      const { alertId } = request.params;
      const result = await alertEscalationService.checkAndEscalate(alertId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 告警升级失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 手动升级告警
  fastify.post('/alerts/:alertId/escalate/manual', async (request, reply) => {
    try {
      const { alertId } = request.params;
      const { level, reason, escalatedBy } = request.body;
      const result = await alertEscalationService.manualEscalate(alertId, level, reason, escalatedBy);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 手动升级告警失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取告警升级历史
  fastify.get('/alerts/:alertId/escalation-history', async (request, reply) => {
    try {
      const { alertId } = request.params;
      const history = await alertEscalationService.getEscalationHistory(alertId);
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      console.error('[API] 获取升级历史失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取升级统计
  fastify.get('/alerts/escalation-stats', async (request, reply) => {
    try {
      const { days } = request.query;
      const stats = await alertEscalationService.getEscalationStats(parseInt(days) || 30);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('[API] 获取升级统计失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取待升级告警列表
  fastify.get('/alerts/pending-escalations', async (request, reply) => {
    try {
      const alerts = await alertEscalationService.getPendingEscalations();
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      console.error('[API] 获取待升级告警失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 批量检查并升级告警（定时任务）
  fastify.post('/alerts/escalations/batch-check', async (request, reply) => {
    try {
      const result = await alertEscalationService.batchCheckEscalations();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[API] 批量检查升级失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ==================== 统计分析功能 ====================

  // 获取总体统计
  fastify.get('/alerts/analytics/overall', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      const stats = await alertAnalyticsService.getOverallStats(startDate, endDate);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('[API] 获取总体统计失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取每日趋势
  fastify.get('/alerts/analytics/daily-trends', async (request, reply) => {
    try {
      const { days } = request.query;
      const trends = await alertAnalyticsService.getDailyTrends(parseInt(days) || 30);
      return {
        success: true,
        data: trends,
      };
    } catch (error) {
      console.error('[API] 获取每日趋势失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取小时趋势
  fastify.get('/alerts/analytics/hourly-trends', async (request, reply) => {
    try {
      const { date } = request.query;
      const trends = await alertAnalyticsService.getHourlyTrends(date);
      return {
        success: true,
        data: trends,
      };
    } catch (error) {
      console.error('[API] 获取小时趋势失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取分组统计
  fastify.get('/alerts/analytics/by-group', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      const stats = await alertAnalyticsService.getGroupStats(startDate, endDate);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('[API] 获取分组统计失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取意图类型统计
  fastify.get('/alerts/analytics/by-intent', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      const stats = await alertAnalyticsService.getIntentTypeStats(startDate, endDate);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('[API] 获取意图类型统计失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取告警级别分布
  fastify.get('/alerts/analytics/alert-level-distribution', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      const distribution = await alertAnalyticsService.getAlertLevelDistribution(startDate, endDate);
      return {
        success: true,
        data: distribution,
      };
    } catch (error) {
      console.error('[API] 获取告警级别分布失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取处理时效分析
  fastify.get('/alerts/analytics/response-time', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      const analysis = await alertAnalyticsService.getResponseTimeAnalysis(startDate, endDate);
      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      console.error('[API] 获取处理时效分析失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取升级统计
  fastify.get('/alerts/analytics/escalation-stats', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      const stats = await alertAnalyticsService.getEscalationStats(startDate, endDate);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('[API] 获取升级统计失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取用户排行
  fastify.get('/alerts/analytics/top-users', async (request, reply) => {
    try {
      const { days } = request.query;
      const topUsers = await alertAnalyticsService.getTopUsers(parseInt(days) || 7);
      return {
        success: true,
        data: topUsers,
      };
    } catch (error) {
      console.error('[API] 获取用户排行失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取群组排行
  fastify.get('/alerts/analytics/top-chats', async (request, reply) => {
    try {
      const { days } = request.query;
      const topChats = await alertAnalyticsService.getTopChats(parseInt(days) || 7);
      return {
        success: true,
        data: topChats,
      };
    } catch (error) {
      console.error('[API] 获取群组排行失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 获取完整分析报告
  fastify.get('/alerts/analytics/report', async (request, reply) => {
    try {
      const { days } = request.query;
      const report = await alertAnalyticsService.getAnalyticsReport(parseInt(days) || 7);
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      console.error('[API] 获取分析报告失败:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });
};
