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
      qrcodeExpired: result.qrcodeExpired,
      remainingTime: videoChannelAutomationService.getQrcodeRemainingTime(),
      message: result.isLoggedIn ? '已登录' : (result.qrcodeExpired ? '二维码已过期' : '未登录'),
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

    console.log('[轮询登录检测] 开始轮询，最大次数:', maxAttempts, '间隔:', interval + 'ms');

    let attempt = 0;
    let isLoggedIn = false;
    let cookies: any[] = [];
    let qrcodeExpired = false;

    while (attempt < maxAttempts && !isLoggedIn) {
      attempt++;

      console.log(`[轮询登录检测] 第 ${attempt}/${maxAttempts} 次检测...`);

      const result = await videoChannelAutomationService.checkLoginStatus();

      if (result.success) {
        isLoggedIn = result.isLoggedIn;
        cookies = result.cookies || [];
        qrcodeExpired = result.qrcodeExpired || false;

        console.log(`[轮询登录检测] 第 ${attempt} 次检测结果:`, {
          isLoggedIn,
          qrcodeExpired,
          cookiesCount: cookies.length
        });

        // 如果二维码过期，提前结束轮询
        if (qrcodeExpired && !isLoggedIn) {
          console.log('[轮询登录检测] 二维码已过期，结束轮询');
          return NextResponse.json({
            success: true,
            isLoggedIn: false,
            qrcodeExpired: true,
            cookies: [],
            attempts: attempt,
            message: '二维码已过期，请重新扫描'
          });
        }

        // 如果检测到登录，立即结束轮询
        if (isLoggedIn) {
          console.log('[轮询登录检测] 检测到登录，结束轮询');
          break;
        }
      } else {
        console.error(`[轮询登录检测] 第 ${attempt} 次检测失败:`, result.error);
      }

      if (!isLoggedIn && attempt < maxAttempts) {
        // 等待指定时间后再次检测
        console.log(`[轮询登录检测] 等待 ${interval}ms 后继续检测...`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    console.log('[轮询登录检测] 轮询结束，最终结果:', {
      isLoggedIn,
      qrcodeExpired,
      attempts: attempt
    });

    return NextResponse.json({
      success: true,
      isLoggedIn,
      qrcodeExpired,
      cookies: isLoggedIn ? cookies : [],
      attempts: attempt,
      message: isLoggedIn
        ? `登录成功，共检测 ${attempt} 次`
        : (qrcodeExpired ? '二维码已过期，请重新扫描' : `未登录，已达到最大检测次数 ${maxAttempts}`)
    });
  } catch (error: any) {
    console.error('轮询检测登录状态API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
