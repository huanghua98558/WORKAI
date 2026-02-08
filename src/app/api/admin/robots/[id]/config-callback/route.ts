import { NextRequest, NextResponse } from 'next/server';

/**
 * 配置机器人回调 API（代理到后端服务）
 * POST /api/admin/robots/{id}/config-callback - 配置回调
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = new URL(`/api/admin/robots/${id}/config-callback`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 转发认证头
        ...(request.headers.get('authorization') ? {
          'authorization': request.headers.get('authorization')!
        } : {}),
        // 转发 Cookie
        ...(request.headers.get('cookie') ? {
          'cookie': request.headers.get('cookie')!
        } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Frontend API] 配置回调失败:', error);
    return NextResponse.json(
      { success: false, message: '配置回调失败', error: String(error) },
      { status: 500 }
    );
  }
}
