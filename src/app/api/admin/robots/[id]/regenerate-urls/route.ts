import { NextRequest, NextResponse } from 'next/server';

/**
 * 重新生成机器人地址
 * POST /api/admin/robots/[id]/regenerate-urls
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = new URL(`/api/admin/robots/${id}/regenerate-urls`, BACKEND_URL);

    // 构建请求头，传递认证令牌
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('重新生成机器人地址失败:', error);
    return NextResponse.json(
      { success: false, message: '重新生成机器人地址失败', error: String(error) },
      { status: 500 }
    );
  }
}
