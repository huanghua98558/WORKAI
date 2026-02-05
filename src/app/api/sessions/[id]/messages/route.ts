import { NextRequest, NextResponse } from 'next/server';
import { messageService } from '@/lib/services/message-service';

/**
 * 获取会话的所有消息
 * 按时间顺序返回，支持分页
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
        },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // 获取参数
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const senderType = searchParams.get('senderType') || undefined;
    const messageType = searchParams.get('messageType') || undefined;
    const includeSystemMessages = searchParams.get('includeSystemMessages') === 'true';

    // 获取会话消息
    const result = await messageService.getMessages({
      sessionId: id,
      limit,
      offset,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    let messages = result.messages || [];

    // 按时间顺序排序（从旧到新）
    messages = messages.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 可选：过滤发送者类型
    if (senderType) {
      messages = messages.filter((msg) => msg.senderType === senderType);
    }

    // 可选：过滤消息类型
    if (messageType) {
      messages = messages.filter((msg) => msg.messageType === messageType);
    }

    // 可选：过滤系统消息
    if (!includeSystemMessages) {
      messages = messages.filter(
        (msg) => msg.messageType !== 'system' && msg.messageType !== 'log'
      );
    }

    // 统计信息
    const summary = {
      totalCount: messages.length,
      userMessageCount: messages.filter((msg) => msg.senderType === 'user').length,
      staffMessageCount: messages.filter((msg) => msg.senderType === 'staff').length,
      aiMessageCount: messages.filter((msg) => msg.senderType === 'ai').length,
      systemMessageCount: messages.filter((msg) => msg.senderType === 'system').length,
      firstMessageAt: messages.length > 0 ? messages[0].createdAt : null,
      lastMessageAt: messages.length > 0 ? messages[messages.length - 1].createdAt : null,
    };

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        limit,
        offset,
        count: messages.length,
        total: summary.totalCount,
      },
      summary,
    });
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]/messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
