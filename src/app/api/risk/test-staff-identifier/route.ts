import { NextRequest, NextResponse } from 'next/server';

/**
 * 测试工作人员识别规则
 * POST /api/risk/test-staff-identifier
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, staffConfig } = body;

    if (!message) {
      return NextResponse.json(
        { error: '缺少必要参数：message' },
        { status: 400 }
      );
    }

    // 调用后端API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';

    const response = await fetch(`${backendUrl}/api/risk/test-staff-identifier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, staffConfig }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || '测试失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 测试工作人员识别失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
