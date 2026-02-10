import { NextRequest, NextResponse } from 'next/server';

/**
 * 指令队列管理 API（代理到后端服务）
 * GET /api/admin/robot-commands - 获取指令列表
 * POST /api/admin/robot-commands - 创建指令
 * PUT /api/admin/robot-commands/batch - 批量操作指令
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// GET - 获取指令列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL('/api/admin/robot-commands', BACKEND_URL);

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
    console.error('获取指令列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取指令列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建指令
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/admin/robot-commands', BACKEND_URL);

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
    console.error('创建指令失败:', error);
    return NextResponse.json(
      { success: false, message: '创建指令失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 批量操作指令
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/admin/robot-commands/batch', BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('批量操作指令失败:', error);
    return NextResponse.json(
      { success: false, message: '批量操作指令失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 清理已完成指令
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL('/api/admin/robot-commands', BACKEND_URL);

    // 转发查询参数
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const response = await fetch(backendUrl.toString(), {
      method: 'DELETE',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('清理指令失败:', error);
    return NextResponse.json(
      { success: false, message: '清理指令失败', error: String(error) },
      { status: 500 }
    );
  }
}
