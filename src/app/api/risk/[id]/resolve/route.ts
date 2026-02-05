import { NextRequest, NextResponse } from 'next/server';

/**
 * 标记风险消息为已解决
 * POST /api/risk/[id]/resolve
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { resolvedBy } = body;

    if (!resolvedBy) {
      return NextResponse.json(
        { error: '缺少必要参数：resolvedBy' },
        { status: 400 }
      );
    }

    // 调用后端API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';

    const response = await fetch(`${backendUrl}/api/risk/${id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resolvedBy }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || '操作失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 标记风险消息为已解决失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
