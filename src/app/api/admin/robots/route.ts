import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人管理 API（代理到后端服务）
 * 后端路径：/api/admin/robots
 * 前端路径：/api/admin/robots
 *
 * 权限逻辑（由后端处理）：
 * - 管理员：可以看到所有机器人
 * - 普通用户：只能看到自己创建或被授权的机器人
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// GET - 获取机器人列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL('/api/admin/robots', BACKEND_URL);

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
    console.error('[Frontend API] 获取机器人列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取机器人列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建机器人
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/admin/robots', BACKEND_URL);

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
    console.error('[Frontend API] 创建机器人失败:', error);
    return NextResponse.json(
      { success: false, message: '创建机器人失败', error: String(error) },
      { status: 500 }
    );
  }
}
