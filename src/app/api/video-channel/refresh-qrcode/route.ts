import { NextRequest, NextResponse } from 'next/server';
import { videoChannelAutomationService } from '@/lib/services/video-channel-automation.service';

/**
 * 重新生成二维码（刷新二维码）
 * POST /api/video-channel/refresh-qrcode
 */
export async function POST() {
  try {
    // 生成新的二维码
    const result = await videoChannelAutomationService.getQrcode();

    if (result.success && result.qrcodePath) {
      // 读取二维码文件并转换为base64
      const { promises: fs } = await import('fs');
      const qrcodeBuffer = await fs.readFile(result.qrcodePath);
      const base64Qrcode = `data:image/png;base64,${qrcodeBuffer.toString('base64')}`;

      // 计算剩余有效时间（秒）
      const remainingTime = videoChannelAutomationService.getQrcodeRemainingTime();

      return NextResponse.json({
        success: true,
        qrcodeId: result.qrcodeId,
        qrcodeUrl: result.qrcodeUrl,
        qrcodeBase64: base64Qrcode,
        expiresAt: result.expiresAt,
        remainingTime,
        message: '二维码已刷新，请重新扫描'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || '刷新二维码失败'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('刷新二维码API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
