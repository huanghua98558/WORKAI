import { NextRequest, NextResponse } from 'next/server';

/**
 * 获取所有Cookie列表
 * GET /api/video-channel/cookies
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/video-channel/cookies`);
    const result = await response.json();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({
        success: false,
        error: result.message || '获取Cookie列表失败'
      }, { status: response.status });
    }
  } catch (error: any) {
    console.error('获取Cookie列表失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
