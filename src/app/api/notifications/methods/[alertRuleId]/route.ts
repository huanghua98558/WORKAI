import { NextResponse } from 'next/server';

/**
 * 获取告警规则的通知方式列表
 */
export async function GET(
  request: Request,
  { params }: { params: { alertRuleId: string } }
) {
  try {
    const { alertRuleId } = params;

    const response = await fetch(`http://localhost:5001/api/notifications/methods/${alertRuleId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('获取通知方式列表失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: '获取通知方式列表失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
