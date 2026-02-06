import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:9000';

/**
 * 工作人员处理后关闭告警
 * POST /api/alerts/close-after-staff
 */
export async function POST(request: NextRequest) {
  try {
    const params = await request.json();
    const { alertId, staffUserId, responseTime, reason } = params;

    if (!alertId || !staffUserId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/alerts/close-after-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        alertId,
        staffUserId,
        responseTime,
        reason
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '关闭告警失败' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 记录工作人员活动
    await fetch(`${BACKEND_URL}/api/staff/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        staffUserId,
        staffName: staffUserId,
        activityType: 'alert_handling',
        activityDetail: `处理告警 ${alertId}，响应时间 ${responseTime}秒`,
        alertId
      })
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 关闭告警失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 批量处理告警
 * POST /api/alerts/batch-handle
 */
export async function PATCH(request: NextRequest) {
  try {
    const params = await request.json();
    const { sessionId, staffUserId, action } = params;

    if (!sessionId || !staffUserId || !action) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/alerts/batch-handle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        staffUserId,
        action
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '批量处理告警失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 批量处理告警失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取告警响应时间统计
 * GET /api/alerts/response-stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';

    const response = await fetch(
      `${BACKEND_URL}/api/alerts/response-stats?timeRange=${timeRange}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: '获取告警响应统计失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 获取告警响应统计失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
