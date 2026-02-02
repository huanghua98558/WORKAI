import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const url = new URL(`/api/admin/${path}`, BACKEND_URL);
    
    // 转发查询参数
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    // 构建请求头，传递原始请求头信息
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 传递关键请求头，让后端能获取真实的部署地址
    if (request.headers.get('x-forwarded-host')) {
      headers['x-forwarded-host'] = request.headers.get('x-forwarded-host')!;
    }
    if (request.headers.get('x-forwarded-proto')) {
      headers['x-forwarded-proto'] = request.headers.get('x-forwarded-proto')!;
    }
    // 注意：不要覆盖 x-forwarded-host，host 只在不存在 x-forwarded-host 时使用
    // 后端会优先使用 x-forwarded-host

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Proxy error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const url = new URL(`/api/admin/${path}`, BACKEND_URL);
    
    const body = await request.json();

    // 构建请求头，传递原始请求头信息
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 传递关键请求头，让后端能获取真实的部署地址
    if (request.headers.get('x-forwarded-host')) {
      headers['x-forwarded-host'] = request.headers.get('x-forwarded-host')!;
    }
    if (request.headers.get('x-forwarded-proto')) {
      headers['x-forwarded-proto'] = request.headers.get('x-forwarded-proto')!;
    }
    // 注意：不要覆盖 x-forwarded-host，host 只在不存在 x-forwarded-host 时使用
    // 后端会优先使用 x-forwarded-host

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Proxy error' },
      { status: 500 }
    );
  }
}
