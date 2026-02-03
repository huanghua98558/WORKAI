import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * PATCH /api/prompt-templates/[id]/toggle
 * 激活/停用 Prompt 模板
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = new URL(`/api/prompt-templates/${id}/toggle`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Toggle prompt template proxy error:', error);
    return NextResponse.json(
      { code: -1, message: '切换 Prompt 模板状态失败' },
      { status: 500 }
    );
  }
}
