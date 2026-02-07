import { NextRequest, NextResponse } from 'next/server';

/**
 * 删除消息模板
 * DELETE /api/video-channel/message-template/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

    const response = await fetch(`${backendUrl}/api/video-channel/message-template/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({
        success: false,
        error: result.message || '删除消息模板失败'
      }, { status: response.status });
    }
  } catch (error: any) {
    console.error('删除消息模板失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
