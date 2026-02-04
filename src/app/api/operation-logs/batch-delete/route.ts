import { NextRequest, NextResponse } from 'next/server';

/**
 * 批量删除日志 API 代理
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/operation-logs/batch-delete', BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('批量删除日志失败:', error);
    return NextResponse.json(
      { success: false, error: '批量删除日志失败' },
      { status: 500 }
    );
  }
}
