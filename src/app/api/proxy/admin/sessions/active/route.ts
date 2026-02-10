import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取活跃会话
 */
export async function GET(request: NextRequest) {
  try {
    const isLocalhost = request.headers.get('host')?.includes('localhost') ||
                         request.headers.get('host')?.includes('127.0.0.1');
    const baseUrl = isLocalhost ? BACKEND_URL : `${request.nextUrl.protocol}//${request.headers.get('host')}`;

    // 保留查询参数
    const { searchParams } = new URL(request.url);
    const url = new URL('/api/admin/sessions/active', baseUrl);
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get sessions proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
