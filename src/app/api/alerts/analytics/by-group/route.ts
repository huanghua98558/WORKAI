/**
 * 告警分析接口 - 分组统计和排行
 * 路径: /api/alerts/analytics/by-group
 */

import { NextRequest, NextResponse } from 'next/server';
const alertAnalytics = require('../../../../../../server/services/alert-analytics.service');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 限制最大数量
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // 获取分组统计
    const groupStats = await alertAnalytics.getGroupStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // 获取Top群组排行
    const topChats = await alertAnalytics.getTopChats(7); // 默认7天

    // 格式化分组数据
    const formattedGroupStats = groupStats.map((group: any) => ({
      id: group.id,
      name: group.group_name,
      code: group.group_code,
      color: group.group_color,
      total: parseInt(group.total_count) || 0,
      pending: parseInt(group.pending_count) || 0,
      handled: parseInt(group.handled_count) || 0,
      critical: parseInt(group.critical_count) || 0,
      warning: parseInt(group.warning_count) || 0,
      info: parseInt(group.info_count) || 0,
      escalated: parseInt(group.escalated_count) || 0,
      avgEscalationCount: parseFloat(group.avg_escalation_count) || 0,
      avgResponseTimeSeconds: parseFloat(group.avg_response_time_seconds) || 0
    }));

    // 格式化Top群组排行
    const formattedTopChats = topChats.slice(0, safeLimit).map((chat: any, index: number) => ({
      rank: index + 1,
      groupChatId: chat.group_chat_id,
      groupName: chat.group_name,
      totalAlerts: chat.alert_count,
      criticalAlerts: chat.critical_count,
      escalatedAlerts: chat.escalated_count,
      affectedUsers: chat.affected_users
    }));

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        // 分组统计列表
        groups: formattedGroupStats,

        // Top群组排行
        topGroups: formattedTopChats,

        // 统计信息
        stats: {
          totalGroups: formattedGroupStats.length,
          activeGroups: formattedGroupStats.filter((g: any) => g.total > 0).length,
          totalAlerts: formattedGroupStats.reduce((sum: number, g: any) => sum + g.total, 0)
        },

        // 时间范围
        dateRange: {
          startDate: startDate || 'default',
          endDate: endDate || 'now'
        },

        // 时间戳
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[告警分组分析] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取告警分组分析失败',
      data: null
    }, { status: 500 });
  }
}
