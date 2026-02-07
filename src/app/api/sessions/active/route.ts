import { NextRequest, NextResponse } from 'next/server';
import { db, messages } from '@/lib/db';

/**
 * 获取活跃会话列表
 * 直接从数据库获取，确保与监控页面使用相同的数据源
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // 使用原始SQL查询
    const sessionsResult = await db.execute(`
      SELECT 
        session_id as "sessionId",
        user_id as "userId",
        group_id as "groupId",
        user_name as "userName",
        group_name as "groupName",
        status,
        last_message_at as "lastActiveTime",
        message_count as "messageCount",
        robot_id as "robotId",
        robot_name as "robotName"
      FROM sessions
      ORDER BY last_message_at DESC NULLS LAST
      LIMIT $1
    `, [limit]);

    const sessions = sessionsResult.rows;

    // 获取每个会话的最新消息
    const sessionsWithMessages = await Promise.all(
      sessions.map(async (session: any) => {
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
