import { NextRequest, NextResponse } from 'next/server';
import { afterSalesTaskService } from '@/services/after-sales-task-service';
import { TaskPriority, TaskStatus } from '@/services/after-sales-task-service';

/**
 * GET /api/after-sales/tasks
 * 获取售后任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params = {
      sessionId: searchParams.get('sessionId') || undefined,
      staffUserId: searchParams.get('staffUserId') || undefined,
      userId: searchParams.get('userId') || undefined,
      status: (searchParams.get('status') as TaskStatus) || undefined,
      priority: (searchParams.get('priority') as TaskPriority) || undefined,
      taskType: searchParams.get('taskType') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    // 验证状态
    if (params.status) {
      const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'waiting_response', 'completed', 'cancelled'];
      if (!validStatuses.includes(params.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // 验证优先级
    if (params.priority) {
      const validPriorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(params.priority)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const result = await afterSalesTaskService.getTasks(params);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.tasks || [],
      pagination: {
        limit: params.limit || 100,
        offset: params.offset || 0,
        count: result.tasks?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/after-sales/tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/after-sales/tasks
 * 创建售后任务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.sessionId || !body.userId || !body.userName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId, userId, userName',
        },
        { status: 400 }
      );
    }

    // 验证优先级
    if (body.priority) {
      const validPriorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const taskId = await afterSalesTaskService.createTask(body);

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: '创建任务失败',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { taskId },
      message: '售后任务创建成功',
    });
  } catch (error) {
    console.error('Error in POST /api/after-sales/tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
