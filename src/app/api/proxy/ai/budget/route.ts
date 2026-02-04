/**
 * AI预算管理Proxy路由
 * 转发前端请求到后端AI预算管理API
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const backendUrl = `${BACKEND_API_URL}/api/ai/budget${request.nextUrl.pathname.split('/api/proxy/ai/budget')[1]}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 添加组织ID头部（用于多租户）
    const organizationId = request.headers.get('x-organization-id') || 'default';
    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }

    const response = await fetch(`${backendUrl}?${searchParams.toString()}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('AI预算管理Proxy错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const backendUrl = `${BACKEND_API_URL}/api/ai/budget${request.nextUrl.pathname.split('/api/proxy/ai/budget')[1]}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 添加组织ID头部（用于多租户）
    const organizationId = request.headers.get('x-organization-id') || 'default';
    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }

    const body = await request.json();

    const response = await fetch(`${backendUrl}?${searchParams.toString()}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('AI预算管理Proxy错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
