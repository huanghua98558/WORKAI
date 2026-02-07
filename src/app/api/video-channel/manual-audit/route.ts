import { NextRequest, NextResponse } from 'next/server';
import { videoChannelAutomationService } from '@/lib/services/video-channel-automation.service';

/**
 * 人工审核（截图）
 * POST /api/video-channel/manual-audit
 * Body: { cookies: any[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cookies } = body;

    if (!cookies || !Array.isArray(cookies)) {
      return NextResponse.json({
        success: false,
        error: 'cookies 参数必填且必须是数组'
      }, { status: 400 });
    }

    const result = await videoChannelAutomationService.manualAudit(cookies);

    if (result.success) {
      // 读取截图文件并转换为base64
      const { promises: fs } = await import('fs');

      let shopScreenshotBase64 = '';
      let assistantScreenshotBase64 = '';

      if (result.shopScreenshotPath) {
        const shopBuffer = await fs.readFile(result.shopScreenshotPath);
        shopScreenshotBase64 = `data:image/png;base64,${shopBuffer.toString('base64')}`;
      }

      if (result.assistantScreenshotPath) {
        const assistantBuffer = await fs.readFile(result.assistantScreenshotPath);
        assistantScreenshotBase64 = `data:image/png;base64,${assistantBuffer.toString('base64')}`;
      }

      return NextResponse.json({
        success: true,
        shopScreenshotBase64,
        shopScreenshotUrl: result.shopScreenshotUrl,
        assistantScreenshotBase64,
        assistantScreenshotUrl: result.assistantScreenshotUrl,
        message: '人工审核截图生成成功，请审核'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || '人工审核失败'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('人工审核API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
