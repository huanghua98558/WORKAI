/**
 * 监控接口 - 机器人状态摘要
 * 路径: /api/monitoring/robots-status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 从数据库获取机器人详细信息
    const db = await getDb();
    
    const result = await db.execute(sql`
      SELECT * FROM robots WHERE is_active = true
    `);

    // 格式化数据
    const formattedRobots = result.rows.map((robot: any) => ({
      ...robot,
      messagesProcessed: 0,
      errors: 0,
      successRate: 100,
      healthStatus: 'healthy',
      lastCheckTime: new Date().toISOString()
    }));

    const response = {
      code: 0,
      message: 'success',
      data: {
        robots: formattedRobots,
        stats: {
          totalRobots: formattedRobots.length,
          onlineRobots: formattedRobots.filter((r: any) => r.status === 'online').length,
          offlineRobots: formattedRobots.filter((r: any) => r.status === 'offline').length,
          unknownRobots: formattedRobots.filter((r: any) => r.status === 'unknown').length,
          healthyRobots: formattedRobots.filter((r: any) => r.healthStatus === 'healthy').length,
          warningRobots: formattedRobots.filter((r: any) => r.healthStatus === 'warning').length,
          criticalRobots: formattedRobots.filter((r: any) => r.healthStatus === 'critical').length,
          totalMessages: 0,
          totalErrors: 0,
          avgSuccessRate: '100.00'
        },
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[机器人状态] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取机器人状态失败',
      data: null
    }, { status: 500 });
  }
}
