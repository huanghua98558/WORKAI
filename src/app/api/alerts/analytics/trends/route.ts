/**
 * 告警分析接口 - 每日趋势
 * 路径: /api/alerts/analytics/trends
 * 支持参数: timeRange=7d|30d|90d, days=数字
 */

import { NextRequest, NextResponse } from 'next/server';
const alertAnalytics = require('../../../../../../server/services/alert-analytics.service');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '7d';
    const daysParam = searchParams.get('days');

    // 解析时间范围
    let days = 7;
    if (daysParam) {
      days = parseInt(daysParam);
    } else if (timeRange) {
      const match = timeRange.match(/^(\d+)d$/);
      if (match) {
        days = parseInt(match[1]);
      }
    }

    // 限制最大天数为365天
    days = Math.min(Math.max(days, 1), 365);

    // 获取每日趋势数据
    const trends = await alertAnalytics.getDailyTrends(days);

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        timeRange: `${days}天`,
        trends: trends.map((item: any) => ({
          date: item.date,
          total: item.total_count,
          pending: item.pending_count,
          handled: item.handled_count,
          critical: item.critical_count,
          warning: item.warning_count,
          info: item.info_count,
          escalated: item.escalated_count,
          avgResponseTimeSeconds: item.avg_response_time_seconds
        })),

        // 统计信息
        stats: {
          totalDays: trends.length,
          totalAlerts: trends.reduce((sum: number, item: any) => sum + item.total_count, 0),
          avgPerDay: trends.length > 0
            ? Math.round(trends.reduce((sum: number, item: any) => sum + item.total_count, 0) / trends.length)
            : 0,
          maxDay: trends.length > 0
            ? trends.reduce((max: any, item: any) => item.total_count > max.total_count ? item : max)
            : null
        },

        // 时间戳
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[告警分析趋势] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取告警趋势失败',
      data: null
    }, { status: 500 });
  }
}
