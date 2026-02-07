import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { keywordTriggers, businessRoles } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import * as schema from '@/storage/database/shared/schema';

/**
 * 导出关键词分析数据为 CSV
 * GET /api/collaboration/analytics/keywords/export
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const robotId = searchParams.get('robotId');
    const businessRole = searchParams.get('businessRole');
    const keyword = searchParams.get('keyword');

    // 构建过滤条件
    const conditions = [];
    if (startTime) {
      conditions.push(gte(keywordTriggers.createdAt, new Date(startTime)));
    }
    if (endTime) {
      conditions.push(lte(keywordTriggers.createdAt, new Date(endTime)));
    }
    if (robotId) {
      conditions.push(eq(keywordTriggers.robotId, robotId));
    }
    if (businessRole) {
      conditions.push(eq(keywordTriggers.businessRoleId, businessRole));
    }
    if (keyword) {
      conditions.push(sql`LOWER(${keywordTriggers.keyword}) LIKE LOWER('%${keyword}%')`);
    }

    const db = await getDb(schema);

    // 查询关键词统计数据
    const data = await db
      .select({
        keyword: keywordTriggers.keyword,
        businessRoleId: keywordTriggers.businessRoleId,
        triggerCount: sql<number>`COUNT(*)`,
        aiReplyCount: sql<number>`COUNT(*) FILTER (WHERE ${keywordTriggers.decisionOutcome} = 'ai_reply')`,
        staffReplyCount: sql<number>`COUNT(*) FILTER (WHERE ${keywordTriggers.decisionOutcome} = 'staff_reply')`,
        bothReplyCount: sql<number>`COUNT(*) FILTER (WHERE ${keywordTriggers.decisionOutcome} = 'both')`,
        noneReplyCount: sql<number>`COUNT(*) FILTER (WHERE ${keywordTriggers.decisionOutcome} = 'none')`,
        lastTriggeredAt: sql<string>`MAX(${keywordTriggers.createdAt})`,
      })
      .from(keywordTriggers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(keywordTriggers.keyword, keywordTriggers.businessRoleId)
      .orderBy(sql`COUNT(*) DESC`);

    // 获取业务角色详细信息
    const allBusinessRoles = await db.query.businessRoles.findMany();

    // 构建 CSV 数据
    const csvHeaders = [
      '关键词',
      '业务角色代码',
      '业务角色名称',
      'AI行为',
      '触发次数',
      'AI回复数',
      '工作人员回复数',
      '都回复数',
      '不回复数',
      '工作人员回复率',
      '最后触发时间',
    ];

    const csvRows = data.map(stat => {
      const roleInfo = allBusinessRoles.find(r => r.id === stat.businessRoleId);
      const triggerCount = Number(stat.triggerCount) || 0;
      const staffReplyCount = Number(stat.staffReplyCount) || 0;
      const staffReplyRate = triggerCount > 0 ? ((staffReplyCount / triggerCount) * 100).toFixed(2) : '0.00';

      return [
        stat.keyword,
        roleInfo?.code || 'unknown',
        roleInfo?.name || '未知角色',
        roleInfo?.aiBehavior || 'unknown',
        triggerCount,
        Number(stat.aiReplyCount),
        Number(stat.staffReplyCount),
        Number(stat.bothReplyCount),
        Number(stat.noneReplyCount),
        `${staffReplyRate}%`,
        stat.lastTriggeredAt || '',
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
    const filename = `keyword-analysis-${timestamp}.csv`;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/collaboration/analytics/keywords/export:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
