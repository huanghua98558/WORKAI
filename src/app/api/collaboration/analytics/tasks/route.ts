import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { tasks, businessRoles, robots, staff } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, sql, count, desc, avg } from 'drizzle-orm';
import * as schema from '@/storage/database/shared/schema';

/**
 * 任务统计 API
 * GET /api/collaboration/analytics/tasks
 *
 * 查询参数:
 * - startTime: 开始时间 (ISO 8601)
 * - endTime: 结束时间 (ISO 8601)
 * - robotId: 机器人ID (可选)
 * - businessRole: 业务角色ID (可选)
 * - status: 任务状态 (可选)
 * - priority: 优先级 (可选)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const robotId = searchParams.get('robotId');
    const businessRole = searchParams.get('businessRole');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // 构建过滤条件
    const conditions = [];
    if (startTime) {
      conditions.push(gte(tasks.createdAt, new Date(startTime)));
    }
    if (endTime) {
      conditions.push(lte(tasks.createdAt, new Date(endTime)));
    }
    if (robotId) {
      conditions.push(eq(tasks.robotId, robotId));
    }
    if (businessRole) {
      conditions.push(eq(tasks.businessRoleId, businessRole));
    }
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    if (priority) {
      conditions.push(eq(tasks.priority, priority));
    }

    const db = await getDb(schema);

    // 1. 按业务角色统计任务
    const businessRoleStats = await db
      .select({
        businessRoleId: tasks.businessRoleId,
        totalTasks: count(tasks.id),
        pendingCount: count(sql`CASE WHEN ${tasks.status} = 'pending' THEN 1 END`),
        processingCount: count(sql`CASE WHEN ${tasks.status} = 'processing' THEN 1 END`),
        completedCount: count(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`),
        cancelledCount: count(sql`CASE WHEN ${tasks.status} = 'cancelled' THEN 1 END`),
        highPriorityCount: count(sql`CASE WHEN ${tasks.priority} = 'high' THEN 1 END`),
        normalPriorityCount: count(sql`CASE WHEN ${tasks.priority} = 'normal' THEN 1 END`),
        lowPriorityCount: count(sql`CASE WHEN ${tasks.priority} = 'low' THEN 1 END`),
      })
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(tasks.businessRoleId)
      .orderBy(desc(count(tasks.id)));

    // 2. 获取业务角色详细信息
    const allBusinessRoles = await db.query.businessRoles.findMany();

    // 3. 获取机器人信息
    const allRobots = await db.query.robots.findMany();

    // 4. 获取工作人员信息
    const allStaff = await db.query.staff.findMany();

    // 5. 构建业务角色分析结果
    const taskAnalysis = businessRoleStats.map(stat => {
      const roleInfo = allBusinessRoles.find(r => r.id === stat.businessRoleId);
      const completionRate = stat.totalTasks > 0
        ? ((stat.completedCount / stat.totalTasks) * 100).toFixed(2)
        : '0.00';

      return {
        businessRoleId: stat.businessRoleId,
        businessRoleCode: roleInfo?.code || 'unknown',
        businessRoleName: roleInfo?.name || '未知角色',
        enableTaskCreation: roleInfo?.enableTaskCreation ?? false,
        aiBehavior: roleInfo?.aiBehavior || 'unknown',
        stats: {
          totalTasks: stat.totalTasks,
          pendingTasks: stat.pendingCount,
          processingTasks: stat.processingCount,
          completedTasks: stat.completedCount,
          cancelledTasks: stat.cancelledCount,
          completionRate: parseFloat(completionRate),
          priorityDistribution: {
            high: stat.highPriorityCount,
            normal: stat.normalPriorityCount,
            low: stat.lowPriorityCount,
          },
        },
      };
    });

    // 6. 计算总体统计
    const totalTasks = businessRoleStats.reduce((sum, stat) => sum + stat.totalTasks, 0);
    const totalCompleted = businessRoleStats.reduce((sum, stat) => sum + stat.completedCount, 0);
    const totalPending = businessRoleStats.reduce((sum, stat) => sum + stat.pendingCount, 0);
    const totalProcessing = businessRoleStats.reduce((sum, stat) => sum + stat.processingCount, 0);

    const overallStats = {
      totalTasks,
      completedTasks: totalCompleted,
      pendingTasks: totalPending,
      processingTasks: totalProcessing,
      cancelledTasks: businessRoleStats.reduce((sum, stat) => sum + stat.cancelledCount, 0),
      overallCompletionRate: totalTasks > 0
        ? ((totalCompleted / totalTasks) * 100).toFixed(2)
        : '0.00',
      activeBusinessRoles: businessRoleStats.length,
    };

    // 7. 获取最近的任务列表
    const recentTasks = await db.query.tasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(tasks.createdAt)],
      limit: 10,
    });

    const recentTasksWithDetails = recentTasks.map(task => {
      const roleInfo = allBusinessRoles.find(r => r.id === task.businessRoleId);
      const robotInfo = allRobots.find(r => r.id === task.robotId);
      const staffInfo = allStaff.find(s => s.id === task.staffUserId);

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
        businessRole: roleInfo ? {
          id: roleInfo.id,
          code: roleInfo.code,
          name: roleInfo.name,
        } : null,
        robot: robotInfo ? {
          id: robotInfo.id,
          robotId: robotInfo.robotId,
          name: robotInfo.name,
        } : null,
        staff: staffInfo ? {
          id: staffInfo.id,
          name: staffInfo.name,
          email: staffInfo.email,
        } : null,
      };
    });

    // 8. 提供建议
    const suggestions = [];
    if (overallStats.pendingTasks > 10) {
      suggestions.push({
        type: 'alert',
        level: 'warning',
        message: `当前有 ${overallStats.pendingTasks} 个待处理任务，建议及时处理`,
        count: overallStats.pendingTasks,
      });
    }

    if (parseFloat(overallStats.overallCompletionRate) < 80) {
      suggestions.push({
        type: 'alert',
        level: 'info',
        message: `当前任务完成率为 ${overallStats.overallCompletionRate}%，建议优化任务处理流程`,
        rate: parseFloat(overallStats.overallCompletionRate),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        taskAnalysis,
        overallStats,
        recentTasks: recentTasksWithDetails,
        suggestions,
        businessRoles: allBusinessRoles.map(r => ({
          id: r.id,
          code: r.code,
          name: r.name,
          enableTaskCreation: r.enableTaskCreation,
        })),
        robots: allRobots.map(r => ({
          id: r.id,
          robotId: r.robotId,
          name: r.name,
          status: r.status,
        })),
        staff: allStaff.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          status: s.status,
        })),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/collaboration/analytics/tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
