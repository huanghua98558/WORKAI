import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const url = new URL('/api/admin/robots/check-status-all', BACKEND_URL);

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
      body: JSON.stringify({}),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { code: -1, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}
