import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { collaborationDecisionLogs, staffActivities, tasks, keywordTriggers, businessRoles, robots } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, sql, count, desc, avg } from 'drizzle-orm';
import * as schema from '@/storage/database/shared/schema';

/**
 * 按业务角色统计协同分析数据
 * GET /api/collaboration/analytics/business-role
 *
 * 查询参数:
 * - startTime: 开始时间 (ISO 8601)
 * - endTime: 结束时间 (ISO 8601)
 * - robotId: 机器人ID (可选)
 * - businessRole: 业务角色代码 (可选)
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
      conditions.push(gte(collaborationDecisionLogs.createdAt, new Date(startTime)));
    }
    if (endTime) {
      conditions.push(lte(collaborationDecisionLogs.createdAt, new Date(endTime)));
    }
    if (robotId) {
      conditions.push(eq(collaborationDecisionLogs.robotId, robotId));
    }
    if (businessRole) {
      conditions.push(eq(collaborationDecisionLogs.businessRole, businessRole));
    }

    const db = await getDb(schema);

    // 1. 按业务角色统计决策数据
    const decisionStats = await db
      .select({
        businessRole: collaborationDecisionLogs.businessRole,
        totalDecisions: count(collaborationDecisionLogs.id),
        aiReplyCount: count(sql`CASE WHEN ${collaborationDecisionLogs.aiAction} = 'replied' THEN 1 END`),
        staffReplyCount: count(sql`CASE WHEN ${collaborationDecisionLogs.staffAction} = 'replied' THEN 1 END`),
        highPriorityCount: count(sql`CASE WHEN ${collaborationDecisionLogs.priority} = 'high' THEN 1 END`),
        mediumPriorityCount: count(sql`CASE WHEN ${collaborationDecisionLogs.priority} = 'medium' THEN 1 END`),
        lowPriorityCount: count(sql`CASE WHEN ${collaborationDecisionLogs.priority} = 'low' THEN 1 END`),
      })
      .from(collaborationDecisionLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(collaborationDecisionLogs.businessRole)
      .orderBy(desc(count(collaborationDecisionLogs.id)));

    // 2. 获取业务角色详细信息
    const allBusinessRoles = await db.query.businessRoles.findMany();

    // 3. 获取机器人信息
    const allRobots = await db.query.robots.findMany();

    // 4. 构建完整的结果
    const businessRoleAnalysis = decisionStats.map(stat => {
      const roleInfo = allBusinessRoles.find(r => r.code === stat.businessRole);
      const aiReplyRate = stat.totalDecisions > 0
        ? ((stat.aiReplyCount / stat.totalDecisions) * 100).toFixed(2)
        : '0.00';
      const staffReplyRate = stat.totalDecisions > 0
        ? ((stat.staffReplyCount / stat.totalDecisions) * 100).toFixed(2)
        : '0.00';

      return {
        businessRole: stat.businessRole,
        businessRoleName: roleInfo?.name || '未知角色',
        businessRoleDescription: roleInfo?.description || '',
        aiBehavior: roleInfo?.aiBehavior || 'unknown',
        staffEnabled: roleInfo?.staffEnabled ?? false,
        enableTaskCreation: roleInfo?.enableTaskCreation ?? false,
        stats: {
          totalDecisions: stat.totalDecisions,
          aiReplyCount: stat.aiReplyCount,
          staffReplyCount: stat.staffReplyCount,
          aiReplyRate: parseFloat(aiReplyRate),
          staffReplyRate: parseFloat(staffReplyRate),
          priorityDistribution: {
            high: stat.highPriorityCount,
            medium: stat.mediumPriorityCount,
            low: stat.lowPriorityCount,
          },
        },
      };
    });

    // 5. 计算总体统计
    const totalDecisions = decisionStats.reduce((sum, stat) => sum + stat.totalDecisions, 0);
    const totalAiReplies = decisionStats.reduce((sum, stat) => sum + stat.aiReplyCount, 0);
    const totalStaffReplies = decisionStats.reduce((sum, stat) => sum + stat.staffReplyCount, 0);

    const overallStats = {
      totalDecisions,
      totalAiReplies,
      totalStaffReplies,
      overallAiReplyRate: totalDecisions > 0
        ? ((totalAiReplies / totalDecisions) * 100).toFixed(2)
        : '0.00',
      overallStaffReplyRate: totalDecisions > 0
        ? ((totalStaffReplies / totalDecisions) * 100).toFixed(2)
        : '0.00',
      activeBusinessRoles: decisionStats.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        businessRoleAnalysis,
        overallStats,
        robots: allRobots.map(r => ({
          id: r.id,
          robotId: r.robotId,
          name: r.name,
          status: r.status,
          isActive: r.isActive,
        })),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/collaboration/analytics/business-role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
