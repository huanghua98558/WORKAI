import { NextRequest, NextResponse } from 'next/server';
import { db, executionTracking, aiIoLogs, sharedSessions } from '@/lib/db';
import { sql, eq, and, gte } from 'drizzle-orm';

/**
 * 获取监控健康状态
 * 直接从数据库获取
 */
export async function GET() {
  try {
    // 获取执行统计（24小时内）
    const execStats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        success: sql<number>`COUNT(*) FILTER (WHERE status = 'success')`,
        error: sql<number>`COUNT(*) FILTER (WHERE status = 'error')`,
        processing: sql<number>`COUNT(*) FILTER (WHERE status = 'processing')`,
      })
      .from(executionTracking)
      .where(gte(executionTracking.createdAt, sql`NOW() - INTERVAL '24 hours'`));

    const execData = execStats[0];
    const successRate = execData.total > 0
      ? ((execData.success / execData.total) * 100).toFixed(2)
      : '0.00';

    // 获取AI统计（24小时内）
    const aiStats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        success: sql<number>`COUNT(*) FILTER (WHERE status = 'success')`,
        error: sql<number>`COUNT(*) FILTER (WHERE status = 'error')`,
      })
      .from(aiIoLogs)
      .where(gte(aiIoLogs.createdAt, sql`NOW() - INTERVAL '24 hours'`));

    const aiData = aiStats[0];
    const aiSuccessRate = aiData.total > 0
      ? ((aiData.success / aiData.total) * 100).toFixed(2)
      : '0.00';

    // 获取活跃会话数（1小时内）
    const sessionStats = await db
      .select({
        active: sql<number>`COUNT(*)`,
      })
      .from(sharedSessions)
      .where(
        and(
          gte(sharedSessions.lastMessageAt, sql`NOW() - INTERVAL '1 hour'`),
          eq(sharedSessions.status, 'auto')
        )
      );

    return NextResponse.json({
      success: true,
      code: 0,
      message: 'Success',
      data: {
        executions: {
          total: Number(execData.total),
          success: Number(execData.success),
          error: Number(execData.error),
          processing: Number(execData.processing),
          successRate
        },
        ai: {
          total: Number(aiData.total),
          success: Number(aiData.success),
          error: Number(aiData.error),
          successRate: aiSuccessRate
        },
        sessions: {
          active: Number(sessionStats[0].active)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get health status error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch health status' },
      { status: 500 }
    );
  }
}
