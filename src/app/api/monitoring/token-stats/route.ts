import { NextRequest, NextResponse } from 'next/server';
const { getDb } = require('coze-coding-dev-sdk');
const { ai_io_logs, robots } = require('@/../server/database/schema');
const { and, gte, lte, eq, desc } = require('drizzle-orm');

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 计算今天、昨天、本月、上月的日期范围（UTC）
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    // 查询今天的Token使用情况
    const todayLogs = await db
      .select()
      .from(ai_io_logs)
      .where(
        and(
          gte(ai_io_logs.createdAt, todayStart),
          lte(ai_io_logs.createdAt, todayEnd)
        )
      );

    // 查询昨天的Token使用情况
    const yesterdayLogs = await db
      .select()
      .from(ai_io_logs)
      .where(
        and(
          gte(ai_io_logs.createdAt, yesterdayStart),
          lte(ai_io_logs.createdAt, yesterdayEnd)
        )
      );

    // 查询本月的Token使用情况
    const monthLogs = await db
      .select()
      .from(ai_io_logs)
      .where(
        and(
          gte(ai_io_logs.createdAt, monthStart),
          lte(ai_io_logs.createdAt, monthEnd)
        )
      );

    // 查询上月的Token使用情况
    const lastMonthLogs = await db
      .select()
      .from(ai_io_logs)
      .where(
        and(
          gte(ai_io_logs.createdAt, lastMonthStart),
          lte(ai_io_logs.createdAt, lastMonthEnd)
        )
      );

    // 统计数据
    const todayTotal = todayLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);
    const yesterdayTotal = yesterdayLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);
    const monthTotal = monthLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);
    const lastMonthTotal = lastMonthLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        today: {
          total: todayTotal,
          input: todayLogs.reduce((sum: number, log: any) => sum + (log.inputTokens || 0), 0),
          output: todayLogs.reduce((sum: number, log: any) => sum + (log.outputTokens || 0), 0),
          record_count: todayLogs.length
        },
        yesterday: {
          total: yesterdayTotal
        },
        month: {
          total: monthTotal,
          record_count: monthLogs.length
        },
        lastMonth: {
          total: lastMonthTotal,
          record_count: lastMonthLogs.length
        }
      }
    });
  } catch (error) {
    console.error('Token stats API error:', error);
    return NextResponse.json(
      {
        code: -1,
        message: '获取Token统计失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
