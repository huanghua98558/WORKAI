import { NextRequest, NextResponse } from 'next/server';

/**
 * 获取转化客服机器人
 * GET /api/video-channel/conversion-robot
 */
export async function GET(request: NextRequest) {
  try {
    // 调用后端服务获取转化客服机器人
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

    const response = await fetch(`${backendUrl}/api/worktool/conversion-robot`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      return NextResponse.json({
        success: true,
        robot: result.robot
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || '获取转化客服机器人失败'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('获取转化客服机器人API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}
