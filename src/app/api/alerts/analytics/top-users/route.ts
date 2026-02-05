/**
 * 告警分析接口 - 用户告警排行
 * 路径: /api/alerts/analytics/top-users
 */

import { NextRequest, NextResponse } from 'next/server';
const alertAnalytics = require('../../../../../../server/services/alert-analytics.service');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get('days');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 解析天数
    let days = 7;
    if (daysParam) {
      days = parseInt(daysParam);
    }

    // 限制范围
    const safeDays = Math.min(Math.max(days, 1), 365);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // 获取用户告警排行
    const topUsers = await alertAnalytics.getTopUsers(safeDays);

    // 格式化数据
    const formattedUsers = topUsers.slice(0, safeLimit).map((user: any, index: number) => ({
      rank: index + 1,
      userId: user.user_id,
      userName: user.user_name || '未知用户',
      totalAlerts: user.alert_count,
      criticalAlerts: user.critical_count,
      escalatedAlerts: user.escalated_count,
      escalationRate: user.alert_count > 0
        ? ((user.escalated_count / user.alert_count) * 100).toFixed(2)
        : '0.00'
    }));

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        users: formattedUsers,

        // 统计信息
        stats: {
          totalUsers: formattedUsers.length,
          totalAlerts: formattedUsers.reduce((sum: number, u: any) => sum + u.totalAlerts, 0),
          totalCritical: formattedUsers.reduce((sum: number, u: any) => sum + u.criticalAlerts, 0),
          totalEscalated: formattedUsers.reduce((sum: number, u: any) => sum + u.escalatedAlerts, 0)
        },

        // 时间范围
        timeRange: `${safeDays}天`,

        // 时间戳
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[告警用户排行] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取告警用户排行失败',
      data: null
    }, { status: 500 });
  }
}
