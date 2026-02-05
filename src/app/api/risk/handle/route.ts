import { NextRequest, NextResponse } from 'next/server';

/**
 * 处理风险消息
 * POST /api/risk/handle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, config } = body;

    if (!message || !context) {
      return NextResponse.json(
        { error: '缺少必要参数：message 或 context' },
        { status: 400 }
      );
    }

    // 这里需要调用后端服务
    // 由于Next.js前端和后端分离，这里通过HTTP调用后端API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';

    const response = await fetch(`${backendUrl}/api/risk/handle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, context, config }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || '处理失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 处理风险消息失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
