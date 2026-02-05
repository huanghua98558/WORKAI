import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人角色 API（代理到后端服务）
 * GET /api/admin/robot-roles - 获取角色列表
 * POST /api/admin/robot-roles - 创建角色
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// GET - 获取角色列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL('/api/admin/robot-roles', BACKEND_URL);

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
    console.error('获取角色列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取角色列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建角色
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/admin/robot-roles', BACKEND_URL);

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
    console.error('创建角色失败:', error);
    return NextResponse.json(
      { success: false, message: '创建角色失败', error: String(error) },
      { status: 500 }
    );
  }
}
