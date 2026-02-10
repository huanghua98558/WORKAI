import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 获取系统配置
 */
export async function GET(request: NextRequest) {
  try {
    // 判断环境：检测是否在部署环境中（不是 localhost 且没有 BACKEND_URL 环境变量明确指向本地）
    const isLocalhost = request.headers.get('host')?.includes('localhost') ||
                         request.headers.get('host')?.includes('127.0.0.1');

    // 如果是本地环境，使用 BACKEND_URL；否则使用当前域名
    const baseUrl = isLocalhost ? BACKEND_URL : `${request.nextUrl.protocol}//${request.headers.get('host')}`;

    console.log('[Config Proxy] GET Request', {
      isLocalhost,
      host: request.headers.get('host'),
      baseUrl,
      NODE_ENV: process.env.NODE_ENV,
      BACKEND_URL: process.env.BACKEND_URL
    });

    const url = new URL('/api/admin/config', baseUrl);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get config proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

/**
 * 更新系统配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 判断环境：检测是否在部署环境中（不是 localhost 且没有 BACKEND_URL 环境变量明确指向本地）
    const isLocalhost = request.headers.get('host')?.includes('localhost') ||
                         request.headers.get('host')?.includes('127.0.0.1');

    // 如果是本地环境，使用 BACKEND_URL；否则使用当前域名
    const baseUrl = isLocalhost ? BACKEND_URL : `${request.nextUrl.protocol}//${request.headers.get('host')}`;

    console.log('[Config Proxy] POST Request', {
      isLocalhost,
      host: request.headers.get('host'),
      baseUrl,
      NODE_ENV: process.env.NODE_ENV,
      BACKEND_URL: process.env.BACKEND_URL,
      bodyKeys: Object.keys(body)
    });

    const url = new URL('/api/admin/config', baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log('[Config Proxy] POST Response', {
      status: response.status,
      success: data.success
    });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Update config proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
