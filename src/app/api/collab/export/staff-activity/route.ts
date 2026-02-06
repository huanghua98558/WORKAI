import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 导出工作人员活动列表（CSV）
 * GET /api/collab/export/staff-activity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const limit = searchParams.get('limit') || '1000';

    const response = await fetch(
      `${BACKEND_URL}/api/collab/export/staff-activity?timeRange=${timeRange}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: '导出工作人员活动列表失败' },
        { status: response.status }
      );
    }

    // 获取CSV内容
    const csvContent = await response.text();

    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');

    // 从后端响应获取Content-Disposition
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
    } else {
      headers.set('Content-Disposition', `attachment; filename=staff-activity-${timeRange}-${Date.now()}.csv`);
    }

    return new NextResponse(csvContent, { headers });

  } catch (error) {
    console.error('[API] 导出工作人员活动列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
