import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const url = new URL('/health', BACKEND_URL);

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
    if (request.headers.get('host')) {
      headers['x-forwarded-host'] = request.headers.get('host')!;
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Health check proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Backend not available' },
      { status: 503 }
    );
  }
}
