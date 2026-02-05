import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人分组详情 API（代理到后端服务）
 * GET /api/admin/robot-groups/[id] - 获取分组详情
 * PUT /api/admin/robot-groups/[id] - 更新分组
 * DELETE /api/admin/robot-groups/[id] - 删除分组
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// GET - 获取分组详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = new URL(`/api/admin/robot-groups/${id}`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('获取分组详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取分组详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新分组
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = new URL(`/api/admin/robot-groups/${id}`, BACKEND_URL);

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
    console.error('更新分组失败:', error);
    return NextResponse.json(
      { success: false, message: '更新分组失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 删除分组
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = new URL(`/api/admin/robot-groups/${id}`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'DELETE',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('删除分组失败:', error);
    return NextResponse.json(
      { success: false, message: '删除分组失败', error: String(error) },
      { status: 500 }
    );
  }
}
