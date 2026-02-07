import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取会话详情
 * 支持从sessions表或execution_tracking表获取
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // 先尝试从sessions表获取
    const sessionsUrl = new URL(`${BACKEND_URL}/api/admin/sessions/${sessionId}`);
    console.log('[会话详情] 尝试从sessions表获取:', sessionsUrl.toString());
    const sessionsRes = await fetch(sessionsUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[会话详情] sessions表响应:', sessionsRes.ok);
    if (sessionsRes.ok) {
      const data = await sessionsRes.json();
      console.log('[会话详情] sessions表数据:', data);
      if (data.success && data.data) {
        return NextResponse.json(data);
      }
    }

    // 如果sessions表没有，尝试从execution_tracking表获取
    const executionsUrl = new URL(`${BACKEND_URL}/api/monitoring/executions`);
    executionsUrl.searchParams.append('sessionId', sessionId);
    executionsUrl.searchParams.append('limit', '1');

    const executionsRes = await fetch(executionsUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (executionsRes.ok) {
      const data = await executionsRes.json();
      if (data.code === 0 && data.data && data.data.length > 0) {
        const execution = data.data[0];
        const userMessage = execution.steps?.user_message;

        // 转换为会话格式
        const session = {
          sessionId: execution.sessionId,
          userId: userMessage?.userId || execution.userId,
          groupId: userMessage?.groupId || execution.groupId,
          userName: userMessage?.userId || execution.userId || '未知用户',
          groupName: userMessage?.groupId || execution.groupId || '未知群组',
          robotId: execution.robotId,
          robotName: execution.robotName || '未知机器人',
          robotNickname: execution.robotName || null,
          lastMessage: userMessage?.content || '暂无消息',
          isFromUser: true,
          isFromBot: false,
          isHuman: false,
          lastActiveTime: execution.createdAt,
          startTime: execution.createdAt,
          messageCount: 1,
          userMessages: 1,
          aiReplyCount: execution.steps?.ai_response ? 1 : 0,
          humanReplyCount: 0,
          replyCount: execution.steps?.ai_response ? 1 : 0,
          lastIntent: execution.steps?.intent_recognition?.result || null,
          status: execution.status === 'success' || execution.status === 'completed' ? 'auto' : 'human',
          messageHistory: [], // 需要单独加载
        };

        return NextResponse.json({
          success: true,
          data: session,
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Session not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
