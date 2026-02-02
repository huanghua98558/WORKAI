import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path?.join('/') || 'message';

    // 构建后端 URL
    const backendUrl = new URL(`/api/worktool/callback/${path}`, BACKEND_URL);

    // 获取查询参数（包括 robotId）
    const searchParams = request.nextUrl.searchParams;
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    // 读取请求体
    const body = await request.json();

    // 转发请求到后端
    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': request.headers.get('x-signature') || '',
      },
      body: JSON.stringify(body),
    });

    // 获取后端响应
    const data = await response.json();

    // 返回 JSON 响应
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Callback proxy error:', error);
    return NextResponse.json(
      {
        code: -1,
        message: 'Internal server error',
        data: null
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
