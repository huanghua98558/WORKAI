import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { tasks, businessRoles } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import * as schema from '@/storage/database/shared/schema';

/**
 * 导出任务分析数据为 CSV
 * GET /api/collaboration/analytics/tasks/export
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
      conditions.push(gte(tasks.createdAt, new Date(startTime).toISOString()));
    }
    if (endTime) {
      conditions.push(lte(tasks.createdAt, new Date(endTime).toISOString()));
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

    // 查询任务统计数据
    const data = await db
      .select({
        businessRoleId: tasks.businessRoleId,
        totalTasks: sql<number>`COUNT(*)`,
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'pending')`,
        processingCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'processing')`,
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'completed')`,
        cancelledCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'cancelled')`,
        highPriorityCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.priority} = 'high')`,
        normalPriorityCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.priority} = 'normal')`,
        lowPriorityCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.priority} = 'low')`,
      })
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(tasks.businessRoleId)
      .orderBy(sql`COUNT(*) DESC`);

    // 获取业务角色详细信息
    const allBusinessRoles = await db.select().from(businessRoles);

    // 构建 CSV 数据
    const csvHeaders = [
      '业务角色代码',
      '业务角色名称',
      'AI行为',
      '任务创建启用',
      '总任务数',
      '待处理',
      '处理中',
      '已完成',
      '已取消',
      '完成率',
      '高优先级',
      '中优先级',
      '低优先级',
    ];

    const csvRows = data.map(stat => {
      const roleInfo = allBusinessRoles.find(r => r.id === stat.businessRoleId);
      const totalTasks = Number(stat.totalTasks) || 0;
      const completedCount = Number(stat.completedCount) || 0;
      const completionRate = totalTasks > 0 ? ((completedCount / totalTasks) * 100).toFixed(2) : '0.00';

      return [
        roleInfo?.code || 'unknown',
        roleInfo?.name || '未知角色',
        roleInfo?.aiBehavior || 'unknown',
        roleInfo?.enableTaskCreation ? '是' : '否',
        totalTasks,
        Number(stat.pendingCount),
        Number(stat.processingCount),
        Number(stat.completedCount),
        Number(stat.cancelledCount),
        `${completionRate}%`,
        Number(stat.highPriorityCount),
        Number(stat.normalPriorityCount),
        Number(stat.lowPriorityCount),
      ];
    });

    // 生成 CSV 内容
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // 添加 UTF-8 BOM
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // 设置响应头
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `task-analysis-${timestamp}.csv`;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/collaboration/analytics/tasks/export:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
