import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { code: 500, message: '验证失败' },
      { status: 500 }
    );
  }
}
