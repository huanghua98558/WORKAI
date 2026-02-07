import { NextRequest, NextResponse } from 'next/server';
import { videoChannelAutomationService } from '@/lib/services/video-channel-automation.service';

/**
 * 检测视频号登录状态
 * GET /api/video-channel/login-status
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[登录状态检测] 开始检测登录状态');

    const loginStatus = await videoChannelAutomationService.checkLoginStatus();

    console.log('[登录状态检测] 登录状态:', loginStatus);

    return NextResponse.json({
      success: true,
      isLoggedIn: loginStatus.isLoggedIn,
      cookies: loginStatus.cookies,
      qrcodeExpired: loginStatus.qrcodeExpired,
      message: loginStatus.isLoggedIn ? '已登录' : '未登录'
    });
  } catch (error: any) {
    console.error('[登录状态检测] 检测失败:', error);
    return NextResponse.json({
      success: false,
      isLoggedIn: false,
      error: error.message || '检测登录状态失败'
    }, { status: 500 });
  }
}
