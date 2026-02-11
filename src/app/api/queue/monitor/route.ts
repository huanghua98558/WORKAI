/**
 * 队列监控 API
 * 用于监控 Redis 队列的状态和消息
 */

import { NextRequest, NextResponse } from 'next/server';
import { redisManager } from '@/lib/db/redis-manager';

/**
 * GET /api/queue/monitor
 * 获取队列监控信息
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queueName = searchParams.get('queueName') || 'monitor_queue';
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log(`[Queue Monitor] Checking queue: ${queueName}`);

    const isMemoryMode = redisManager.isMemoryMode();
    const client = await redisManager.getClient();

    // 获取队列长度
    const queueLength = await redisManager.llen(queueName);

    // 获取队列中的前几条消息
    let messages = [];
    if (queueLength > 0) {
      const rawMessages = await redisManager.lrange(queueName, 0, limit - 1);
      messages = rawMessages.map(msg => {
        try {
          return JSON.parse(msg);
        } catch {
          return { raw: msg };
        }
      });
    }

    // 获取 Redis 信息（仅在真实 Redis 模式下）
    let redisInfo = null;
    if (!isMemoryMode && client) {
      try {
        const info = await client.info('stats');
        redisInfo = {
          uptime: info.match(/uptime_in_seconds:(\d+)/)?.[1],
          connections: info.match(/connected_clients:(\d+)/)?.[1],
          memory: info.match(/used_memory_human:(.+)/)?.[1],
        };
      } catch (error) {
        console.error('[Queue Monitor] Failed to get Redis info:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        queueName,
        queueLength,
        isMemoryMode,
        messages: messages.slice(0, limit),
        redisInfo,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Queue Monitor] Failed to get queue info:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * POST /api/queue/monitor/clear
 * 清空队列
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const queueName = body.queueName || 'monitor_queue';

    console.log(`[Queue Monitor] Clearing queue: ${queueName}`);

    // 删除队列
    await redisManager.del(queueName);

    return NextResponse.json({
      success: true,
      message: `Queue ${queueName} cleared successfully`,
      queueName,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Queue Monitor] Failed to clear queue:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
