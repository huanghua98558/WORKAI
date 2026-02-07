import { NextRequest, NextResponse } from 'next/server';
import {
  afterSalesTaskService,
  AfterSalesTaskStatus,
  AfterSalesTaskPriority,
} from '@/services/after-sales-task-service';

/**
 * GET /api/after-sales/tasks - 获取售后任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const staffUserId = searchParams.get('staffUserId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    let tasks = [];

    if (sessionId) {
      tasks = await afterSalesTaskService.getTasksBySessionId(sessionId);
    } else if (staffUserId) {
      tasks = await afterSalesTaskService.getTasksByStaffId(staffUserId);
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: sessionId or staffUserId' },
        { status: 400 }
      );
    }

    // 过滤
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('[API] 获取售后任务失败:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/after-sales/tasks - 创建售后任务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, staffUserId, staffName, userId, userName, taskType, title, description, messageId } = body;

    if (!sessionId || !userId || !userName) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: sessionId, userId, userName' },
        { status: 400 }
      );
    }

    const taskId = await afterSalesTaskService.createTask({
      sessionId,
      staffUserId,
      staffName,
      userId,
      userName,
      taskType,
      priority: AfterSalesTaskPriority.NORMAL,
      status: AfterSalesTaskStatus.PENDING,
      title,
      description,
      messageId,
      expectedResponseTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6小时后
    });

    if (taskId) {
      return NextResponse.json({
        success: true,
        data: { taskId },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to create task' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] 创建售后任务失败:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
