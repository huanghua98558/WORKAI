import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * GET /api/prompt-templates/[id]
 * 获取指定 Prompt 模板
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = new URL(`/api/prompt-templates/${id}`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get prompt template proxy error:', error);
    return NextResponse.json(
      { code: -1, message: '获取 Prompt 模板失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/prompt-templates/[id]
 * 更新 Prompt 模板
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = new URL(`/api/prompt-templates/${id}`, BACKEND_URL);

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
    console.error('Update prompt template proxy error:', error);
    return NextResponse.json(
      { code: -1, message: '更新 Prompt 模板失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prompt-templates/[id]
 * 删除 Prompt 模板
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = new URL(`/api/prompt-templates/${id}`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Delete prompt template proxy error:', error);
    return NextResponse.json(
      { code: -1, message: '删除 Prompt 模板失败' },
      { status: 500 }
    );
  }
}
