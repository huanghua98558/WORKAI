import { NextRequest, NextResponse } from 'next/server';
import { videoChannelAutomationService } from '@/lib/services/video-channel-automation.service';

/**
 * 检查二维码状态
 * GET /api/video-channel/qrcode-status
 */
export async function GET() {
  try {
    const isExpired = videoChannelAutomationService.isQrcodeExpired();
    const remainingTime = videoChannelAutomationService.getQrcodeRemainingTime();

    return NextResponse.json({
      success: true,
      expired: isExpired,
      remainingTime,
      message: isExpired ? '二维码已过期' : `二维码有效，剩余 ${remainingTime} 秒`
    });
  } catch (error: any) {
    console.error('检查二维码状态API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
