import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取活跃会话列表（合并sessions表和execution_tracking表）
 * 确保显示所有会话数据，包括原来的数据和新的执行记录
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // 1. 从sessions表获取会话
    const sessionsUrl = new URL(`${BACKEND_URL}/api/admin/sessions/active`);
    sessionsUrl.searchParams.append('limit', limit.toString());

    const sessionsRes = await fetch(sessionsUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const sessionsData = sessionsRes.ok && (await sessionsRes.json());
    const oldSessions = sessionsData?.success ? sessionsData.data || [] : [];

    // 2. 从execution_tracking表获取会话
    const executionsUrl = new URL(`${BACKEND_URL}/api/monitoring/executions`);
    executionsUrl.searchParams.append('limit', '200'); // 获取更多记录

    const executionsRes = await fetch(executionsUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const executionsData = executionsRes.ok && (await executionsRes.json());
    const executions = executionsData?.code === 0 ? executionsData.data || [] : [];

    // 3. 转换执行记录为会话格式
    const sessionMap = new Map();

    // 先添加旧数据
    oldSessions.forEach((session: any) => {
      sessionMap.set(session.sessionId, {
        ...session,
        _source: 'sessions', // 标记数据来源
      });
    });

    // 再添加执行记录中的会话（如果不存在则添加，如果存在则更新）
    executions.forEach((execution: any) => {
      const sessionId = execution.sessionId;
      const userMessage = execution.steps?.user_message;

      const newSession = {
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
        _source: 'execution_tracking', // 标记数据来源
      };

      // 如果会话已存在，比较lastActiveTime，保留最新的
      const existing = sessionMap.get(sessionId);
      if (!existing) {
        sessionMap.set(sessionId, newSession);
      } else if (newSession.lastActiveTime > existing.lastActiveTime) {
        sessionMap.set(sessionId, newSession);
      }
    });

    // 4. 转换为数组并排序
    const allSessions = Array.from(sessionMap.values());
    allSessions.sort((a: any, b: any) =>
      new Date(b.lastActiveTime).getTime() - new Date(a.lastActiveTime).getTime()
    );

    // 5. 限制返回数量
    const sessions = allSessions.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: sessions,
      total: allSessions.length,
      fromSessions: oldSessions.length,
      fromExecutions: executions.length,
    });
  } catch (error) {
    console.error('Get all sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
