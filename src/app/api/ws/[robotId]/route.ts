/**
 * WebSocket API - 特定机器人操作
 * GET: 获取机器人连接状态
 * POST: 发送消息给指定机器人
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// WebSocket 独立服务器地址
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'http://localhost:5002';

interface SendMessageBody {
  roomName: string;
  content: string;
  type?: string;
}

/**
 * GET - 获取机器人连接状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ robotId: string }> }
) {
  const { robotId } = await params;

  try {
    // 从独立的 WebSocket 服务器获取状态
    const response = await fetch(`${WS_SERVER_URL}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const status = await response.json();
      const isConnected = status.connectedClients?.includes(robotId);

      return NextResponse.json({
        success: true,
        robotId,
        isConnected,
        wsUrl: `ws://localhost:${process.env.WS_PORT || 5002}${process.env.WS_PATH || '/ws'}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.log('[WS] 无法连接到 WebSocket 服务器');
  }

  return NextResponse.json({
    success: false,
    robotId,
    isConnected: false,
    message: 'WebSocket 服务器未运行',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST - 发送消息给指定机器人
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ robotId: string }> }
) {
  const { robotId } = await params;

  try {
    const body: SendMessageBody = await request.json();
    const { roomName, content, type = 'SEND_MESSAGE' } = body;

    if (!roomName || !content) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数: roomName, content',
        },
        { status: 400 }
      );
    }

    // 转发到独立的 WebSocket 服务器
    const response = await fetch(`${WS_SERVER_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        robotId,
        roomName,
        content,
        type,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json({
        success: true,
        robotId,
        message: '消息已发送',
        ...result,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: '发送失败',
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('[WS] 发送消息失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '发送失败',
      },
      { status: 500 }
    );
  }
}
