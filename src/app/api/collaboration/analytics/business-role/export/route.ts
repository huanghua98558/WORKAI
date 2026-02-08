import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { collaborationDecisionLogs, businessRoles } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import * as schema from '@/storage/database/shared/schema';

/**
 * 导出业务角色分析数据为 CSV
 * GET /api/collaboration/analytics/business-role/export
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const robotId = searchParams.get('robotId');
    const businessRole = searchParams.get('businessRole');

    // 构建时间过滤条件
    const conditions = [];
    if (startTime) {
      conditions.push(gte(collaborationDecisionLogs.createdAt, new Date(startTime).toISOString()));
    }
    if (endTime) {
      conditions.push(lte(collaborationDecisionLogs.createdAt, new Date(endTime).toISOString()));
    }
    if (robotId) {
      conditions.push(eq(collaborationDecisionLogs.robotId, robotId));
    }
    if (businessRole) {
      conditions.push(eq(collaborationDecisionLogs.businessRole, businessRole));
    }

    const db = await getDb(schema);

    // 查询业务角色统计数据
    const data = await db
      .select({
        businessRole: collaborationDecisionLogs.businessRole,
        totalDecisions: sql<number>`COUNT(*)`,
        aiReplyCount: sql<number>`COUNT(*) FILTER (WHERE ${collaborationDecisionLogs.aiAction} = 'replied')`,
        staffReplyCount: sql<number>`COUNT(*) FILTER (WHERE ${collaborationDecisionLogs.staffAction} = 'replied')`,
        highPriorityCount: sql<number>`COUNT(*) FILTER (WHERE ${collaborationDecisionLogs.priority} = 'high')`,
        mediumPriorityCount: sql<number>`COUNT(*) FILTER (WHERE ${collaborationDecisionLogs.priority} = 'medium')`,
        lowPriorityCount: sql<number>`COUNT(*) FILTER (WHERE ${collaborationDecisionLogs.priority} = 'low')`,
      })
      .from(collaborationDecisionLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(collaborationDecisionLogs.businessRole)
      .orderBy(sql`COUNT(*) DESC`);

    // 获取业务角色详细信息
    const allBusinessRoles = await db.select().from(businessRoles);

    // 构建 CSV 数据
    const csvHeaders = [
      '业务角色代码',
      '业务角色名称',
      '描述',
      'AI行为',
      '工作人员启用',
      '任务创建',
      '总决策数',
      'AI回复数',
      '工作人员回复数',
      'AI回复率',
      '工作人员回复率',
      '高优先级',
      '中优先级',
      '低优先级',
    ];

    const csvRows = data.map(stat => {
      const roleInfo = allBusinessRoles.find(r => r.code === stat.businessRole);
      const totalDecisions = Number(stat.totalDecisions) || 0;
      const aiReplyCount = Number(stat.aiReplyCount) || 0;
      const staffReplyCount = Number(stat.staffReplyCount) || 0;
      const aiReplyRate = totalDecisions > 0 ? ((aiReplyCount / totalDecisions) * 100).toFixed(2) : '0.00';
      const staffReplyRate = totalDecisions > 0 ? ((staffReplyCount / totalDecisions) * 100).toFixed(2) : '0.00';

      return [
        stat.businessRole || '未设置',
        roleInfo?.name || '未知角色',
        roleInfo?.description || '',
        roleInfo?.aiBehavior || 'unknown',
        roleInfo?.staffEnabled ? '是' : '否',
        roleInfo?.enableTaskCreation ? '是' : '否',
        totalDecisions,
        aiReplyCount,
        staffReplyCount,
        `${aiReplyRate}%`,
        `${staffReplyRate}%`,
        Number(stat.highPriorityCount),
        Number(stat.mediumPriorityCount),
        Number(stat.lowPriorityCount),
      ];
    });

    // 生成 CSV 内容
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // 添加 UTF-8 BOM 以支持 Excel 中文显示
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // 设置响应头
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `business-role-analysis-${timestamp}.csv`;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/collaboration/analytics/business-role/export:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
