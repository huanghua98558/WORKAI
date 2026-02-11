import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiIoLogs } from '@/storage/database/shared/schema';
import { desc, eq, and, like } from 'drizzle-orm';

/**
 * GET /api/monitoring/ai-logs
 * 获取AI调用日志列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;
    const status = searchParams.get('status');
    const sessionId = searchParams.get('sessionId');

    console.log('[监控] 查询AI日志，limit:', limit, 'status:', status, 'sessionId:', sessionId);

    // 构建查询条件
    const conditions = [];

    if (status) {
      conditions.push(eq(aiIoLogs.status, status));
    }

    if (sessionId) {
      conditions.push(eq(aiIoLogs.sessionId, sessionId));
    }

    // 查询AI调用日志
    const logs = await db
      .select()
      .from(aiIoLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiIoLogs.createdAt))
      .limit(limit);

    console.log('[监控] 查询到', logs.length, '条AI日志');

    // 转换数据格式
    const result = logs.map((log: any) => ({
      id: log.id,
      sessionId: log.sessionId,
      messageId: log.messageId,
      robotId: log.robotId,
      robotName: log.robotName,
      operationType: log.operationType || 'unknown',
      aiInput: log.aiInput,
      aiOutput: log.aiOutput,
      modelId: log.modelId,
      status: log.status,
      errorMessage: log.errorMessage,
      requestDuration: log.requestDuration,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    }));

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('[监控] 获取AI日志失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: '获取AI日志失败',
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
