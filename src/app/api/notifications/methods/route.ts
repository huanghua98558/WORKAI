import { NextResponse } from 'next/server';

/**
 * 获取通知方式列表（通过查询参数）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const alertRuleId = searchParams.get('alertRuleId');

    if (!alertRuleId) {
      return NextResponse.json(
        {
          code: -1,
          message: '缺少 alertRuleId 参数',
        },
        { status: 400 }
      );
    }

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

/**
 * 创建通知方式
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch('http://localhost:5001/api/notifications/methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('创建通知方式失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: '创建通知方式失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
