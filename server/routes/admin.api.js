/**
 * 管理后台 API 路由
 */

const adminApiRoutes = async function (fastify, options) {
  const config = require('../lib/config');
  const monitorService = require('../services/monitor.service');
  const reportService = require('../services/report.service');
  const sessionService = require('../services/session.service');
  const alertService = require('../services/alert.service');
  const tencentDocService = require('../services/tencentdoc.service');
  const aiService = require('../services/ai.service');
  const worktoolService = require('../services/worktool.service');

  /**
   * 获取系统配置
   */
  fastify.get('/config', async (request, reply) => {
    const safeConfig = {
      version: config.get('version'),
      systemName: config.get('systemName'),
      callback: config.get('callback'),
      ai: {
        intentRecognition: {
          provider: config.get('ai.intentRecognition.provider'),
          model: config.get('ai.intentRecognition.model')
        },
        serviceReply: {
          provider: config.get('ai.serviceReply.provider'),
          model: config.get('ai.serviceReply.model')
        },
        chat: {
          provider: config.get('ai.chat.provider'),
          model: config.get('ai.chat.model')
        }
      },
      autoReply: config.get('autoReply'),
      monitor: config.get('monitor'),
      alert: {
        rules: config.get('alert.rules')
      },
      tencentDoc: {
        enabled: config.get('tencentDoc.enabled')
      }
    };

    return { success: true, data: safeConfig };
  });

  /**
   * 更新系统配置
   */
  fastify.post('/config', async (request, reply) => {
    const { key, value } = request.body;

    try {
      config.set(key, value);
      return { success: true, message: '配置已更新' };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取回调地址
   */
  fastify.get('/callbacks', async (request, reply) => {
    const callbacks = config.getAllCallbackUrls();
    const baseUrl = config.getCallbackBaseUrl();
    
    return {
      success: true,
      data: {
        baseUrl: baseUrl,
        message: baseUrl + '/api/worktool/callback/message',
        actionResult: baseUrl + '/api/worktool/callback/action-result',
        groupQrcode: baseUrl + '/api/worktool/callback/group-qrcode',
        robotStatus: baseUrl + '/api/worktool/callback/robot-status'
      }
    };
  });

  /**
   * 测试回调
   */
  fastify.post('/callbacks/test', async (request, reply) => {
    const { type, payload } = request.body;

    try {
      const callbacks = config.getAllCallbackUrls();
      const callbackUrl = callbacks[type];

      if (!callbackUrl) {
        return reply.status(400).send({
          success: false,
          error: '未知的回调类型'
        });
      }

      const axios = require('axios');
      const response = await axios.post(callbackUrl, payload || {
        message_id: 'test_' + Date.now(),
        from_type: 'user',
        from_id: 'test_user',
        from_name: '测试用户',
        to_type: 'group',
        to_id: 'test_group',
        content: '这是一个测试消息',
        message_type: 'text',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: '回调测试成功',
        response: response.data
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取监控摘要
   */
  fastify.get('/monitor/summary', async (request, reply) => {
    try {
      const summary = await monitorService.getTodaySummary();
      return { success: true, data: summary };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取群活跃度排行
   */
  fastify.get('/monitor/top-groups', async (request, reply) => {
    const { date, limit = 10 } = request.query;

    try {
      const topGroups = await monitorService.getTopActiveGroups(
        date,
        parseInt(limit)
      );
      return { success: true, data: topGroups };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取用户活跃度排行
   */
  fastify.get('/monitor/top-users', async (request, reply) => {
    const { date, limit = 10 } = request.query;

    try {
      const topUsers = await monitorService.getTopActiveUsers(
        date,
        parseInt(limit)
      );
      return { success: true, data: topUsers };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取活跃会话
   */
  fastify.get('/sessions/active', async (request, reply) => {
    const { limit = 50 } = request.query;

    try {
      const sessions = await sessionService.getActiveSessions(parseInt(limit));
      return { success: true, data: sessions };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 人工接管会话
   */
  fastify.post('/sessions/:sessionId/takeover', async (request, reply) => {
    const { sessionId } = request.params;
    const { operator } = request.body;

    try {
      const session = await sessionService.takeOverByHuman(sessionId, operator);
      return { success: true, data: session };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 切换回自动模式
   */
  fastify.post('/sessions/:sessionId/auto', async (request, reply) => {
    const { sessionId } = request.params;

    try {
      const session = await sessionService.switchToAuto(sessionId);
      return { success: true, data: session };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取日终报告
   */
  fastify.get('/reports/:date', async (request, reply) => {
    const { date } = request.params;

    try {
      const report = await reportService.getReport(date);
      if (!report) {
        return reply.status(404).send({
          success: false,
          error: '报告不存在'
        });
      }
      return { success: true, data: report };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 生成日终报告
   */
  fastify.post('/reports/generate', async (request, reply) => {
    const { date } = request.body;

    try {
      const report = await reportService.generateDailyReport(date);
      return { success: true, data: report };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 导出记录为 CSV
   */
  fastify.get('/reports/:date/export', async (request, reply) => {
    const { date } = request.params;
    const filters = request.query;

    try {
      const csv = await reportService.exportToCSV(date, filters);
      
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="records_${date}.csv"`);
      
      return reply.send(csv);
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 写入报告到腾讯文档
   */
  fastify.post('/reports/:date/tencentdoc', async (request, reply) => {
    const { date } = request.params;

    try {
      const docId = await tencentDocService.writeDailyReport(date);
      return { success: true, data: { docId } };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取告警统计
   */
  fastify.get('/alerts/stats', async (request, reply) => {
    const { days = 7 } = request.query;

    try {
      const stats = await alertService.getAlertStats(parseInt(days));
      return { success: true, data: stats };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取告警历史
   */
  fastify.get('/alerts/history', async (request, reply) => {
    const { limit = 50 } = request.query;

    try {
      const alerts = await alertService.getAlertHistory(parseInt(limit));
      return { success: true, data: alerts };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 手动触发告警检查
   */
  fastify.post('/alerts/check', async (request, reply) => {
    try {
      const results = await alertService.checkAllRules();
      return { success: true, data: results };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 检查熔断状态
   */
  fastify.get('/circuit-breaker/status', async (request, reply) => {
    try {
      const isOpen = await alertService.isCircuitBreakerOpen();
      return { success: true, data: { isOpen } };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 重置熔断器
   */
  fastify.post('/circuit-breaker/reset', async (request, reply) => {
    try {
      await alertService.resetCircuitBreaker();
      return { success: true, message: '熔断器已重置' };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 测试腾讯文档连接
   */
  fastify.post('/tencentdoc/test', async (request, reply) => {
    try {
      const result = await tencentDocService.testConnection();
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 健康检查
   */
  fastify.get('/health', async (request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'ok',
        ai: 'ok',
        tencentDoc: config.get('tencentDoc.enabled') ? 'ok' : 'disabled'
      }
    };

    return { success: true, data: health };
  });

  /**
   * 系统信息
   */
  fastify.get('/system/info', async (request, reply) => {
    const info = {
      version: config.get('version'),
      systemName: config.get('systemName'),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };

    return { success: true, data: info };
  });
};

module.exports = adminApiRoutes;
