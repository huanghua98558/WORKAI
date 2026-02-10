/**
 * 更新售后任务 API Route
 * 代理到后端 Fastify 服务
 */

import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    const body = await request.json();

    const backendUrl = new URL(`${BACKEND_URL}/api/collab/after-sales-tasks/${taskId}`);

    const response = await fetch(backendUrl.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // 字段映射：将 id 映射为 taskId 以匹配前端接口
    if (data.code === 0 && data.data) {
      const mappedData = {
        ...data.data,
        taskId: data.data.id,
      };
      return Response.json({
        ...data,
        data: mappedData
      }, { status: response.status });
    }

    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error('[API] 更新售后任务失败:', error);
    return Response.json({
      code: -1,
      message: '网络错误，请稍后重试',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
