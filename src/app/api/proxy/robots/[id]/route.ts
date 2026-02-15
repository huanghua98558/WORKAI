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

  return headers;
}

/**
 * 获取机器人详情
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(`/api/robots/${id}`, BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildAuthHeaders(request),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get robot detail proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch robot detail' },
      { status: 500 }
    );
  }
}

/**
 * 测试并保存机器人配置
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const url = new URL(`/api/robots/${id}/test-and-save`, BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: buildAuthHeaders(request),
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Test and save robot proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to test and save robot' },
      { status: 500 }
    );
  }
}
