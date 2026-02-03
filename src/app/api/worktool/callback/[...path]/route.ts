import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || 'message';

  // 构建后端 URL
  const backendUrl = new URL(`/api/worktool/callback/${path}`, BACKEND_URL);

  // 获取查询参数（包括 robotId）
  const searchParams = request.nextUrl.searchParams;
  searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  console.log('===== 回调代理请求 =====', {
    path,
    robotId: searchParams.get('robotId'),
    url: backendUrl.toString(),
    timestamp: new Date().toISOString(),
    headers: {
      'content-type': request.headers.get('content-type'),
      'x-signature': request.headers.get('x-signature') ? '***' : 'missing',
    }
  });

  try {
    // 读取请求体
    const body = await request.json();

    console.log('请求体:', {
      keys: Object.keys(body),
      spoken: body.spoken?.substring(0, 50),
      receivedName: body.receivedName,
      groupName: body.groupName
    });

    // 转发请求到后端，增加超时设置
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': request.headers.get('x-signature') || '',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 获取后端响应
    const data = await response.json();

    console.log('后端响应:', {
      status: response.status,
      code: data.code,
      message: data.message,
      timestamp: new Date().toISOString()
    });

    // 返回 JSON 响应
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // 处理不同类型的错误
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
        statusCode = 504;
      } else {
        errorMessage = error.message;
      }
    }

    console.error('❌ 回调代理错误:', {
      path,
      robotId: searchParams.get('robotId'),
      errorMessage,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        code: -1,
        message: errorMessage,
        data: null
      },
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
