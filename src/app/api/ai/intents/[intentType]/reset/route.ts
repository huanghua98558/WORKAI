import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function POST(
  request: NextRequest,
  { params }: { params: { intentType: string } }
) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/intents/${params.intentType}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('重置意图配置失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
