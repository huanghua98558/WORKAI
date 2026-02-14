/**
 * 监控接口 - 活跃群排行
 * 路径: /api/monitoring/active-groups
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // 限制数量
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // 获取数据库连接
    const db = await getDb();

    // 查询活跃群排行
    const activeGroupsQuery = sql`
      SELECT 
        group_ref as "groupId",
        group_name as "groupName",
        COUNT(*) as "totalMessages",
        COUNT(DISTINCT user_id) as "activeUsers"
      FROM session_messages
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY group_ref, group_name
      ORDER BY COUNT(*) DESC
      LIMIT ${safeLimit}
    `;

    const result = await db.execute(activeGroupsQuery);

    // 格式化数据
    const formattedGroups = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      groupId: row.groupId,
      groupName: row.groupName || '未知群组',
      totalMessages: parseInt(row.totalMessages),
      activeUsers: parseInt(row.activeUsers),
      activityLevel: parseInt(row.totalMessages) > 100 ? 'high' : parseInt(row.totalMessages) > 50 ? 'medium' : 'low'
    }));

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        groups: formattedGroups,
        stats: {
          totalGroups: formattedGroups.length,
          totalMessages: formattedGroups.reduce((sum: number, g: any) => sum + g.totalMessages, 0),
          avgMessages: formattedGroups.length > 0
            ? Math.round(formattedGroups.reduce((sum: number, g: any) => sum + g.totalMessages, 0) / formattedGroups.length)
            : 0,
          highActivity: formattedGroups.filter((g: any) => g.activityLevel === 'high').length,
          mediumActivity: formattedGroups.filter((g: any) => g.activityLevel === 'medium').length,
          lowActivity: formattedGroups.filter((g: any) => g.activityLevel === 'low').length
        },
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[活跃群排行] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取活跃群排行失败',
      data: null
    }, { status: 500 });
  }
}
