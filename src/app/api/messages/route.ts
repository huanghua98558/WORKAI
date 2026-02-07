import { NextRequest, NextResponse } from 'next/server';
import { messageService } from '@/lib/services/message-service';
import { sessionService } from '@/lib/services/session-service';
import { senderIdentificationService } from '@/lib/services/sender-identification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.robotId || !body.content || !body.senderId || !body.senderType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: robotId, content, senderId, senderType',
        },
        { status: 400 }
      );
    }

    // 识别发送者（如果未提供）
    let senderInfo = body.senderInfo;
    if (!senderInfo) {
      const identificationResult = await senderIdentificationService.identifySender(
        body.senderId,
        body.senderName
      );
      
      if (!identificationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to identify sender: ${identificationResult.error}`,
          },
          { status: 400 }
        );
      }
      
      senderInfo = identificationResult.senderInfo;
    }

    // 获取或创建会话
    let sessionId = body.sessionId;
    if (!sessionId) {
      const sessionResult = await sessionService.getOrCreateSession({
        robotId: body.robotId,
        userId: body.senderId,
        userName: body.senderName,
        sessionType: body.sessionType,
      });

      if (!sessionResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to create/get session: ${sessionResult.error}`,
          },
          { status: 500 }
        );
      }

      sessionId = sessionResult.session!.id;
    }

    // 创建消息
    const messageResult = await messageService.createMessage({
      sessionId,
      robotId: body.robotId,
      content: body.content,
      contentType: body.contentType,
      senderId: body.senderId,
      senderType: body.senderType,
      senderName: body.senderName,
      messageType: body.messageType,
      aiModel: body.aiModel,
      aiProvider: body.aiProvider,
      aiResponseTime: body.aiResponseTime,
      aiTokensUsed: body.aiTokensUsed,
      aiCost: body.aiCost,
      aiConfidence: body.aiConfidence,
      intentRef: body.intentRef,
      intentConfidence: body.intentConfidence,
      emotion: body.emotion,
      emotionScore: body.emotionScore,
      metadata: body.metadata,
    });

    if (!messageResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create message: ${messageResult.error}`,
        },
        { status: 500 }
      );
    }

    // 更新会话统计
    await sessionService.updateSessionStats(sessionId, body.senderType);

    // 记录工作人员介入
    if (senderInfo?.senderType === 'staff' && senderInfo?.staffId) {
      await sessionService.recordStaffIntervention(sessionId, senderInfo.staffId);
    }

    // TODO: 触发AI回复（如果是用户消息）
    // if (body.senderType === 'user' && body.aiEnabled !== false) {
    //   // 调用AI服务生成回复
    // }

    // TODO: 触发介入判断（如果是工作人员消息）
    // if (senderInfo?.senderType === 'staff') {
    //   // 调用介入判断服务
    // }

    return NextResponse.json({
      success: true,
      data: {
        message: messageResult.message,
        sessionId,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params = {
      sessionId: searchParams.get('sessionId') || undefined,
      robotId: searchParams.get('robotId') || undefined,
      senderId: searchParams.get('senderId') || undefined,
      senderType: searchParams.get('senderType') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await messageService.getMessages(params);

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
      data: result.messages,
      pagination: {
        limit: params.limit || 100,
        offset: params.offset || 0,
        count: result.messages.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
