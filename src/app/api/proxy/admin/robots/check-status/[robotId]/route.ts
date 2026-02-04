import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ robotId: string }> }
) {
  try {
    const { robotId } = await params;
    const url = new URL(`/api/admin/robots/${robotId}/check-status`, BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // 发送空对象以避免 Fastify 错误
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Check robot status proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to check robot status' },
      { status: 500 }
    );
  }
}
