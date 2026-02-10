import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, input } = body;

    // 验证参数
    if (!modelId || !input) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数：modelId 和 input'
        },
        { status: 400 }
      );
    }

    // 调用后端API
    const response = await fetch(`${BACKEND_URL}/api/ai/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelId,
        input
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || data.message || '测试失败'
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('AI测试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误'
      },
      { status: 500 }
    );
  }
}
