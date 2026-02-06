import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取智能推荐
 * GET /api/collab/recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/collab/recommendations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '获取智能推荐失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 获取智能推荐失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
