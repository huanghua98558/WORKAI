import { NextRequest, NextResponse } from 'next/server';
import { db, aiIoLogs } from '@/lib/db';
import { desc } from 'drizzle-orm';

/**
 * 获取AI日志
 * 直接从数据库获取
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // 获取AI日志
    const aiLogs = await db
      .select()
      .from(aiIoLogs)
      .orderBy(desc(aiIoLogs.createdAt))
      .limit(limit);

    // 转换数据格式
    const formattedLogs = aiLogs.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      messageId: row.messageId,
      robotId: row.robotId,
      robotName: row.robotName,
      operationType: row.operationType,
      aiInput: row.aiInput,
      aiOutput: row.aiOutput,
      modelId: row.modelId,
      status: row.status,
      errorMessage: row.errorMessage,
      requestDuration: row.requestDuration,
      createdAt: row.createdAt,
      totalTokens: row.totalTokens,
    }));

    return NextResponse.json({
      success: true,
      code: 0,
      message: 'Success',
      data: formattedLogs
    });
  } catch (error) {
    console.error('Get AI logs error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch AI logs' },
      { status: 500 }
    );
  }
}
