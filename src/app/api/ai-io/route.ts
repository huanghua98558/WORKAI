import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - 获取实时 AI 输入输出
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const robotId = searchParams.get('robotId');
    const type = searchParams.get('type');

    // 从数据库获取最近的消息
    const { getDb } = require('coze-coding-dev-sdk');
    const { sql } = require('drizzle-orm');
    const { sessionMessages } = require('../../../../server/database/schema');
    const db = await getDb();

    // 构建基础查询
    let query = db
      .select()
      .from(sessionMessages)
      .orderBy(sql`${sessionMessages.createdAt} DESC`)
      .limit(limit);

    // 应用过滤
    if (type && type !== 'all') {
      if (type === 'user') {
        query = query.where(sql`${sessionMessages.isFromUser} = true`);
      } else if (type === 'bot') {
        query = query.where(sql`${sessionMessages.isFromBot} = true`);
      }
    }

    if (robotId) {
      query = query.where(sql`${sessionMessages.robotId} = ${robotId}`);
    }

    const result = await query;

    // 格式化返回数据
    const messages = (result || []).map((msg: any) => ({
      id: msg.id,
      type: msg.isFromUser ? 'user' : msg.isFromBot ? 'bot' : 'other',
      sessionId: msg.sessionId,
      userName: msg.userName || 'Unknown',
      groupName: msg.groupName || 'Unknown',
      robotId: msg.robotId,
      robotName: msg.robotName,
      content: msg.content,
      intent: msg.intent,
      confidence: msg.confidence,
      timestamp: msg.createdAt,
      metadata: msg.extraData || {}
    }));

    return NextResponse.json({
      success: true,
      data: messages
    });
  } catch (error: any) {
    console.error('获取实时 AI 输入输出失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
