import { NextRequest, NextResponse } from 'next/server';
import { robotCommandManager } from '@/storage/database';

/**
 * 消息发送历史 API
 * GET /api/admin/message-history - 获取消息发送历史
 */

// GET - 获取消息发送历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get('robotId') || undefined;
    const commandType = searchParams.get('commandType') || undefined;
    const status = searchParams.get('status') || undefined;
    const startTime = searchParams.get('startTime') || undefined;
    const endTime = searchParams.get('endTime') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await robotCommandManager.getMessageHistory({
      robotId,
      commandType,
      status,
      startTime,
      endTime,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      stats: result.stats,
      limit,
      offset,
    });
  } catch (error) {
    console.error('获取消息发送历史失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '获取消息发送历史失败',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
