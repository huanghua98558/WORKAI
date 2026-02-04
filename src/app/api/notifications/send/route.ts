import { NextResponse } from 'next/server';

/**
 * 发送通知
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch('http://localhost:5001/api/notifications/send', {
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
    console.error('发送通知失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: '发送通知失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
