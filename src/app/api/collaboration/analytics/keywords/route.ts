import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { keywordTriggers, businessRoles, robots } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm';
import * as schema from '@/storage/database/shared/schema';

/**
 * 关键词分析 API
 * GET /api/collaboration/analytics/keywords
 *
 * 查询参数:
 * - startTime: 开始时间 (ISO 8601)
 * - endTime: 结束时间 (ISO 8601)
 * - robotId: 机器人ID (可选)
 * - businessRole: 业务角色代码 (可选)
 * - keyword: 关键词 (可选，模糊匹配)
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
      conditions.push(gte(keywordTriggers.createdAt, new Date(startTime).toISOString()));
    }
    if (endTime) {
      conditions.push(lte(keywordTriggers.createdAt, new Date(endTime).toISOString()));
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

    // 1. 按关键词统计触发次数
    const keywordStats = await db
      .select({
        keyword: keywordTriggers.keyword,
        businessRoleId: keywordTriggers.businessRoleId,
        triggerCount: count(keywordTriggers.id),
        aiReplyCount: count(sql`CASE WHEN ${keywordTriggers.decisionOutcome} = 'ai_reply' THEN 1 END`),
        staffReplyCount: count(sql`CASE WHEN ${keywordTriggers.decisionOutcome} = 'staff_reply' THEN 1 END`),
        bothReplyCount: count(sql`CASE WHEN ${keywordTriggers.decisionOutcome} = 'both' THEN 1 END`),
        noneReplyCount: count(sql`CASE WHEN ${keywordTriggers.decisionOutcome} = 'none' THEN 1 END`),
        lastTriggeredAt: sql<Date>`MAX(${keywordTriggers.createdAt})`.mapWith(
          (value: string) => new Date(value)
        ),
      })
      .from(keywordTriggers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(keywordTriggers.keyword, keywordTriggers.businessRoleId)
      .orderBy(desc(count(keywordTriggers.id)));

    // 2. 获取业务角色详细信息
    const allBusinessRoles = await db.select().from(businessRoles);

    // 3. 获取机器人信息
    const allRobots = await db.select().from(robots);

    // 4. 构建完整的结果
    const keywordAnalysis = keywordStats.map(stat => {
      const roleInfo = allBusinessRoles.find(r => r.id === stat.businessRoleId);
      const triggerRate = stat.triggerCount > 0
        ? ((stat.staffReplyCount / stat.triggerCount) * 100).toFixed(2)
        : '0.00';

      return {
        keyword: stat.keyword,
        businessRoleId: stat.businessRoleId,
        businessRoleCode: roleInfo?.code || 'unknown',
        businessRoleName: roleInfo?.name || '未知角色',
        aiBehavior: roleInfo?.aiBehavior || 'unknown',
        keywords: roleInfo?.keywords || [],
        stats: {
          triggerCount: stat.triggerCount,
          aiReplyCount: stat.aiReplyCount,
          staffReplyCount: stat.staffReplyCount,
          bothReplyCount: stat.bothReplyCount,
          noneReplyCount: stat.noneReplyCount,
          staffReplyRate: parseFloat(triggerRate),
          lastTriggeredAt: stat.lastTriggeredAt?.toISOString() || null,
        },
      };
    });

    // 5. 计算总体统计
    const totalTriggers = keywordStats.reduce((sum, stat) => sum + stat.triggerCount, 0);
    const totalAiReplies = keywordStats.reduce((sum, stat) => sum + stat.aiReplyCount, 0);
    const totalStaffReplies = keywordStats.reduce((sum, stat) => sum + stat.staffReplyCount, 0);
    const uniqueKeywords = new Set(keywordStats.map(s => s.keyword)).size;

    const overallStats = {
      totalTriggers,
      totalAiReplies,
      totalStaffReplies,
      uniqueKeywords,
      overallStaffReplyRate: totalTriggers > 0
        ? ((totalStaffReplies / totalTriggers) * 100).toFixed(2)
        : '0.00',
    };

    // 6. 提供优化建议
    const suggestions = [];
    if (keywordAnalysis.length > 0) {
      // 找出触发率高但工作人员回复率低的关键词
      const lowStaffReplyKeywords = keywordAnalysis
        .filter(k => k.stats.triggerCount >= 10 && k.stats.staffReplyRate < 30)
        .slice(0, 3);

      if (lowStaffReplyKeywords.length > 0) {
        suggestions.push({
          type: 'optimization',
          level: 'warning',
          message: '以下关键词触发率高但工作人员回复率较低，建议优化AI回复质量：',
          keywords: lowStaffReplyKeywords.map(k => ({
            keyword: k.keyword,
            triggerCount: k.stats.triggerCount,
            staffReplyRate: k.stats.staffReplyRate,
          })),
        });
      }

      // 找出从未触发或触发次数极少的关键词
      const lowTriggerKeywords = keywordAnalysis
        .filter(k => k.stats.triggerCount <= 2)
        .slice(0, 3);

      if (lowTriggerKeywords.length > 0) {
        suggestions.push({
          type: 'optimization',
          level: 'info',
          message: '以下关键词触发次数极少，建议检查是否需要调整关键词配置：',
          keywords: lowTriggerKeywords.map(k => ({
            keyword: k.keyword,
            triggerCount: k.stats.triggerCount,
            businessRole: k.businessRoleName,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        keywordAnalysis,
        overallStats,
        suggestions,
        robots: allRobots.map(r => ({
          id: r.id,
          robotId: r.robotId,
          name: r.name,
          status: r.status,
        })),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/collaboration/analytics/keywords:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
