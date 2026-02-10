import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const url = new URL(`/api/admin/robots/${resolvedParams.id}/callback-url`, BACKEND_URL);

    // 添加回调基础地址请求头
    const callbackBaseUrl = request.headers.get('x-callback-base-url');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (callbackBaseUrl) {
      headers['x-callback-base-url'] = callbackBaseUrl;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get callback URL proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to get callback URL' },
      { status: 500 }
    );
  }
}
