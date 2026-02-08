import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人配置验证 API（代理到后端服务）
 * POST /api/admin/robots/validate - 验证机器人配置
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/admin/robots/validate', BACKEND_URL);

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

    console.log('[Frontend API] POST /api/admin/robots/validate', {
      status: response.status,
      code: data.code
    });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Frontend API] 验证机器人配置失败:', error);
    return NextResponse.json(
      { success: false, message: '验证机器人配置失败', error: String(error) },
      { status: 500 }
    );
  }
}
