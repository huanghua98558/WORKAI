import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * POST /api/prompt-templates/[id]/duplicate
 * 复制 Prompt 模板
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = new URL(`/api/prompt-templates/${id}/duplicate`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Duplicate prompt template proxy error:', error);
    return NextResponse.json(
      { code: -1, message: '复制 Prompt 模板失败' },
      { status: 500 }
    );
  }
}
