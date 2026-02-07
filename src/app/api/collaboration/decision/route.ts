import { NextRequest, NextResponse } from 'next/server';
import { collaborationDecisionService } from '@/lib/services/collaboration-decision-service';

/**
 * 记录决策日志
 * POST /api/collaboration/decision
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.sessionId || !body.messageId || !body.robotId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId, messageId, robotId',
        },
        { status: 400 }
      );
    }

    // 记录决策
    const result = await collaborationDecisionService.recordDecision({
      sessionId: body.sessionId,
      messageId: body.messageId,
      robotId: body.robotId,
      shouldAiReply: body.shouldAiReply ?? false,
      aiAction: body.aiAction,
      staffAction: body.staffAction,
      priority: body.priority,
      reason: body.reason,
      staffContext: body.staffContext,
      infoContext: body.infoContext,
      strategy: body.strategy,
      staffId: body.staffId,
      staffName: body.staffName,
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

    return NextResponse.json({
      success: true,
      data: result.decision,
    });
  } catch (error) {
    console.error('Error in POST /api/collaboration/decision:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * 更新决策日志
 * PATCH /api/collaboration/decision
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.messageId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: messageId',
        },
        { status: 400 }
      );
    }

    const result = await collaborationDecisionService.updateDecision(
      body.messageId,
      {
        aiAction: body.aiAction,
        staffAction: body.staffAction,
        priority: body.priority,
        reason: body.reason,
      }
    );

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
    });
  } catch (error) {
    console.error('Error in PATCH /api/collaboration/decision:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
