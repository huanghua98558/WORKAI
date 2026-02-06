import { NextRequest, NextResponse } from 'next/server';
const { getDb } = require('coze-coding-dev-sdk');
const { ai_io_logs, robots } = require('@/../server/database/schema');
const { and, gte, lte, eq, desc } = require('drizzle-orm');

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 计算今天、昨天、本月的日期范围（UTC）
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

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

    // 查询今日机器人消耗统计
    const todayRobotStats: Record<string, any> = {};
    todayLogs.forEach((log: any) => {
      const robotId = log.robotId || 'unknown';
      if (!todayRobotStats[robotId]) {
        todayRobotStats[robotId] = {
          robotId,
          robotName: log.robotName || '未知机器人',
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          count: 0
        };
      }
      todayRobotStats[robotId].totalTokens += log.totalTokens || 0;
      todayRobotStats[robotId].inputTokens += log.inputTokens || 0;
      todayRobotStats[robotId].outputTokens += log.outputTokens || 0;
      todayRobotStats[robotId].count += 1;
    });

    // 转换为数组并按消耗排序
    const robotStatsArray = Object.values(todayRobotStats)
      .sort((a: any, b: any) => b.totalTokens - a.totalTokens)
      .slice(0, 5);

    // 统计数据
    const todayTotal = todayLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);
    const todayInput = todayLogs.reduce((sum: number, log: any) => sum + (log.inputTokens || 0), 0);
    const todayOutput = todayLogs.reduce((sum: number, log: any) => sum + (log.outputTokens || 0), 0);

    const yesterdayTotal = yesterdayLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);

    const monthTotal = monthLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0);
    const monthInput = monthLogs.reduce((sum: number, log: any) => sum + (log.inputTokens || 0), 0);
    const monthOutput = monthLogs.reduce((sum: number, log: any) => sum + (log.outputTokens || 0), 0);

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        // 今日统计
        today: {
          total: todayTotal,
          input: todayInput,
          output: todayOutput,
          record_count: todayLogs.length
        },
        // 昨日统计
        yesterday: {
          total: yesterdayTotal
        },
        // 本月统计
        month: {
          total: monthTotal,
          input: monthInput,
          output: monthOutput,
          record_count: monthLogs.length
        },
        // 机器人消耗排名
        robot_stats: robotStatsArray
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
