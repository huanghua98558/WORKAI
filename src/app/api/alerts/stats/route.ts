import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取告警统计
 * GET /api/alerts/stats
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/alerts/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] Alerts stats proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch alerts stats' },
      { status: 500 }
    );
  }
}
