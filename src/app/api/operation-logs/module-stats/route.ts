import { NextRequest, NextResponse } from 'next/server';

/**
 * 运营日志模块统计 API 代理
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL('/api/operation-logs/module-stats', BACKEND_URL);
    
    // 复制所有查询参数
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('模块统计 API 请求失败:', error);
    return NextResponse.json(
      { success: false, error: '模块统计 API 请求失败' },
      { status: 500 }
    );
  }
}
