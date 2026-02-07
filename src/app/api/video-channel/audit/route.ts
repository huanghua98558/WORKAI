import { NextRequest, NextResponse } from 'next/server';

/**
 * 执行人工审核（截图）
 * POST /api/video-channel/audit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：userId'
      }, { status: 400 });
    }

    console.log('开始执行人工审核:', { userId });

    // 调用手动审核API
    const auditResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/video-channel/manual-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });

    const auditResult = await auditResponse.json();

    if (auditResult.success) {
      return NextResponse.json({
        success: true,
        data: auditResult
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '人工审核失败: ' + (auditResult.error || '未知错误')
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('执行人工审核失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
