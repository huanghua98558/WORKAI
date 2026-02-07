import { NextRequest, NextResponse } from 'next/server';
import { db, sharedSessions, messages } from '@/lib/db';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * 获取活跃会话列表
 * 直接从数据库获取，确保与监控页面使用相同的数据源
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // 获取最近的会话
    const activeSessions = await db
      .select({
        sessionId: sharedSessions.sessionId,
        userId: sharedSessions.userId,
        groupId: sharedSessions.groupId,
        userName: sharedSessions.userName,
        groupName: sharedSessions.groupName,
        status: sharedSessions.status,
        lastActiveTime: sharedSessions.lastMessageAt,
        messageCount: sharedSessions.messageCount,
        robotId: sharedSessions.robotId,
        robotName: sharedSessions.robotName,
      })
      .from(sharedSessions)
      .where(sql`${sharedSessions.lastMessageAt} IS NOT NULL AND ${sharedSessions.lastMessageAt} > NOW() - INTERVAL '7 days'`)
      .orderBy(desc(sharedSessions.lastMessageAt))
      .limit(limit);

    // 获取每个会话的最新消息
    const sessionsWithMessages = await Promise.all(
      activeSessions.map(async (session) => {
        const lastMessage = await db
          .select({ content: messages.content })
          .from(messages)
          .where(eq(messages.sessionId, session.sessionId))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          ...session,
          status: session.status === 'auto' ? 'auto' : 'human',
          lastMessage: lastMessage[0]?.content || '暂无消息',
          lastActiveTime: session.lastActiveTime || new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: sessionsWithMessages,
      total: sessionsWithMessages.length
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch active sessions' },
      { status: 500 }
    );
  }
}
