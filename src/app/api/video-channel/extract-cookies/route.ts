import { NextRequest, NextResponse } from 'next/server';
import { videoChannelAutomationService } from '@/lib/services/video-channel-automation.service';

/**
 * 提取和保存视频号小店Cookie
 * POST /api/video-channel/extract-cookies
 * Body: { userId: string, cookies: any[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, cookies } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId 参数必填'
      }, { status: 400 });
    }

    if (!cookies || !Array.isArray(cookies)) {
      return NextResponse.json({
        success: false,
        error: 'cookies 参数必填且必须是数组'
      }, { status: 400 });
    }

    const result = await videoChannelAutomationService.extractAndSaveCookies(userId, cookies);

    return NextResponse.json({
      success: result.success,
      cookieCount: result.cookieCount,
      message: result.success
        ? `成功提取 ${result.cookieCount} 个关键Cookie`
        : '提取Cookie失败',
      error: result.error
    });
  } catch (error: any) {
    console.error('提取Cookie API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
