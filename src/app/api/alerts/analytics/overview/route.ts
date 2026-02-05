/**
 * 告警分析接口 - 整体指标和级别分布
 * 路径: /api/alerts/analytics/overview
 */

import { NextRequest, NextResponse } from 'next/server';
const alertAnalytics = require('../../../../../../server/services/alert-analytics.service');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 获取整体统计
    const overall = await alertAnalytics.getOverallStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // 获取告警级别分布
    const levelDistribution = await alertAnalytics.getAlertLevelDistribution(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // 计算总数（用于计算百分比）
    const totalAlerts = parseInt(overall.total_count) || 0;

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        // 整体指标
        total: parseInt(overall.total_count) || 0,
        pending: parseInt(overall.pending_count) || 0,
        handled: parseInt(overall.handled_count) || 0,
        ignored: parseInt(overall.ignored_count) || 0,
        sent: parseInt(overall.sent_count) || 0,
        critical: parseInt(overall.critical_count) || 0,
        warning: parseInt(overall.warning_count) || 0,
        info: parseInt(overall.info_count) || 0,
        escalated: parseInt(overall.escalated_count) || 0,
        avgEscalationCount: parseFloat(overall.avg_escalation_count) || 0,
        maxEscalationCount: parseInt(overall.max_escalation_count) || 0,
        affectedGroups: parseInt(overall.affected_groups) || 0,
        affectedUsers: parseInt(overall.affected_users) || 0,
        affectedChats: parseInt(overall.affected_chats) || 0,
        avgResponseTimeSeconds: parseFloat(overall.avg_response_time_seconds) || 0,

        // 告警级别分布
        levelDistribution: levelDistribution.map(item => ({
          level: item.alert_level,
          count: item.count,
          percentage: item.percentage
        })),

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
    console.error('[告警分析概览] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '获取告警分析概览失败',
      data: null
    }, { status: 500 });
  }
}
