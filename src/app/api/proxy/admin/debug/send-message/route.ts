import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { robotId, messageType, recipient, content } = body;

    // 验证必要参数
    if (!robotId) {
      return NextResponse.json(
        { code: -1, message: '缺少必要参数：robotId' },
        { status: 400 }
      );
    }

    if (!recipient || !content) {
      return NextResponse.json(
        { code: -1, message: '缺少必要参数：接收方或消息内容' },
        { status: 400 }
      );
    }

    console.log('[send-message proxy] 转发请求到后端:', {
      robotId,
      messageType,
      recipient,
      content: content.substring(0, 50) + '...'
    });

    // 调用后端 API
    const url = new URL('/api/admin/debug/send-message', BACKEND_URL);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId, messageType, recipient, content })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Send message proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to send message' },
      { status: 500 }
    );
  }
}
