import { NextRequest, NextResponse } from 'next/server';

/**
 * 下载Cookie文件
 * GET /api/video-channel/cookies/:userId/download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

    // 获取Cookie数据
    const cookieResponse = await fetch(`${backendUrl}/api/video-channel/cookie/user/${userId}`);
    const cookieResult = await cookieResponse.json();

    if (!cookieResult.success || !cookieResult.cookieData) {
      return NextResponse.json({
        success: false,
        error: '获取Cookie失败'
      }, { status: 404 });
    }

    const cookie = cookieResult.cookieData;
    const cookieData = cookie.cookieData;
    const fileName = `cookie_${cookie.userId}_${Date.now()}.json`;

    // 准备下载的文件内容
    const fileContent = JSON.stringify({
      userId: cookie.userId,
      userName: cookie.userId, // 这里暂时使用userId，实际应该从用户表获取
      cookieData: cookieData,
      cookieCount: cookie.cookieCount,
      shopAccessible: cookie.shopAccessible,
      assistantAccessible: cookie.assistantAccessible,
      permissionStatus: cookie.permissionStatus,
      extractedAt: cookie.extractedAt,
      expiresAt: cookie.expiresAt
    }, null, 2);

    // 返回文件
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('下载Cookie文件失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
