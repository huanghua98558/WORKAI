import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';

/**
 * GET /api/proxy/admin/execution/stats - 获取执行统计
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint') || 'stats';
    const queryString = searchParams.toString().replace('endpoint=' + endpoint, '');

    let url = `${BASE_URL}/api/admin/execution/${endpoint}`;
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Execution tracker API proxy error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '请求失败' },
      { status: 500 }
    );
  }
}
