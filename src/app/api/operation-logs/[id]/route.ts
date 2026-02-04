import { NextRequest, NextResponse } from 'next/server';

/**
 * 删除单条日志 API 代理
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const backendUrl = new URL(`/api/operation-logs/${id}`, BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'DELETE',
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('删除日志失败:', error);
    return NextResponse.json(
      { success: false, error: '删除日志失败' },
      { status: 500 }
    );
  }
}
