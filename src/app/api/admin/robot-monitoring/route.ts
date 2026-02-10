import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人监控 API 代理
 * GET /api/admin/robot-monitoring - 获取监控数据（转发到后端）
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1h';

    // 转发到后端 API
    const url = new URL('/api/admin/robot-monitoring', BACKEND_URL);
    url.searchParams.set('period', period);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get robot monitoring proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch robot monitoring data' },
      { status: 500 }
    );
  }
}
