import { NextRequest, NextResponse } from 'next/server';

// 后端 API 基础 URL
const BACKEND_API_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');

    // 代理到后端登出 API
    const response = await fetch(`${BACKEND_API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': authorization || '',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Logout proxy error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
