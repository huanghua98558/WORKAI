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

    // 传递原始的 host 和协议信息，让后端能获取真实的前端部署地址
    const host = request.headers.get('host');
    
    // 从 request.headers 获取协议，而不是 nextUrl.protocol
    const proto = request.headers.get('x-forwarded-proto') || 
                  (request.headers.get('host')?.includes('localhost') ? 'http' : 'https');
    
    if (host) {
      headers['x-forwarded-host'] = host;
      headers['x-forwarded-proto'] = proto;
      headers['host'] = host;
    }

    // 传递后端的真实地址，用于生成回调地址
    headers['x-backend-url'] = BACKEND_URL;

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

    // 传递原始的 host 和协议信息，让后端能获取真实的前端部署地址
    const host = request.headers.get('host');
    
    // 从 request.headers 获取协议，而不是 nextUrl.protocol
    const proto = request.headers.get('x-forwarded-proto') || 
                  (request.headers.get('host')?.includes('localhost') ? 'http' : 'https');
    
    if (host) {
      headers['x-forwarded-host'] = host;
      headers['x-forwarded-proto'] = proto;
      headers['host'] = host;
    }

    // 传递后端的真实地址，用于生成回调地址
    headers['x-backend-url'] = BACKEND_URL;

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
