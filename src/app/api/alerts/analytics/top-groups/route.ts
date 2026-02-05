/**
 * 告警分析接口 - 群组告警排行
 * 路径: /api/alerts/analytics/top-groups
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

    // 获取群组告警排行
    const topChats = await alertAnalytics.getTopChats(safeDays);

    // 格式化数据
    const formattedGroups = topChats.slice(0, safeLimit).map((chat: any, index: number) => ({
      rank: index + 1,
      groupChatId: chat.group_chat_id,
      groupName: chat.group_name || '未知群组',
      totalAlerts: chat.alert_count,
      criticalAlerts: chat.critical_count,
      escalatedAlerts: chat.escalated_count,
      affectedUsers: chat.affected_users,
      escalationRate: chat.alert_count > 0
        ? ((chat.escalated_count / chat.alert_count) * 100).toFixed(2)
        : '0.00'
    }));

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        groups: formattedGroups,

        // 统计信息
        stats: {
          totalGroups: formattedGroups.length,
          totalAlerts: formattedGroups.reduce((sum: number, g: any) => sum + g.totalAlerts, 0),
          totalCritical: formattedGroups.reduce((sum: number, g: any) => sum + g.criticalAlerts, 0),
          totalEscalated: formattedGroups.reduce((sum: number, g: any) => sum + g.escalatedAlerts, 0),
          totalAffectedUsers: formattedGroups.reduce((sum: number, g: any) => sum + g.affectedUsers, 0)
        },

        // 时间范围
        timeRange: `${safeDays}天`,

        // 时间戳
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[告警群组排行] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取告警群组排行失败',
      data: null
    }, { status: 500 });
  }
}
