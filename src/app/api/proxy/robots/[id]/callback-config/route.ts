import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取回调配置
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(`/api/robots/${id}/callback-config`, BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get callback config proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch callback config' },
      { status: 500 }
    );
  }
}

/**
 * 更新回调配置
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const url = new URL(`/api/robots/${id}/callback-config`, BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Update callback config proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to update callback config' },
      { status: 500 }
    );
  }
}
