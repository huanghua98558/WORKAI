import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * GET /api/prompt-templates/[id]/export
 * 导出 Prompt 模板
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = new URL(`/api/prompt-templates/${id}/export`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Export prompt template proxy error:', error);
    return NextResponse.json(
      { code: -1, message: '导出 Prompt 模板失败' },
      { status: 500 }
    );
  }
}
