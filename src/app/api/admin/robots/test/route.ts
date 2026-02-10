import { NextRequest, NextResponse } from 'next/server';

/**
 * 测试机器人连接
 * POST /api/admin/robots/test
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/admin/robots/test', BACKEND_URL);

    // 构建请求头，传递认证令牌
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('测试机器人连接失败:', error);
    return NextResponse.json(
      { success: false, message: '测试机器人连接失败', error: String(error) },
      { status: 500 }
    );
  }
}
