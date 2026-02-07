import { NextRequest, NextResponse } from 'next/server';
import { afterSalesTaskService } from '@/services/after-sales-task-service';
import { TaskPriority, TaskStatus } from '@/services/after-sales-task-service';

/**
 * GET /api/after-sales/tasks/[id]
 * 获取售后任务详情
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const result = await afterSalesTaskService.getTaskById(params.id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.task,
    });
  } catch (error) {
    console.error('Error in GET /api/after-sales/tasks/[id]:', error);
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
 * PUT /api/after-sales/tasks/[id]
 * 更新售后任务
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    // 验证状态
    if (body.status) {
      const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'waiting_response', 'completed', 'cancelled'];
      if (!validStatuses.includes(body.status)) {
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

    const result = await afterSalesTaskService.updateTask(params.id, body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.task,
      message: '售后任务更新成功',
    });
  } catch (error) {
    console.error('Error in PUT /api/after-sales/tasks/[id]:', error);
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
 * POST /api/after-sales/tasks/[id]/assign
 * 分配售后任务
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.assignedTo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: assignedTo',
        },
        { status: 400 }
      );
    }

    const result = await afterSalesTaskService.assignTask(
      params.id,
      body.assignedTo
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.task,
      message: '任务分配成功',
    });
  } catch (error) {
    console.error('Error in POST /api/after-sales/tasks/[id]/assign:', error);
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
 * POST /api/after-sales/tasks/[id]/complete
 * 完成售后任务
 */
export async function COMPLETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const result = await afterSalesTaskService.completeTask(
      params.id,
      body.completedBy,
      body.completionNote
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.task,
      message: '任务完成成功',
    });
  } catch (error) {
    console.error('Error in POST /api/after-sales/tasks/[id]/complete:', error);
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
 * POST /api/after-sales/tasks/[id]/cancel
 * 取消售后任务
 */
export async function CANCEL(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const result = await afterSalesTaskService.cancelTask(
      params.id,
      body.cancelReason
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.task,
      message: '任务取消成功',
    });
  } catch (error) {
    console.error('Error in POST /api/after-sales/tasks/[id]/cancel:', error);
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
 * POST /api/after-sales/tasks/[id]/escalate
 * 升级售后任务
 */
export async function ESCALATE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.priority) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: priority',
        },
        { status: 400 }
      );
    }

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

    const result = await afterSalesTaskService.escalateTask(
      params.id,
      body.priority,
      body.escalationReason
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.task,
      message: '任务升级成功',
    });
  } catch (error) {
    console.error('Error in POST /api/after-sales/tasks/[id]/escalate:', error);
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
 * DELETE /api/after-sales/tasks/[id]
 * 删除售后任务
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await afterSalesTaskService.deleteTask(params.id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    console.error('Error in DELETE /api/after-sales/tasks/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
