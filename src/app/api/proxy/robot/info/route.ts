import { NextRequest, NextResponse } from 'next/server';

/**
 * 获取机器人信息（企微昵称）
 * GET /api/proxy/robot/info?robotId={robotId}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const robotId = searchParams.get('robotId');

    if (!robotId) {
      return NextResponse.json(
        { code: 400, message: '缺少 robotId 参数' },
        { status: 400 }
      );
    }

    // 调用 WorkTool API 获取机器人信息
    const worktoolApiUrl = `https://api.worktool.ymdyes.cn/robot/robotInfo/get?robotId=${encodeURIComponent(robotId)}`;

    const response = await fetch(worktoolApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('WorkTool API 请求失败:', response.status, response.statusText);
      return NextResponse.json(
        { code: response.status, message: '获取机器人信息失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取机器人信息异常:', error);
    return NextResponse.json(
      { code: 500, message: '服务器错误' },
      { status: 500 }
    );
  }
}
