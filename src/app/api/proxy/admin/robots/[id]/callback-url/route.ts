import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// 构建带认证的请求头
function buildAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    headers['authorization'] = authHeader;
  }

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers['cookie'] = cookieHeader;
  }

  // 添加回调基础地址请求头
  const callbackBaseUrl = request.headers.get('x-callback-base-url');
  if (callbackBaseUrl) {
    headers['x-callback-base-url'] = callbackBaseUrl;
  }

  return headers;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const url = new URL(`/api/admin/robots/${resolvedParams.id}/callback-url`, BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildAuthHeaders(request),
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
