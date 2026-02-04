import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人分组管理 API（代理到后端服务）
 * GET /api/admin/robot-groups - 获取所有分组
 * POST /api/admin/robot-groups - 创建分组
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// GET - 获取所有分组
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL('/api/admin/robot-groups', BACKEND_URL);

    // 转发查询参数
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('获取机器人分组失败:', error);
    return NextResponse.json(
      { success: false, message: '获取机器人分组失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建分组
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/admin/robot-groups', BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('创建机器人分组失败:', error);
    return NextResponse.json(
      { success: false, message: '创建机器人分组失败', error: String(error) },
      { status: 500 }
    );
  }
}
