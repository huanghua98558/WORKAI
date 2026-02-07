import { NextRequest, NextResponse } from 'next/server';
import { collaborationDecisionService } from '@/lib/services/collaboration-decision-service';

/**
 * 获取会话的回复状态（基于决策日志）
 * GET /api/sessions/[id]/reply-status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
        },
        { status: 400 }
      );
    }

    // 获取回复状态
    const result = await collaborationDecisionService.getReplyStatus(sessionId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.status,
      stats: {
        totalMessages: Object.keys(result.status || {}).length,
        repliedCount: Object.values(result.status || {}).filter(s => s.isReplied).length,
      },
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
