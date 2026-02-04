/**
 * 提供商API Proxy路由
 * 转发前端请求到后端提供商API
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = `${BACKEND_API_URL}/api/ai/providers`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('提供商API Proxy错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const pathSegments = request.nextUrl.pathname.split('/');
    const providerId = pathSegments[pathSegments.length - 1];

    const body = await request.json();
    const backendUrl = `${BACKEND_API_URL}/api/ai/providers/${providerId}`;

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('提供商API Proxy错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const pathSegments = request.nextUrl.pathname.split('/');
    const providerId = pathSegments[pathSegments.length - 2];

    const backendUrl = `${BACKEND_API_URL}/api/ai/providers/${providerId}/test`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('提供商API Proxy错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
