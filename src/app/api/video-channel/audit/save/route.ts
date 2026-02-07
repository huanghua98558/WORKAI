import { NextRequest, NextResponse } from 'next/server';

/**
 * 保存审核结果
 * POST /api/video-channel/audit/save
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      cookieId,
      auditResult,
      auditNotes,
      auditedBy
    } = body;

    if (!userId || !cookieId || !auditResult) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：userId, cookieId, auditResult'
      }, { status: 400 });
    }

    console.log('保存审核结果:', { userId, cookieId, auditResult });

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

    // 1. 更新Cookie的审核状态
    await fetch(`${backendUrl}/api/video-channel/cookie/update-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        auditStatus: auditResult === 'compliant' ? 'approved' : 'rejected',
        auditNotes,
        auditedBy
      })
    });

    // 2. 保存审核记录
    await fetch(`${backendUrl}/api/video-channel/audit-record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        cookieId,
        auditResult,
        auditNotes,
        auditedBy
      })
    });

    return NextResponse.json({
      success: true,
      message: '审核结果保存成功'
    });
  } catch (error: any) {
    console.error('保存审核结果失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
