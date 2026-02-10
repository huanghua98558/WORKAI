import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人详情 API（通过UUID）
 * GET /api/admin/robots/[id] - 获取机器人详情
 * PUT /api/admin/robots/[id] - 更新机器人
 * DELETE /api/admin/robots/[id] - 删除机器人
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// GET - 获取机器人详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = new URL(`/api/admin/robots/${id}`, BACKEND_URL);

    // 构建请求头，传递认证令牌
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('获取机器人详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取机器人详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新机器人
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = new URL(`/api/admin/robots/${id}`, BACKEND_URL);

    // 构建请求头，传递认证令牌
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(backendUrl.toString(), {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('更新机器人失败:', error);
    return NextResponse.json(
      { success: false, message: '更新机器人失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 删除机器人
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = new URL(`/api/admin/robots/${id}`, BACKEND_URL);

    // 构建请求头，传递认证令牌
    const headers: Record<string, string> = {};

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(backendUrl.toString(), {
      method: 'DELETE',
      headers,
    });

    const text = await response.text();

    if (!text) {
      return NextResponse.json(
        { success: false, message: '后端返回空响应' },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('删除机器人失败:', error);
    return NextResponse.json(
      { success: false, message: '删除机器人失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PATCH - 更新状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = new URL(`/api/admin/robots/${id}`, BACKEND_URL);

    // 构建请求头，传递认证令牌
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(backendUrl.toString(), {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('更新机器人状态失败:', error);
    return NextResponse.json(
      { success: false, message: '更新机器人状态失败', error: String(error) },
      { status: 500 }
    );
  }
}
