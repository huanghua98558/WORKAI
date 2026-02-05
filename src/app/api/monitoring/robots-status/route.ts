/**
 * 监控接口 - 机器人状态摘要
 * 路径: /api/monitoring/robots-status
 */

import { NextRequest, NextResponse } from 'next/server';
const monitor = require('../../../../../server/services/monitor.service');
const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('../../../../../server/database/schema');

export async function GET(request: NextRequest) {
  try {
    // 获取机器人状态摘要
    const robotsSummary = await monitor.getRobotsSummary();

    // 从数据库获取机器人详细信息（包括状态）
    const db = await getDb();
    const robotDetails = await db
      .select({
        id: robots.id,
        robotId: robots.robotId,
        name: robots.name,
        nickname: robots.nickname,
        status: robots.status,
        isActive: robots.isActive
      })
      .from(robots)
      .where(robots.isActive);

    // 合并数据和状态
    const formattedRobots = robotDetails.map(robot => {
      const summary = robotsSummary.find(s => s.robotId === robot.robotId) || {
        messagesProcessed: 0,
        errors: 0,
        successRate: 100
      };

      return {
        id: robot.id,
        robotId: robot.robotId,
        name: robot.name,
        nickname: robot.nickname || robot.name,
        status: robot.status,
        isActive: robot.isActive,
        messagesProcessed: summary.messagesProcessed,
        errors: summary.errors,
        successRate: parseFloat(summary.successRate),
        // 健康状态判断
        healthStatus: summary.successRate >= 95 ? 'healthy' : summary.successRate >= 80 ? 'warning' : 'critical',
        lastCheckTime: new Date().toISOString()
      };
    });

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        robots: formattedRobots,

        // 统计信息
        stats: {
          totalRobots: formattedRobots.length,
          onlineRobots: formattedRobots.filter(r => r.status === 'online').length,
          offlineRobots: formattedRobots.filter(r => r.status === 'offline').length,
          unknownRobots: formattedRobots.filter(r => r.status === 'unknown').length,
          healthyRobots: formattedRobots.filter(r => r.healthStatus === 'healthy').length,
          warningRobots: formattedRobots.filter(r => r.healthStatus === 'warning').length,
          criticalRobots: formattedRobots.filter(r => r.healthStatus === 'critical').length,
          totalMessages: formattedRobots.reduce((sum, r) => sum + r.messagesProcessed, 0),
          totalErrors: formattedRobots.reduce((sum, r) => sum + r.errors, 0),
          avgSuccessRate: formattedRobots.length > 0
            ? (formattedRobots.reduce((sum, r) => sum + r.successRate, 0) / formattedRobots.length).toFixed(2)
            : '0.00'
        },

        // 时间戳
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[机器人状态] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '获取机器人状态失败',
      data: null
    }, { status: 500 });
  }
}
