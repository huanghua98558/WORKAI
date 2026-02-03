import { NextRequest, NextResponse } from 'next/server';

/**
 * 回调日志查询 API
 * GET /api/admin/robot-callback-logs - 获取回调日志列表
 * POST /api/admin/robot-callback-logs - 记录回调日志
 */

// GET - 获取回调日志列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get('robotId');
    const commandId = searchParams.get('commandId');
    const sessionId = searchParams.get('sessionId');
    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');
    const errorType = searchParams.get('errorType');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        rcl.*,
        r.name as robot_name,
        rg.name as group_name,
        CASE 
          WHEN rcl.status = 'error' THEN 1
          WHEN rcl.status = 'warning' THEN 2
          WHEN rcl.status = 'info' THEN 3
          ELSE 4
        END as status_order
      FROM robot_callback_logs rcl
      LEFT JOIN robots r ON rcl.robot_id = r.robot_id
      LEFT JOIN robot_groups rg ON r.group_id = rg.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (robotId) {
      query += ` AND rcl.robot_id = $${paramIndex++}`;
      params.push(robotId);
    }

    if (commandId) {
      query += ` AND rcl.command_id = $${paramIndex++}`;
      params.push(commandId);
    }

    if (sessionId) {
      query += ` AND rcl.session_id = $${paramIndex++}`;
      params.push(sessionId);
    }

    if (status) {
      query += ` AND rcl.status = $${paramIndex++}`;
      params.push(status);
    }

    if (eventType) {
      query += ` AND rcl.event_type = $${paramIndex++}`;
      params.push(eventType);
    }

    if (errorType) {
      query += ` AND rcl.error_type = $${paramIndex++}`;
      params.push(errorType);
    }

    if (startTime) {
      query += ` AND rcl.created_at >= $${paramIndex++}`;
      params.push(startTime);
    }

    if (endTime) {
      query += ` AND rcl.created_at <= $${paramIndex++}`;
      params.push(endTime);
    }

    query += ` ORDER BY status_order, rcl.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await execSQL(query, params);

    // 获取总数
    let countQuery = `SELECT COUNT(*) FROM robot_callback_logs rcl WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (robotId) {
      countQuery += ` AND rcl.robot_id = $${countParamIndex++}`;
      countParams.push(robotId);
    }

    if (commandId) {
      countQuery += ` AND rcl.command_id = $${countParamIndex++}`;
      countParams.push(commandId);
    }

    if (sessionId) {
      countQuery += ` AND rcl.session_id = $${countParamIndex++}`;
      countParams.push(sessionId);
    }

    if (status) {
      countQuery += ` AND rcl.status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (eventType) {
      countQuery += ` AND rcl.event_type = $${countParamIndex++}`;
      countParams.push(eventType);
    }

    if (errorType) {
      countQuery += ` AND rcl.error_type = $${countParamIndex++}`;
      countParams.push(errorType);
    }

    if (startTime) {
      countQuery += ` AND rcl.created_at >= $${countParamIndex++}`;
      countParams.push(startTime);
    }

    if (endTime) {
      countQuery += ` AND rcl.created_at <= $${countParamIndex++}`;
      countParams.push(endTime);
    }

    const countResult = await execSQL(countQuery, countParams);

    // 获取统计信息
    const statsQuery = `
      SELECT 
        status,
        event_type,
        COUNT(*) as count
      FROM robot_callback_logs
      WHERE 1=1
      ${robotId ? `AND robot_id = '${robotId}'` : ''}
      ${commandId ? `AND command_id = '${commandId}'` : ''}
      ${sessionId ? `AND session_id = '${sessionId}'` : ''}
      ${startTime ? `AND created_at >= '${startTime}'` : ''}
      ${endTime ? `AND created_at <= '${endTime}'` : ''}
      GROUP BY status, event_type
    `;
    const statsResult = await execSQL(statsQuery, []);

    // 获取错误类型统计
    const errorStatsQuery = `
      SELECT 
        error_type,
        COUNT(*) as count
      FROM robot_callback_logs
      WHERE status = 'error' AND error_type IS NOT NULL
      ${robotId ? `AND robot_id = '${robotId}'` : ''}
      ${startTime ? `AND created_at >= '${startTime}'` : ''}
      ${endTime ? `AND created_at <= '${endTime}'` : ''}
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 10
    `;
    const errorStatsResult = await execSQL(errorStatsQuery, []);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      stats: {
        byStatusAndType: statsResult.rows,
        byErrorType: errorStatsResult.rows
      },
      limit,
      offset
    });
  } catch (error) {
    console.error('获取回调日志失败:', error);
    return NextResponse.json(
      { success: false, message: '获取回调日志失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 记录回调日志
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      robotId,
      sessionId,
      commandId,
      eventType,
      status,
      message,
      errorType,
      errorCode,
      responseBody,
      requestHeaders,
      requestBody,
      executionTime,
      metadata
    } = body;

    // 验证必填字段
    if (!robotId || !eventType) {
      return NextResponse.json(
        { success: false, message: '机器人ID和事件类型不能为空' },
        { status: 400 }
      );
    }

    // 检查机器人是否存在
    const checkRobotQuery = `SELECT id FROM robots WHERE robot_id = $1`;
    const robotResult = await execSQL(checkRobotQuery, [robotId]);

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '机器人不存在' },
        { status: 404 }
      );
    }

    // 生成日志ID
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 插入日志
    const query = `
      INSERT INTO robot_callback_logs (
        log_id, robot_id, session_id, command_id,
        event_type, status, message, error_type, error_code,
        response_body, request_headers, request_body,
        execution_time, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *
    `;

    const params = [
      logId,
      robotId,
      sessionId || null,
      commandId || null,
      eventType,
      status || 'info',
      message || null,
      errorType || null,
      errorCode || null,
      responseBody ? JSON.stringify(responseBody) : null,
      requestHeaders ? JSON.stringify(requestHeaders) : null,
      requestBody ? JSON.stringify(requestBody) : null,
      executionTime || null,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await execSQL(query, params);

    // 如果是错误状态，更新机器人的错误计数
    if (status === 'error') {
      const updateErrorCountQuery = `
        UPDATE robot_load_balancing
        SET error_count = error_count + 1,
            success_rate = GREATEST(0, success_rate - 1),
            updated_at = NOW()
        WHERE robot_id = $1
      `;
      await execSQL(updateErrorCountQuery, [robotId]);
    }

    // 如果是成功状态，更新机器人的成功率
    if (status === 'success') {
      const updateSuccessRateQuery = `
        UPDATE robot_load_balancing
        SET success_rate = LEAST(100, success_rate + 0.1),
            updated_at = NOW()
        WHERE robot_id = $1
      `;
      await execSQL(updateSuccessRateQuery, [robotId]);
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '记录回调日志成功'
    });
  } catch (error) {
    console.error('记录回调日志失败:', error);
    return NextResponse.json(
      { success: false, message: '记录回调日志失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 清理旧日志
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const beforeTime = searchParams.get('beforeTime');
    const status = searchParams.get('status');
    const robotId = searchParams.get('robotId');
    const retainDays = parseInt(searchParams.get('retainDays') || '7');

    // 如果没有指定时间，使用保留天数
    let cutoffTime = beforeTime;
    if (!cutoffTime) {
      cutoffTime = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000).toISOString();
    }

    let query = `DELETE FROM robot_callback_logs WHERE created_at < $1`;
    const params: any[] = [cutoffTime];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    if (robotId) {
      query += ` AND robot_id = $${params.length + 1}`;
      params.push(robotId);
    }

    const result = await execSQL(query, params);

    return NextResponse.json({
      success: true,
      message: `删除了${result.rowCount}条日志`
    });
  } catch (error) {
    console.error('清理日志失败:', error);
    return NextResponse.json(
      { success: false, message: '清理日志失败', error: String(error) },
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
