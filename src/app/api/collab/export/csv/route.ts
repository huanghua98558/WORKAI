import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 导出协同统计数据（CSV）
 * GET /api/collab/export/csv
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';

    const response = await fetch(
      `${BACKEND_URL}/api/collab/export/csv?timeRange=${timeRange}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: '导出统计数据失败' },
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
      headers.set('Content-Disposition', `attachment; filename=collab-stats-${timeRange}-${Date.now()}.csv`);
    }

    return new NextResponse(csvContent, { headers });

  } catch (error) {
    console.error('[API] 导出统计数据失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
