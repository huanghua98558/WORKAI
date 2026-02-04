/**
 * AI使用统计Proxy路由
 * 转发前端请求到后端AI使用统计API
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const backendUrl = `${BACKEND_API_URL}/api/ai/usage${request.nextUrl.pathname.split('/api/proxy/ai')[1]}`;

    const response = await fetch(`${backendUrl}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('AI使用统计Proxy错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
