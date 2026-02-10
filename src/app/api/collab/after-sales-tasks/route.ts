/**
 * 售后任务管理 API Route
 * 代理到后端 Fastify 服务
 */

import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedStaffUserId = searchParams.get('assignedStaffUserId');
    const limit = searchParams.get('limit') || '50';

    const backendUrl = new URL(`${BACKEND_URL}/api/collab/after-sales-tasks`);
    if (status) backendUrl.searchParams.append('status', status);
    if (priority) backendUrl.searchParams.append('priority', priority);
    if (assignedStaffUserId) backendUrl.searchParams.append('assignedStaffUserId', assignedStaffUserId);
    backendUrl.searchParams.append('limit', limit);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // 字段映射：将 id 映射为 taskId 以匹配前端接口
    if (data.code === 0 && data.data) {
      const mappedData = data.data.map((task: any) => ({
        ...task,
        taskId: task.id,
      }));
      return Response.json({
        ...data,
        data: mappedData
      });
    }

    return Response.json(data);
  } catch (error) {
    console.error('[API] 获取售后任务列表失败:', error);
    return Response.json({
      code: -1,
      message: '网络错误，请稍后重试',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 字段映射：将 taskId 映射为 id 以匹配后端API
    const backendBody = {
      ...body,
      id: body.taskId || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const backendUrl = new URL(`${BACKEND_URL}/api/collab/after-sales-tasks`);

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendBody),
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
    console.error('[API] 创建售后任务失败:', error);
    return Response.json({
      code: -1,
      message: '网络错误，请稍后重试',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
