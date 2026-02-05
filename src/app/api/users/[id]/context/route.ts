import { NextRequest, NextResponse } from 'next/server';
import { messageService } from '@/lib/services/message-service';
import { userSessionService } from '@/lib/services/user-session-service';
import { sessionService } from '@/lib/services/session-service';
import { userService } from '@/lib/services/user-service';

/**
 * 获取用户上下文信息
 * GET /api/users/[id]/context
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400 }
      );
    }

    // 获取限制参数
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const includeSessions = searchParams.get('includeSessions') === 'true';

    // 1. 获取用户基本信息
    const userResult = await userService.getUserById(id);
    if (!userResult.success || !userResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // 2. 获取用户会话
    const userSessionResult = await userSessionService.getUserSessionByUserId(id);
    const userSession = userSessionResult.success ? userSessionResult.userSession : null;

    // 3. 获取用户最近的消息记录
    const messagesResult = await messageService.getMessagesByUserId(id, limit);
    const recentMessages = messagesResult.success ? messagesResult.messages || [] : [];

    // 4. 构建上下文数据
    const contextData: any = {
      user: {
        id: userResult.user.id,
        name: userResult.user.name,
        email: userResult.user.email,
        phone: userResult.user.phone,
        role: userResult.user.role,
        createdAt: userResult.user.createdAt,
      },
      userSession: userSession
        ? {
            id: userSession.id,
            status: userSession.status,
            totalMessages: userSession.totalMessages,
            totalDuration: userSession.totalDuration,
            firstMessageAt: userSession.firstMessageAt,
            lastMessageAt: userSession.lastMessageAt,
            createdAt: userSession.createdAt,
          }
        : null,
      recentMessages: recentMessages.map((msg) => ({
        id: msg.id,
        senderType: msg.senderType,
        senderId: msg.senderId,
        content: msg.content,
        messageType: msg.messageType,
        intentId: msg.intentId,
        createdAt: msg.createdAt,
      })),
      statistics: {
        totalMessages: recentMessages.length,
        lastMessageAt:
          recentMessages.length > 0 ? recentMessages[0].createdAt : null,
      },
      retrievedAt: new Date().toISOString(),
    };

    // 5. 可选：包含会话历史
    if (includeSessions && userSession) {
      const sessionsResult = await sessionService.getUserSessionsByUserSessionId(
        userSession.id,
        5
      );
      contextData.recentSessions = sessionsResult.success ? sessionsResult.sessions || [] : [];
    }

    // 6. 可选：包含历史消息（更长的历史记录）
    if (includeHistory) {
      const historyMessagesResult = await messageService.getMessagesByUserId(id, 50);
      contextData.messageHistory =
        historyMessagesResult.success ? historyMessagesResult.messages || [] : [];
    }

    return NextResponse.json({
      success: true,
      data: contextData,
      message: '用户上下文查询成功',
    });
  } catch (error) {
    console.error('Error in GET /api/users/[id]/context:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
