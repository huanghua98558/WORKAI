/**
 * 监控接口 - 活跃群排行
 * 路径: /api/monitoring/active-groups
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

    // 获取活跃群排行
    const activeGroups = await monitor.getTopActiveGroups(
      date || undefined,
      safeLimit
    );

    // 格式化数据
    const formattedGroups = activeGroups.map((group, index) => ({
      rank: index + 1,
      groupId: group.groupId,
      totalMessages: group.totalMessages,
      // 可以添加更多字段，如平均消息间隔、活跃时间段等
      activityLevel: group.totalMessages > 100 ? 'high' : group.totalMessages > 50 ? 'medium' : 'low'
    }));

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        groups: formattedGroups,

        // 统计信息
        stats: {
          totalGroups: formattedGroups.length,
          totalMessages: formattedGroups.reduce((sum, g) => sum + g.totalMessages, 0),
          avgMessages: formattedGroups.length > 0
            ? Math.round(formattedGroups.reduce((sum, g) => sum + g.totalMessages, 0) / formattedGroups.length)
            : 0,
          highActivity: formattedGroups.filter(g => g.activityLevel === 'high').length,
          mediumActivity: formattedGroups.filter(g => g.activityLevel === 'medium').length,
          lowActivity: formattedGroups.filter(g => g.activityLevel === 'low').length
        },

        // 日期
        date: date || 'today',

        // 时间戳
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[活跃群排行] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '获取活跃群排行失败',
      data: null
    }, { status: 500 });
  }
}
