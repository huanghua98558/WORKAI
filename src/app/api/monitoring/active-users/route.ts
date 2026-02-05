/**
 * 监控接口 - 活跃用户排行
 * 路径: /api/monitoring/active-users
 */

import { NextRequest, NextResponse } from 'next/server';
const monitor = require('../../../../../server/services/monitor.service');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const date = searchParams.get('date');

    // 限制数量
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // 获取活跃用户排行
    const activeUsers = await monitor.getTopActiveUsers(
      date || undefined,
      safeLimit
    );

    // 格式化数据
    const formattedUsers = activeUsers.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      totalMessages: user.totalMessages,
      groupCount: user.groups.length,
      groups: user.groups,
      // 计算平均每群消息数
      avgMessagesPerGroup: user.groups.length > 0
        ? Math.round(user.totalMessages / user.groups.length)
        : 0,
      activityLevel: user.totalMessages > 50 ? 'high' : user.totalMessages > 20 ? 'medium' : 'low'
    }));

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        users: formattedUsers,

        // 统计信息
        stats: {
          totalUsers: formattedUsers.length,
          totalMessages: formattedUsers.reduce((sum, u) => sum + u.totalMessages, 0),
          totalGroups: formattedUsers.reduce((sum, u) => sum + u.groupCount, 0),
          avgMessages: formattedUsers.length > 0
            ? Math.round(formattedUsers.reduce((sum, u) => sum + u.totalMessages, 0) / formattedUsers.length)
            : 0,
          highActivity: formattedUsers.filter(u => u.activityLevel === 'high').length,
          mediumActivity: formattedUsers.filter(u => u.activityLevel === 'medium').length,
          lowActivity: formattedUsers.filter(u => u.activityLevel === 'low').length
        },

        // 日期
        date: date || 'today',

        // 时间戳
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[活跃用户排行] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '获取活跃用户排行失败',
      data: null
    }, { status: 500 });
  }
}
