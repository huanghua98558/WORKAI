import { NextRequest, NextResponse } from 'next/server';
import { db, executionTracking, sharedSessions } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';

/**
 * 获取执行记录
 * 直接从数据库获取，包含会话和消息信息
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // 获取执行记录，关联会话信息
    const executions = await db
      .select({
        id: executionTracking.id,
        processingId: executionTracking.processingId,
        robotId: executionTracking.robotId,
        robotName: executionTracking.robotName,
        messageId: executionTracking.messageId,
        sessionId: executionTracking.sessionId,
        userId: executionTracking.userId,
        groupId: executionTracking.groupId,
        status: executionTracking.status,
        steps: executionTracking.steps,
        errorMessage: executionTracking.errorMessage,
        errorStack: executionTracking.errorStack,
        startTime: executionTracking.startTime,
        endTime: executionTracking.endTime,
        processingTime: executionTracking.processingTime,
        decision: executionTracking.decision,
        createdAt: executionTracking.createdAt,
        updatedAt: executionTracking.updatedAt,
        userName: sharedSessions.userName,
        groupName: sharedSessions.groupName,
      })
      .from(executionTracking)
      .leftJoin(sharedSessions, eq(executionTracking.sessionId, sharedSessions.sessionId))
      .orderBy(desc(executionTracking.createdAt))
      .limit(limit);

    // 转换数据格式
    const formattedExecutions = executions.map((row) => ({
      ...row,
      userId: row.userId || row.userName,
      robotId: row.robotId,
      robotName: row.robotName,
      startTime: row.startTime || row.createdAt,
      endTime: row.endTime,
      processingTime: row.processingTime,
      errorMessage: row.errorMessage,
      errorStack: row.errorStack,
      // 从steps中提取消息内容
      messageContent: row.steps?.user_message?.content || '',
    }));

    return NextResponse.json({
      success: true,
      code: 0,
      message: 'Success',
      data: formattedExecutions
    });
  } catch (error) {
    console.error('Get executions error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
