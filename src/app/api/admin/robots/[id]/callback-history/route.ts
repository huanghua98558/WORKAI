import { NextRequest, NextResponse } from 'next/server';

/**
 * 获取机器人回调历史 API（代理到后端服务）
 * GET /api/admin/robots/{id}/callback-history - 获取回调历史
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL(`/api/admin/robots/${id}/callback-history`, BACKEND_URL);

    // 转发查询参数
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
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
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Frontend API] 获取回调历史失败:', error);
    return NextResponse.json(
      { success: false, message: '获取回调历史失败', error: String(error) },
      { status: 500 }
    );
  }
}
