/**
 * 监控接口 - 活跃会话
 * 路径: /api/monitoring/active-sessions
 */

import { NextRequest, NextResponse } from 'next/server';
const { getDb } = require('coze-coding-dev-sdk');
const { sessionMessages, robots } = require('../../../../../server/database/schema');
const { sql, desc, eq, and, gte } = require('drizzle-orm');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const activeHours = parseInt(searchParams.get('activeHours') || '1', 10); // 活跃时间范围（小时）

    // 获取数据库连接
    const db = await getDb();

    // 计算活跃时间阈值
    const activeThreshold = new Date();
    activeThreshold.setHours(activeThreshold.getHours() - activeHours);

    // 查询活跃会话
    // 逻辑：按sessionId分组，获取每个会话的最后消息时间、消息数、最后消息内容
    const activeSessionsQuery = sql`
      WITH session_stats AS (
        SELECT
          sm.session_id as "sessionId",
          sm.user_id as "userId",
          sm.group_ref as "groupId",
          sm.user_name as "userName",
          sm.group_name as "groupName",
          sm.robot_id as "robotId",
          sm.is_human as "isHuman",
          COUNT(*) as "messageCount",
          MAX(sm.timestamp) as "lastActiveTime",
          MAX(sm.content) FILTER (WHERE sm.timestamp = (
            SELECT MAX(timestamp) FROM session_messages WHERE session_id = sm.session_id
          )) as "lastMessage"
        FROM session_messages sm
        WHERE sm.timestamp >= ${activeThreshold.toISOString()}
        GROUP BY sm.session_id, sm.user_id, sm.group_ref, sm.user_name, sm.group_name, sm.robot_id, sm.is_human
        ORDER BY MAX(sm.timestamp) DESC
        LIMIT ${limit}
      )
      SELECT
        ss."sessionId",
        ss."userId",
        ss."groupId",
        ss."userName",
        ss."groupName",
        ss."robotId",
        ss."isHuman",
        ss."messageCount",
        ss."lastActiveTime",
        ss."lastMessage",
        r.name as "robotName",
        r.nickname as "robotNickname",
        CASE WHEN ss."isHuman" = true THEN 'human' ELSE 'auto' END as "status"
      FROM session_stats ss
      LEFT JOIN robots r ON ss."robotId" = r.robot_id
    `;

    const sessions = await db.execute(activeSessionsQuery);

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: sessions.rows.map((row: any) => ({
        sessionId: row.sessionId,
        userId: row.userId,
        groupId: row.groupId,
        userName: row.userName || '未知用户',
        groupName: row.groupName || '未知群组',
        status: row.status === 'human' ? 'human' : 'auto',
        lastActiveTime: row.lastActiveTime,
        messageCount: parseInt(row.messageCount),
        lastMessage: row.lastMessage || '暂无消息',
        robotId: row.robotId,
        robotName: row.robotName,
        robotNickname: row.robotNickname
      })),
      stats: {
        totalSessions: sessions.rows.length,
        humanSessions: sessions.rows.filter((r: any) => r.status === 'human').length,
        autoSessions: sessions.rows.filter((r: any) => r.status === 'auto').length,
        totalMessages: sessions.rows.reduce((sum: number, r: any) => sum + parseInt(r.messageCount), 0)
      },
      meta: {
        activeHours,
        activeThreshold: activeThreshold.toISOString(),
        limit,
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[活跃会话] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取活跃会话失败',
      data: null
    }, { status: 500 });
  }
}
