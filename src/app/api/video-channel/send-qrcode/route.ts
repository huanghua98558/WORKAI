import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';

/**
 * 发送二维码到WorkTool机器人
 * POST /api/video-channel/send-qrcode
 *
 * 流程：
 * 1. 读取本地二维码文件
 * 2. 上传到阿里云OSS
 * 3. 调用WorkTool API发送图片消息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrcodePath, robotId, toName, objectName, extraText } = body;

    // 验证参数
    if (!qrcodePath || !robotId || !toName) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：qrcodePath, robotId, toName'
      }, { status: 400 });
    }

    console.log('开始处理发送二维码请求:', {
      qrcodePath,
      robotId,
      toName,
      objectName,
      hasExtraText: !!extraText
    });

    // 1. 读取本地二维码文件
    let qrcodeBuffer: Buffer;
    try {
      qrcodeBuffer = await fs.readFile(qrcodePath);
      console.log('二维码文件读取成功，大小:', qrcodeBuffer.length, '字节');
    } catch (error: any) {
      console.error('读取二维码文件失败:', error);
      return NextResponse.json({
        success: false,
        error: '读取二维码文件失败: ' + error.message
      }, { status: 500 });
    }

    // 2. 转换为Base64
    const base64Data = `data:image/png;base64,${qrcodeBuffer.toString('base64')}`;

    // 3. 调用后端服务上传到OSS并发送
    // 这里需要调用后端的Fastify服务
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

    try {
      const response = await fetch(`${backendUrl}/api/worktool/send-oss-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64Data,
          objectName,
          robotId,
          toName,
          extraText,
          folder: 'video-channel/qrcode'
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('二维码发送成功:', result);
        return NextResponse.json({
          success: true,
          url: result.url,
          message: result.message
        });
      } else {
        console.error('二维码发送失败:', result);
        return NextResponse.json({
          success: false,
          error: result.error || '发送失败'
        }, { status: 500 });
      }
    } catch (error: any) {
      console.error('调用后端服务失败:', error);
      return NextResponse.json({
        success: false,
        error: '调用后端服务失败: ' + error.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('发送二维码API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
