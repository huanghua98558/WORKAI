import { NextRequest, NextResponse } from 'next/server';
import { sessionLifecycleService } from '@/lib/services/session-lifecycle-service';

/**
 * 结束会话
 * POST /api/sessions/[id]/end
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
        },
        { status: 400 }
      );
    }

    const result = await sessionLifecycleService.endSession({
      sessionId: id,
      reason: body.reason,
      endedBy: body.endedBy,
      satisfactionScore: body.satisfactionScore,
      satisfactionReason: body.satisfactionReason,
      feedback: body.feedback,
      issueResolved: body.issueResolved,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error === 'Session not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.session,
      message: '会话结束成功',
    });
  } catch (error) {
    console.error('Error in POST /api/sessions/[id]/end:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
