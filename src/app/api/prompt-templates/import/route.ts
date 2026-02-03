import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * POST /api/prompt-templates/import
 * 导入 Prompt 模板
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/prompt-templates/import', BACKEND_URL);

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
    console.error('Import prompt template proxy error:', error);
    return NextResponse.json(
      { code: -1, message: '导入 Prompt 模板失败' },
      { status: 500 }
    );
  }
}
