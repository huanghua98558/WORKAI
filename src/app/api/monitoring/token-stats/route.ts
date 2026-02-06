import { NextRequest, NextResponse } from 'next/server';
const { getDb } = require('coze-coding-dev-sdk');
const { ai_io_logs } = require('@/../server/database/schema');
const { and, gte, lte } = require('drizzle-orm');

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 计算今天和昨天的日期范围（UTC）
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

    // 统计今天的Token数据
    const todayTotal = todayLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);
    const todayInput = todayLogs.reduce((sum: number, log: any) => sum + (log.inputTokens || 0), 0);
    const todayOutput = todayLogs.reduce((sum: number, log: any) => sum + (log.outputTokens || 0), 0);

    // 统计昨天的Token数据
    const yesterdayTotal = yesterdayLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        today_total: todayTotal,
        today_input: todayInput,
        today_output: todayOutput,
        yesterday_total: yesterdayTotal,
        record_count: todayLogs.length
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
