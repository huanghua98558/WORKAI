import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/intents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取意图配置失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
