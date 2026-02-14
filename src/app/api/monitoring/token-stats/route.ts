import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 计算今天、昨天、本月、上月的日期范围
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    // 使用原始 SQL 查询
    const todayLogs = await db.execute(sql`
      SELECT COALESCE(SUM(total_tokens), 0) as total,
             COALESCE(SUM(input_tokens), 0) as input,
             COALESCE(SUM(output_tokens), 0) as output,
             COUNT(*) as count
      FROM ai_io_logs
      WHERE created_at >= ${todayStart.toISOString()} AND created_at < ${todayEnd.toISOString()}
    `);

    const yesterdayLogs = await db.execute(sql`
      SELECT COALESCE(SUM(total_tokens), 0) as total
      FROM ai_io_logs
      WHERE created_at >= ${yesterdayStart.toISOString()} AND created_at < ${yesterdayEnd.toISOString()}
    `);

    const monthLogs = await db.execute(sql`
      SELECT COALESCE(SUM(total_tokens), 0) as total, COUNT(*) as count
      FROM ai_io_logs
      WHERE created_at >= ${monthStart.toISOString()} AND created_at < ${monthEnd.toISOString()}
    `);

    const lastMonthLogs = await db.execute(sql`
      SELECT COALESCE(SUM(total_tokens), 0) as total, COUNT(*) as count
      FROM ai_io_logs
      WHERE created_at >= ${lastMonthStart.toISOString()} AND created_at < ${lastMonthEnd.toISOString()}
    `);

    const today = todayLogs.rows[0] || { total: 0, input: 0, output: 0, count: 0 };
    const yesterday = yesterdayLogs.rows[0] || { total: 0 };
    const month = monthLogs.rows[0] || { total: 0, count: 0 };
    const lastMonth = lastMonthLogs.rows[0] || { total: 0, count: 0 };

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        today: {
          total: parseInt(today.total as string) || 0,
          input: parseInt(today.input as string) || 0,
          output: parseInt(today.output as string) || 0,
          record_count: parseInt(today.count as string) || 0
        },
        yesterday: {
          total: parseInt(yesterday.total as string) || 0
        },
        month: {
          total: parseInt(month.total as string) || 0,
          record_count: parseInt(month.count as string) || 0
        },
        lastMonth: {
          total: parseInt(lastMonth.total as string) || 0,
          record_count: parseInt(lastMonth.count as string) || 0
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
