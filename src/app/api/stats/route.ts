import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, sessions } from '@/storage/database/new-schemas/index';
import { and, eq, gte, lte, count, sql, between } from 'drizzle-orm';

/**
 * 获取统计数据
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const robotId = searchParams.get('robotId') || undefined;

    const conditions = [];

    if (robotId) {
      conditions.push(eq(messages.robotId, robotId));
    }

    if (startDate && endDate) {
      conditions.push(
        between(messages.createdAt, new Date(startDate), new Date(endDate))
      );
    } else if (startDate) {
      conditions.push(gte(messages.createdAt, new Date(startDate)));
    } else if (endDate) {
      conditions.push(lte(messages.createdAt, new Date(endDate)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [
      messageStats,
      sessionStats,
      aiResponseStats,
      dailyStats,
    ] = await Promise.all([
      // 消息总数
      db
        .select({ count: count() })
        .from(messages)
        .where(where),

      // 会话总数
      db
        .select({ count: count() })
        .from(sessions)
        .where(conditions.length > 0 ? and(...conditions.slice(0, -1)) : undefined),

      // AI回复统计
      db
        .select({
          total: count(),
        })
        .from(messages)
        .where(
          and(
            where,
            eq(messages.senderType, 'ai')
          )
        ),

      // 每日消息趋势（最近7天）
      db
        .select({
          date: sql<string>`date_trunc('day', ${messages.createdAt})`,
          count: count(),
        })
        .from(messages)
        .where(where)
        .groupBy(sql`date_trunc('day', ${messages.createdAt})`)
        .orderBy(sql`date_trunc('day', ${messages.createdAt})`)
        .limit(30),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        messages: {
          total: messageStats[0]?.count || 0,
        },
        sessions: {
          total: sessionStats[0]?.count || 0,
        },
        aiResponses: {
          total: aiResponseStats[0]?.total || 0,
        },
        dailyTrends: dailyStats,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
