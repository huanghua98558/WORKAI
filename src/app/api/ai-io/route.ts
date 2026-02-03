import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * GET - 获取实时 AI 输入输出
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    // 转发请求到后端
    const url = new URL(`/api/ai-io?${queryString}`, BACKEND_URL);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(data, { status: response.status });
    }

    // 转换数据格式以匹配前端期望
    const formattedMessages = (data.data || []).map((msg: any) => ({
      id: msg.id,
      direction: msg.type === 'user' ? 'in' : msg.type === 'bot' ? 'out' : 'in',
      input: msg.type === 'user' ? msg.content : undefined,
      output: msg.type === 'bot' ? msg.content : undefined,
      robotId: msg.robotId,
      robotName: msg.robotName,
      userName: msg.userName,
      groupName: msg.groupName,
      sessionId: msg.sessionId,
      timestamp: msg.timestamp,
      createdAt: msg.timestamp,
      intent: msg.intent,
      confidence: msg.confidence,
    }));

    return NextResponse.json({
      success: true,
      data: formattedMessages
    }, { status: 200 });
  } catch (error: any) {
    console.error('获取实时 AI 输入输出失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
