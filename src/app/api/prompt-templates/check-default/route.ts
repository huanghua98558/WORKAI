import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = new URL('/api/prompt-templates/check-default', BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Check default templates error:', error);
    return NextResponse.json(
      { code: -1, message: '检查默认模板失败' },
      { status: 500 }
    );
  }
}
