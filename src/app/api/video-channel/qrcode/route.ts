import { NextRequest, NextResponse } from 'next/server';
import { videoChannelAutomationService } from '@/lib/services/video-channel-automation.service';

/**
 * 获取视频号小店登录二维码
 * POST /api/video-channel/qrcode
 */
export async function POST() {
  try {
    const result = await videoChannelAutomationService.getQrcode();

    if (result.success && result.qrcodePath) {
      // 读取二维码文件并转换为base64
      const { promises: fs } = await import('fs');
      const qrcodeBuffer = await fs.readFile(result.qrcodePath);
      const base64Qrcode = `data:image/png;base64,${qrcodeBuffer.toString('base64')}`;

      return NextResponse.json({
        success: true,
        qrcodeUrl: result.qrcodeUrl,
        qrcodeBase64: base64Qrcode,
        expiresAt: result.expiresAt,
        message: '二维码生成成功，请使用微信扫描登录'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || '获取二维码失败'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('获取二维码API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
