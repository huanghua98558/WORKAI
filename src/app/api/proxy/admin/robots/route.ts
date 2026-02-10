import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取机器人列表
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL('/api/admin/robots', BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get robots proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch robots' },
      { status: 500 }
    );
  }
}
