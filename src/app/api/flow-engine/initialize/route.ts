/**
 * WorkTool AI - 初始化 v6.1 流程
 * POST /api/flow-engine/initialize
 */

import { NextRequest, NextResponse } from 'next/server';

// 后端 API 基础 URL
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    // 转发请求到后端 API
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/flow-engine/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: request.body,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || '初始化流程失败' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('初始化流程失败:', error);
    return NextResponse.json(
      { success: false, error: '初始化流程失败' },
      { status: 500 }
    );
  }
}
