import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取活跃会话列表（从执行记录转换）
 * 确保Dashboard和主页面使用相同的数据源
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // 从后端获取执行记录
    const url = new URL(`${BACKEND_URL}/api/monitoring/executions`);
    url.searchParams.append('limit', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch executions' },
        { status: response.status }
      );
    }

    // 转换执行记录为会话格式
    const executions = data.data || [];
    const sessionMap = new Map();

    // 按sessionId分组，保留最新的记录
    executions.forEach((execution: any) => {
      const sessionId = execution.sessionId;
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, execution);
      }
    });

    // 转换为会话格式
    const sessions = Array.from(sessionMap.values()).map((execution: any) => {
      const userMessage = execution.steps?.user_message;
      return {
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
      };
    });

    return NextResponse.json({
      success: true,
      data: sessions.slice(0, limit),
    });
  } catch (error) {
    console.error('Get sessions from executions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
