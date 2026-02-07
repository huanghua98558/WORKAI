import { NextRequest, NextResponse } from 'next/server';
import { videoChannelAutomationService } from '@/lib/services/video-channel-automation.service';

/**
 * 检测视频号小店登录状态
 * POST /api/video-channel/check-login
 */
export async function POST() {
  try {
    const result = await videoChannelAutomationService.checkLoginStatus();

    return NextResponse.json({
      success: result.success,
      isLoggedIn: result.isLoggedIn,
      cookies: result.cookies,
      message: result.isLoggedIn ? '已登录' : '未登录',
      error: result.error
    });
  } catch (error: any) {
    console.error('检测登录状态API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 轮询检测登录状态（带超时）
 * 支持参数：
 * - maxAttempts: 最大尝试次数（默认20次）
 * - interval: 检测间隔（默认3000ms）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const maxAttempts = parseInt(searchParams.get('maxAttempts') || '20');
    const interval = parseInt(searchParams.get('interval') || '3000');

    let attempt = 0;
    let isLoggedIn = false;
    let cookies: any[] = [];

    while (attempt < maxAttempts && !isLoggedIn) {
      const result = await videoChannelAutomationService.checkLoginStatus();

      if (result.success) {
        isLoggedIn = result.isLoggedIn;
        cookies = result.cookies || [];
      }

      attempt++;

      if (!isLoggedIn && attempt < maxAttempts) {
        // 等待指定时间后再次检测
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return NextResponse.json({
      success: true,
      isLoggedIn,
      cookies: isLoggedIn ? cookies : [],
      attempts: attempt,
      message: isLoggedIn
        ? `登录成功，共检测 ${attempt} 次`
        : `未登录，已达到最大检测次数 ${maxAttempts}`
    });
  } catch (error: any) {
    console.error('轮询检测登录状态API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
