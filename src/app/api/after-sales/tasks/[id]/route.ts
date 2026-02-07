import { NextRequest, NextResponse } from 'next/server';
import { afterSalesTaskService, AfterSalesTaskStatus } from '@/services/after-sales-task-service';

/**
 * GET /api/after-sales/tasks/[id] - 获取任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await afterSalesTaskService.getTaskById(params.id);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('[API] 获取任务详情失败:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/after-sales/tasks/[id] - 更新任务
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, priority, note } = body;

    let success = false;

    if (status) {
      success = await afterSalesTaskService.updateTaskStatus(params.id, status as AfterSalesTaskStatus, note);
    }

    if (priority) {
      success = await afterSalesTaskService.updateTaskPriority(params.id, priority);
    }

    if (success) {
      const task = await afterSalesTaskService.getTaskById(params.id);
      return NextResponse.json({
        success: true,
        data: task,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update task' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] 更新任务失败:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/after-sales/tasks/[id] - 取消任务
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reason } = body;

    const success = await afterSalesTaskService.cancelTask(params.id, reason);

    if (success) {
      return NextResponse.json({
        success: true,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to cancel task' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] 取消任务失败:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
