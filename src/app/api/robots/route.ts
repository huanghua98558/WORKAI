import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const queryParams = new URLSearchParams();
    if (isActive) queryParams.append('isActive', isActive);
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);

    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');

    const response = await fetch(`${BACKEND_URL}/api/admin/robots?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 转发认证头
        ...(authHeader ? {
          'authorization': authHeader
        } : {}),
        // 转发 Cookie
        ...(cookieHeader ? {
          'cookie': cookieHeader
        } : {}),
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取机器人列表失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
