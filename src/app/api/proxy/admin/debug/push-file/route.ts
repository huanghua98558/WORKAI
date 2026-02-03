import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { robotId, recipient, fileType, fileName, fileUrl, remark } = body;

    // 验证必要参数
    if (!robotId) {
      return NextResponse.json(
        { code: -1, message: '缺少必要参数：robotId' },
        { status: 400 }
      );
    }

    if (!recipient || !fileUrl) {
      return NextResponse.json(
        { code: -1, message: '缺少必要参数：接收方或文件 URL' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validFileTypes = ['image', 'audio', 'video', '*'];
    if (!validFileTypes.includes(fileType)) {
      return NextResponse.json(
        { code: -1, message: '无效的文件类型，必须是：image, audio, video 或 *' },
        { status: 400 }
      );
    }

    console.log('[push-file proxy] 转发请求到后端:', {
      robotId,
      recipient,
      fileType,
      fileName,
      fileUrl: fileUrl.substring(0, 50) + '...'
    });

    // 调用后端 API
    const url = new URL('/api/admin/debug/push-file', BACKEND_URL);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId, recipient, fileType, fileName, fileUrl, remark })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Push file proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to push file' },
      { status: 500 }
    );
  }
}
