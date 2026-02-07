import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取会话的消息记录
 * 从execution_tracking表中获取该session的所有执行记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // 从execution_tracking表获取该session的所有记录
    const url = new URL(`${BACKEND_URL}/api/monitoring/executions`);
    url.searchParams.append('sessionId', sessionId);
    url.searchParams.append('limit', '100'); // 获取更多历史记录

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: response.status }
      );
    }

    const executions = data.data || [];

    // 转换为消息格式
    const messages = executions.map((execution: any) => {
      const userMessage = execution.steps?.user_message;
      const aiResponse = execution.steps?.ai_response;

      return {
        id: execution.id,
        sessionId: execution.sessionId,
        userId: userMessage?.userId || execution.userId,
        userName: userMessage?.userId || execution.userId || '未知用户',
        groupId: userMessage?.groupId || execution.groupId,
        groupName: userMessage?.groupId || execution.groupId || '未知群组',
        robotId: execution.robotId,
        robotName: execution.robotName || '未知机器人',
        content: userMessage?.content || '',
        aiResponse: aiResponse?.response || '',
        intent: execution.steps?.intent_recognition?.result || null,
        status: execution.status,
        errorMessage: execution.errorMessage,
        startTime: execution.createdAt,
        endTime: execution.endTime,
        duration: execution.processingTime,
        decision: execution.decision,
        isFromUser: true,
        isFromAi: !!aiResponse,
      };
    });

    // 按时间升序排列
    messages.sort((a: any, b: any) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return NextResponse.json({
      success: true,
      data: messages,
      total: messages.length,
    });
  } catch (error) {
    console.error('Get session messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session messages' },
      { status: 500 }
    );
  }
}
