import { NextRequest, NextResponse } from 'next/server';

/**
 * 指令详情 API（代理到后端服务）
 * GET /api/admin/robot-commands/[commandId] - 获取指令详情
 * PUT /api/admin/robot-commands/[commandId] - 更新指令状态
 * DELETE /api/admin/robot-commands/[commandId] - 删除指令
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// GET - 获取指令详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commandId: string }> }
) {
  try {
    const { commandId } = await params;
    const backendUrl = new URL(`/api/admin/robot-commands/${commandId}`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('获取指令详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取指令详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新指令状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ commandId: string }> }
) {
  try {
    const { commandId } = await params;
    const body = await request.json();
    const backendUrl = new URL(`/api/admin/robot-commands/${commandId}`, BACKEND_URL);

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
    console.error('更新指令状态失败:', error);
    return NextResponse.json(
      { success: false, message: '更新指令状态失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 删除指令
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commandId: string }> }
) {
  try {
    const { commandId } = await params;
    const backendUrl = new URL(`/api/admin/robot-commands/${commandId}`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'DELETE',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('删除指令失败:', error);
    return NextResponse.json(
      { success: false, message: '删除指令失败', error: String(error) },
      { status: 500 }
    );
  }
}
