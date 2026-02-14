/**
 * 监控接口 - 今日摘要
 * 路径: /api/monitoring/summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 获取数据库连接
    const db = await getDb();

    // 获取今日消息统计
    const todayStatsQuery = sql`
      SELECT 
        COUNT(*) as "totalMessages",
        COUNT(DISTINCT session_id) as "totalSessions",
        COUNT(DISTINCT user_id) as "activeUsers",
        COUNT(DISTINCT group_ref) as "activeGroups"
      FROM session_messages
      WHERE timestamp >= CURRENT_DATE
    `;

    const todayStats = await db.execute(todayStatsQuery);
    const stats = todayStats.rows[0] || {};

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        date: new Date().toISOString().split('T')[0],
        executions: {
          total: parseInt(stats.totalMessages as string) || 0,
          success: parseInt(stats.totalMessages as string) || 0,
          error: 0,
          processing: 0,
          successRate: '100.00'
        },
        ai: {
          total: 0,
          success: 0,
          error: 0,
          successRate: '0.00'
        },
        sessions: {
          active: parseInt(stats.totalSessions as string) || 0,
          total: parseInt(stats.totalSessions as string) || 0
        },
        activeUsers: parseInt(stats.activeUsers as string) || 0,
        activeGroups: parseInt(stats.activeGroups as string) || 0,
        totalCallbacks: parseInt(stats.totalMessages as string) || 0,
        aiSuccessRate: '0.00',
        systemMetrics: {
          callbackReceived: parseInt(stats.totalMessages as string) || 0,
          callbackProcessed: parseInt(stats.totalMessages as string) || 0,
          callbackError: 0,
          aiRequests: 0,
          aiErrors: 0
        },
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[监控摘要] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取监控摘要失败',
      data: null
    }, { status: 500 });
  }
}
