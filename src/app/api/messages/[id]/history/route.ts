import { NextRequest, NextResponse } from 'next/server';
import { messageService } from '@/lib/services/message-service';

/**
 * 获取消息历史上下文
 * 用于构建AI Prompt，返回当前消息之前的N条历史消息
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 获取参数
    const limit = body.limit ? parseInt(body.limit) : 10;
    const includeSystemMessages = body.includeSystemMessages ?? false;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message ID is required',
        },
        { status: 400 }
      );
    }

    // 先获取当前消息，以确定会话ID和时间戳
    const currentMessageResult = await messageService.getMessageById(id);

    if (!currentMessageResult.success || !currentMessageResult.message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current message not found',
        },
        { status: 404 }
      );
    }

    const currentMessage = currentMessageResult.message;

    // 获取历史消息（当前消息之前的消息）
    const historyResult = await messageService.getMessages({
      sessionId: currentMessage.sessionId,
      limit: limit + 1, // 多获取一条，因为会包含当前消息
    });

    if (!historyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: historyResult.error,
        },
        { status: 500 }
      );
    }

    // 过滤掉当前消息及之后的消息，只保留历史消息
    const allMessages = historyResult.messages || [];
    const currentMessageIndex = allMessages.findIndex((msg) => msg.id === id);

    let historyMessages: any[] = [];

    if (currentMessageIndex > 0) {
      // 获取当前消息之前的历史消息
      historyMessages = allMessages.slice(0, currentMessageIndex);

      // 可选：过滤掉系统消息
      if (!includeSystemMessages) {
        historyMessages = historyMessages.filter(
          (msg) => msg.messageType !== 'system' && msg.messageType !== 'log'
        );
      }

      // 限制返回数量
      historyMessages = historyMessages.slice(-limit);
    }

    // 构建返回数据
    const response = {
      success: true,
      data: {
        currentMessage: {
          id: currentMessage.id,
          content: currentMessage.content,
          senderType: currentMessage.senderType,
          senderId: currentMessage.senderId,
          senderName: currentMessage.senderName,
          createdAt: currentMessage.createdAt,
        },
        historyMessages: historyMessages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          senderType: msg.senderType,
          senderId: msg.senderId,
          senderName: msg.senderName,
          messageType: msg.messageType,
          emotion: msg.emotion,
          emotionScore: msg.emotionScore,
          intentId: msg.intentId,
          intentConfidence: msg.intentConfidence,
          aiModel: msg.aiModel,
          aiProvider: msg.aiProvider,
          createdAt: msg.createdAt,
        })),
        summary: {
          totalHistoryCount: historyMessages.length,
          userMessageCount: historyMessages.filter((msg) => msg.senderType === 'user').length,
          staffMessageCount: historyMessages.filter((msg) => msg.senderType === 'staff').length,
          aiMessageCount: historyMessages.filter((msg) => msg.senderType === 'ai').length,
          lastMessageAt: historyMessages.length > 0 ? historyMessages[historyMessages.length - 1].createdAt : null,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in POST /api/messages/[id]/history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
