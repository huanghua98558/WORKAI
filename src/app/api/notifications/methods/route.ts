import { NextResponse } from 'next/server';

/**
 * 创建通知方式
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch('http://localhost:5001/api/notifications/methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('创建通知方式失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: '创建通知方式失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
