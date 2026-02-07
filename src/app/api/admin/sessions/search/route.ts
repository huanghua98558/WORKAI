import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 搜索会话（基于执行记录）
 * 支持按用户名、群组名、消息内容搜索
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // 从执行记录中搜索
    const url = new URL(`${BACKEND_URL}/api/monitoring/executions`);
    url.searchParams.append('limit', '200'); // 获取更多数据进行搜索

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

    const executions = data.data || [];
    const queryLower = query.toLowerCase();

    // 搜索执行记录
    const filteredExecutions = executions.filter((execution: any) => {
      const userMessage = execution.steps?.user_message;
      const userName = userMessage?.userId || execution.userId || '';
      const groupName = userMessage?.groupId || execution.groupId || '';
      const messageContent = userMessage?.content || '';
      const aiResponse = execution.steps?.ai_response?.response || '';

      return (
        userName.toLowerCase().includes(queryLower) ||
        groupName.toLowerCase().includes(queryLower) ||
        messageContent.toLowerCase().includes(queryLower) ||
        aiResponse.toLowerCase().includes(queryLower)
      );
    });

    // 转换为会话格式
    const sessionMap = new Map();
    filteredExecutions.forEach((execution: any) => {
      const sessionId = execution.sessionId;
      if (!sessionMap.has(sessionId)) {
        const userMessage = execution.steps?.user_message;
        sessionMap.set(sessionId, {
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
        });
      }
    });

    const sessions = Array.from(sessionMap.values()).slice(0, limit);

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Search sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search sessions' },
      { status: 500 }
    );
  }
}
