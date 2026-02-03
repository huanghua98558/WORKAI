import { NextRequest, NextResponse } from 'next/server';

/**
 * 指令队列管理 API (代理模式)
 * 代理到 /api/admin/robot-commands，转换响应格式
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // 代理到直接数据库访问的API
    const backendUrl = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/admin/robot-commands`);
    backendUrl.search = searchParams.toString();

    const response = await fetch(backendUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // 转换响应格式：{success: true, data: [...] } -> {code: 0, message: 'success', data: [...]}
    return NextResponse.json({
      code: 0,
      message: 'success',
      data: data.data,
      total: data.total,
      stats: data.stats,
      limit: data.limit,
      offset: data.offset,
    });
  } catch (error: any) {
    console.error('[Proxy robot-commands GET]', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '获取指令列表失败',
      data: [],
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 代理到直接数据库访问的API
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/admin/robot-commands`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // 转换响应格式：{success: true, data: {...} } -> {code: 0, message: 'success', data: {...}}
    return NextResponse.json({
      code: 0,
      message: 'success',
      data: data.data,
    });
  } catch (error: any) {
    console.error('[Proxy robot-commands POST]', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '创建指令失败',
      data: null,
    }, { status: 500 });
  }
}
