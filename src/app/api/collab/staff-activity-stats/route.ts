/**
 * 工作人员活动统计 API Route
 * 代理到后端 Fastify 服务
 */

import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    const robotId = searchParams.get('robotId');

    const backendUrl = new URL(`${BACKEND_URL}/api/collab/staff-activity-stats`);
    backendUrl.searchParams.append('timeRange', timeRange);
    if (robotId) backendUrl.searchParams.append('robotId', robotId);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('[API] 工作人员活动统计请求失败:', error);
    return Response.json({
      code: -1,
      message: '网络错误，请稍后重试',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
