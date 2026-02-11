/**
 * 系统监控 API
 * 整合数据库、队列、流程引擎等监控信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPoolInfo, checkDatabaseHealth, getDatabaseStats, getRecentOperations } from '@/lib/db/pool-manager';
import { redisManager } from '@/lib/db/redis-manager';

/**
 * GET /api/monitor/system
 * 获取系统整体监控信息
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // 1. 检查数据库健康状态
    console.log('[System Monitor] Checking database health...');
    const dbHealth = await checkDatabaseHealth();

    // 2. 获取数据库连接池信息
    console.log('[System Monitor] Getting database pool info...');
    const poolInfo = await getPoolInfo();

    // 3. 获取数据库统计信息
    console.log('[System Monitor] Getting database stats...');
    const dbStats = await getDatabaseStats();

    // 4. 获取 Redis 队列信息
    console.log('[System Monitor] Getting Redis queue info...');
    const redisClient = await redisManager.getClient();
    
    let queueInfo = {
      connected: false,
      isMemoryMode: false,
      monitorQueueLength: 0,
      monitorQueueMessages: [],
    };

    if (redisClient) {
      queueInfo.connected = true;
      queueInfo.isMemoryMode = redisManager.isMemoryMode();
      
      if (!redisManager.isMemoryMode()) {
        try {
          queueInfo.monitorQueueLength = await redisClient.llen('monitor_queue');
          if (queueInfo.monitorQueueLength > 0) {
            const messages = await redisClient.lrange('monitor_queue', 0, 4);
            queueInfo.monitorQueueMessages = messages.map(msg => {
              try {
                return JSON.parse(msg);
              } catch {
                return { raw: msg };
              }
            });
          }
        } catch (error) {
          console.error('[System Monitor] Failed to get queue info:', error);
        }
      }
    }

    // 5. 获取最近的数据库操作
    console.log('[System Monitor] Getting recent operations...');
    const recentOps = await getRecentOperations(5);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        database: {
          healthy: dbHealth,
          pool: poolInfo,
          stats: dbStats,
        },
        queue: queueInfo,
        recentOperations: recentOps,
      },
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[System Monitor] Failed to get system info:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
