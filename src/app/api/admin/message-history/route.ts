import { NextRequest, NextResponse } from 'next/server';

/**
 * 消息发送历史 API
 * GET /api/admin/message-history - 获取消息发送历史
 */

// GET - 获取消息发送历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get('robotId');
    const commandType = searchParams.get('commandType');
    const status = searchParams.get('status');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        rc.*,
        r.name as robot_name,
        r.nickname as robot_nickname,
        r.company as robot_company
      FROM robot_commands rc
      LEFT JOIN robots r ON rc.robot_id = r.robot_id
      WHERE rc.command_type IN ('send_group_message', 'send_private_message', 'send_message', 'batch_send_message')
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (robotId) {
      query += ` AND rc.robot_id = $${paramIndex++}`;
      params.push(robotId);
    }

    if (commandType) {
      query += ` AND rc.command_type = $${paramIndex++}`;
      params.push(commandType);
    }

    if (status) {
      query += ` AND rc.status = $${paramIndex++}`;
      params.push(status);
    }

    if (startTime) {
      query += ` AND rc.created_at >= $${paramIndex++}`;
      params.push(startTime);
    }

    if (endTime) {
      query += ` AND rc.created_at <= $${paramIndex++}`;
      params.push(endTime);
    }

    query += ` ORDER BY rc.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await execSQL(query, params);

    // 获取总数
    let countQuery = `SELECT COUNT(*) FROM robot_commands rc WHERE rc.command_type IN ('send_group_message', 'send_private_message', 'send_message', 'batch_send_message')`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (robotId) {
      countQuery += ` AND rc.robot_id = $${countParamIndex++}`;
      countParams.push(robotId);
    }

    if (commandType) {
      countQuery += ` AND rc.command_type = $${countParamIndex++}`;
      countParams.push(commandType);
    }

    if (status) {
      countQuery += ` AND rc.status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (startTime) {
      countQuery += ` AND rc.created_at >= $${countParamIndex++}`;
      countParams.push(startTime);
    }

    if (endTime) {
      countQuery += ` AND rc.created_at <= $${countParamIndex++}`;
      countParams.push(endTime);
    }

    const countResult = await execSQL(countQuery, countParams);

    // 获取统计信息
    const statsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM robot_commands
      WHERE command_type IN ('send_group_message', 'send_private_message', 'send_message', 'batch_send_message')
      GROUP BY status
    `;
    const statsResult = await execSQL(statsQuery, []);

    // 字段映射：将数据库字段名转换为前端期望的字段名
    const mappedData = result.rows.map((row: any) => ({
      id: row.id,
      commandId: row.id,
      robotId: row.robot_id,
      robotName: row.robot_name,
      robotNickname: row.robot_nickname,
      robotCompany: row.robot_company,
      commandType: row.command_type,
      commandPayload: row.command_data,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      executedAt: row.executed_at,
      completedAt: row.completed_at,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      result: row.result,
      errorMessage: row.error_message,
      recipient: null,
      atList: null,
      messageContent: row.command_data
    }));

    return NextResponse.json({
      success: true,
      data: mappedData,
      total: parseInt(countResult.rows[0].count),
      stats: statsResult.rows,
      limit,
      offset
    });
  } catch (error) {
    console.error('获取消息发送历史失败:', error);
    return NextResponse.json(
      { success: false, message: '获取消息发送历史失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 辅助函数：执行 SQL
async function execSQL(query: string, params: any[]) {
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    await client.end();
  }
}
