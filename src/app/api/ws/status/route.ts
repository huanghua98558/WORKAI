/**
 * WebSocket 状态 API
 * 返回 WebSocket 服务器的连接状态
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // WebSocket 独立服务器地址
  const wsServerUrl = process.env.WS_SERVER_URL || 'http://localhost:5002';

  try {
    // 尝试从独立的 WebSocket 服务器获取状态
    const response = await fetch(`${wsServerUrl}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const status = await response.json();
      return NextResponse.json({
        success: true,
        standalone: true,
        ...status,
      });
    }
  } catch (error) {
    // WebSocket 服务器可能未启动
    console.log('[WS Status] 独立 WebSocket 服务器未运行');
  }

  // 返回默认状态
  return NextResponse.json({
    success: true,
    standalone: false,
    isRunning: false,
    connectedClients: [],
    clientCount: 0,
    message: 'WebSocket 服务器未启动。请运行: pnpm run ws:server',
    wsUrl: `ws://localhost:${process.env.WS_PORT || 5002}${process.env.WS_PATH || '/ws'}`,
    timestamp: new Date().toISOString(),
  });
}
