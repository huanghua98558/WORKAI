import { NextRequest, NextResponse } from 'next/server';

/**
 * 按条件删除日志 API 代理
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL('/api/operation-logs/by-filters', BACKEND_URL);
    
    // 复制所有查询参数
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const response = await fetch(backendUrl.toString(), {
      method: 'DELETE',
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('按条件删除日志失败:', error);
    return NextResponse.json(
      { success: false, error: '按条件删除日志失败' },
      { status: 500 }
    );
  }
}
