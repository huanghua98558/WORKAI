import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = new URL('/api/admin/robots/test', BACKEND_URL);

    // 构建请求头，传递认证令牌
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 从请求中获取认证令牌
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    // 同时支持 Cookie 认证
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers['cookie'] = cookieHeader;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Test robot connection proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to test robot connection' },
      { status: 500 }
    );
  }
}
