/**
 * 机器人监控 API 路由
 * 用于提供机器人监控大屏所需的数据
 */

const robotService = require('../services/robot.service');
const { verifyAuth } = require('../hooks/auth.hook');
const { getLogger } = require('../lib/logger');

const logger = getLogger('ROBOT_MONITORING');

const robotMonitoringRoutes = async function (fastify, options) {
  /**
   * 获取机器人监控数据
   * GET /api/admin/robot-monitoring
   * Query: period=1h|24h|7d|30d
   */
  fastify.get('/robot-monitoring', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
    try {
      const { period = '1h' } = request.query;
      const { user } = request;

      logger.info('[ROBOT_MONITORING] 获取机器人监控数据', {
        period,
        userId: user.id
      });

      // 获取所有机器人
      const robots = await robotService.getAllRobots({});

      // 计算统计数据
      const totalRobots = robots.length;
      const activeRobots = robots.filter(r => r.isActive).length;
      const onlineRobots = robots.filter(r => r.status === 'online').length;
      const offlineRobots = robots.filter(r => r.status === 'offline').length;

      // 构建机器人监控数据
      const robotMonitors = robots.map(robot => {
        const healthScore = robot.status === 'online' ? 95 : 50;
        const successRate = robot.status === 'online' ? 98 : 0;
        const utilizationRate = robot.status === 'online' ? 75 : 0;

        return {
          robot_id: robot.robotId,
          robot_name: robot.name || robot.nickname || '未命名',
          group_name: robot.company,
          is_active: robot.isActive,
          robot_status: robot.status,
          health_score: healthScore,
          success_rate: successRate,
          current_sessions: 0, // TODO: 从数据库获取真实会话数
          max_sessions: 100,
          avg_response_time: robot.status === 'online' ? 500 : 0,
          utilization_rate: utilizationRate,
          health_level: healthScore >= 90 ? '优秀' : healthScore >= 70 ? '良好' : healthScore >= 50 ? '一般' : '差',
          sessionStats: {
            total: 0,
            active: 0,
            completed: 0,
            failed: 0,
            avgDuration: 0
          },
          commandStats: {
            total: 0,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            avgProcessing: 0
          },
          topErrors: []
        };
      });

      const data = {
        robots: robotMonitors,
        stats: {
          totalRobots,
          activeRobots,
          totalSessions: 0, // TODO: 从数据库获取
          activeSessions: 0, // TODO: 从数据库获取
          totalCommands: 0, // TODO: 从数据库获取
          avgHealthScore: robotMonitors.length > 0 
            ? Math.round(robotMonitors.reduce((sum, r) => sum + r.health_score, 0) / robotMonitors.length) 
            : 0,
          avgSuccessRate: robotMonitors.length > 0 
            ? Math.round(robotMonitors.reduce((sum, r) => sum + r.success_rate, 0) / robotMonitors.length) 
            : 0,
          overallUtilization: robotMonitors.length > 0 
            ? Math.round(robotMonitors.reduce((sum, r) => sum + r.utilization_rate, 0) / robotMonitors.length) 
            : 0
        },
        timeRange: {
          start: new Date(Date.now() - getPeriodMs(period)).toISOString(),
          end: new Date().toISOString()
        }
      };

      return reply.send({
        success: true,
        message: 'success',
        data
      });
    } catch (error) {
      logger.error('[ROBOT_MONITORING] 获取机器人监控数据失败', {
        error: error.message,
        stack: error.stack
      });

      return reply.status(500).send({
        success: false,
        message: '获取监控数据失败',
        error: error.message
      });
    }
  });

  /**
   * 获取机器人状态列表
   * GET /api/monitoring/robots-status
   */
  fastify.get('/robots-status', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
    try {
      const robots = await robotService.getAllRobots({});

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          robots: robots,
          stats: {
            total: robots.length,
            active: robots.filter(r => r.isActive).length,
            online: robots.filter(r => r.status === 'online').length,
            offline: robots.filter(r => r.status === 'offline').length
          }
        }
      });
    } catch (error) {
      logger.error('[ROBOT_MONITORING] 获取机器人状态列表失败', {
        error: error.message
      });

      return reply.status(500).send({
        code: -1,
        message: '获取机器人状态列表失败',
        error: error.message
      });
    }
  });
};

/**
 * 获取时间段的毫秒数
 */
function getPeriodMs(period) {
  const periods = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  return periods[period] || 60 * 60 * 1000;
}

module.exports = robotMonitoringRoutes;
