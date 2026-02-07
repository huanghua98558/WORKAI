import { NextRequest, NextResponse } from 'next/server';

/**
 * 保存消息模板（新建或更新）
 * POST /api/video-channel/message-template/save
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

    const response = await fetch(`${backendUrl}/api/video-channel/message-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({
        success: false,
        error: result.message || '保存消息模板失败'
      }, { status: response.status });
    }
  } catch (error: any) {
    console.error('保存消息模板失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
