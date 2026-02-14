/**
 * 监控接口 - 活跃用户排行
 * 路径: /api/monitoring/active-users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sessionMessages } from '../../../../../server/database/schema';
import { sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // 限制数量
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // 获取数据库连接
    const db = await getDb();

    // 查询活跃用户排行
    const activeUsersQuery = sql`
      SELECT 
        user_id as "userId",
        user_name as "userName",
        COUNT(*) as "totalMessages",
        COUNT(DISTINCT group_ref) as "groupCount"
      FROM session_messages
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY user_id, user_name
      ORDER BY COUNT(*) DESC
      LIMIT ${safeLimit}
    `;

    const result = await db.execute(activeUsersQuery);

    // 格式化数据
    const formattedUsers = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      userId: row.userId,
      userName: row.userName || '未知用户',
      totalMessages: parseInt(row.totalMessages),
      groupCount: parseInt(row.groupCount),
      activityLevel: parseInt(row.totalMessages) > 50 ? 'high' : parseInt(row.totalMessages) > 20 ? 'medium' : 'low'
    }));

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        users: formattedUsers,
        stats: {
          totalUsers: formattedUsers.length,
          totalMessages: formattedUsers.reduce((sum: number, u: any) => sum + u.totalMessages, 0),
          totalGroups: formattedUsers.reduce((sum: number, u: any) => sum + u.groupCount, 0),
          avgMessages: formattedUsers.length > 0
            ? Math.round(formattedUsers.reduce((sum: number, u: any) => sum + u.totalMessages, 0) / formattedUsers.length)
            : 0,
          highActivity: formattedUsers.filter((u: any) => u.activityLevel === 'high').length,
          mediumActivity: formattedUsers.filter((u: any) => u.activityLevel === 'medium').length,
          lowActivity: formattedUsers.filter((u: any) => u.activityLevel === 'low').length
        },
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[活跃用户排行] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取活跃用户排行失败',
      data: null
    }, { status: 500 });
  }
}
