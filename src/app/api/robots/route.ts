import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

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

    const response = await fetch(`${BACKEND_URL}/api/admin/robots?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
