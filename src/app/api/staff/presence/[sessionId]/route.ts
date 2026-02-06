import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 检查会话中是否有工作人员存在
 * GET /api/staff/presence/:sessionId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // 检查最近N分钟内是否有工作人员消息
    const response = await fetch(
      `${BACKEND_URL}/api/staff/presence/${sessionId}?window=5`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: '检查工作人员存在失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 检查工作人员存在失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 记录机器人负载变化（工作人员联动）
 * POST /api/staff/robot-load
 */
export async function POST(request: NextRequest) {
  try {
    const loadData = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/staff/robot-load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loadData),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '记录机器人负载失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 记录机器人负载失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
