import { NextRequest, NextResponse } from 'next/server';
import { collaborationDecisionService } from '@/lib/services/collaboration-decision-service';

/**
 * 消息回复状态接口
 */
export interface MessageReplyStatus {
  messageId: string;
  shouldAiReply: boolean;
  aiAction: string;
  staffAction: string;
  replied: boolean;
  replyType: 'ai' | 'staff' | 'none' | 'both';
  repliedAt?: string;
  repliedBy?: string;
  staffType?: string;
  messageType?: string;
  priority?: string;
  reason?: string;
}

/**
 * GET /api/sessions/[id]/reply-status
 * 获取会话中所有消息的回复状态
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const sessionId = params.id;

    // 获取会话的所有决策日志
    const result = await collaborationDecisionService.getDecisionsBySession(sessionId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    // 转换为回复状态格式
    const replyStatuses: MessageReplyStatus[] = (result.decisions || []).map(decision => {
      const replied = decision.aiAction === 'replied' || decision.staffAction === 'replied';
      
      let replyType: MessageReplyStatus['replyType'] = 'none';
      if (decision.aiAction === 'replied' && decision.staffAction === 'replied') {
        replyType = 'both';
      } else if (decision.aiAction === 'replied') {
        replyType = 'ai';
      } else if (decision.staffAction === 'replied') {
        replyType = 'staff';
      }

      return {
        messageId: decision.messageId,
        shouldAiReply: decision.shouldAiReply || false,
        aiAction: decision.aiAction || 'none',
        staffAction: decision.staffAction || 'none',
        replied,
        replyType,
        repliedAt: decision.updatedAt,
        repliedBy: decision.staffAction === 'replied' ? `staff_${decision.staffType || 'unknown'}` : 'ai',
        staffType: decision.staffType || undefined,
        messageType: decision.messageType || undefined,
        priority: decision.priority || undefined,
        reason: decision.reason || undefined,
      };
    });

    // 统计信息
    const stats = {
      total: replyStatuses.length,
      pending: replyStatuses.filter(s => !s.replied).length,
      aiReplied: replyStatuses.filter(s => s.replyType === 'ai').length,
      staffReplied: replyStatuses.filter(s => s.replyType === 'staff').length,
      bothReplied: replyStatuses.filter(s => s.replyType === 'both').length,
      shouldAiReply: replyStatuses.filter(s => s.shouldAiReply).length,
    };

    return NextResponse.json({
      success: true,
      data: replyStatuses,
      stats,
      sessionId,
    });
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]/reply-status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
