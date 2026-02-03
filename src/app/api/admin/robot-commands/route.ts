import { NextRequest, NextResponse } from 'next/server';

/**
 * 指令队列管理 API
 * GET /api/admin/robot-commands - 获取指令列表
 * POST /api/admin/robot-commands - 创建指令
 * PUT /api/admin/robot-commands/batch - 批量操作指令
 */

// GET - 获取指令列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get('robotId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        rc.*,
        r.name as robot_name,
        r.group_id,
        rg.name as group_name,
        CASE 
          WHEN rc.status = 'pending' THEN 1
          WHEN rc.status = 'processing' THEN 2
          WHEN rc.status = 'completed' THEN 3
          WHEN rc.status = 'failed' THEN 4
          ELSE 5
        END as status_order
      FROM robot_commands rc
      LEFT JOIN robots r ON rc.robot_id = r.robot_id
      LEFT JOIN robot_groups rg ON r.group_id = rg.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (robotId) {
      query += ` AND rc.robot_id = $${paramIndex++}`;
      params.push(robotId);
    }

    if (status) {
      query += ` AND rc.status = $${paramIndex++}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND rc.priority = $${paramIndex++}`;
      params.push(priority);
    }

    if (type) {
      query += ` AND rc.command_type = $${paramIndex++}`;
      params.push(type);
    }

    if (startTime) {
      query += ` AND rc.created_at >= $${paramIndex++}`;
      params.push(startTime);
    }

    if (endTime) {
      query += ` AND rc.created_at <= $${paramIndex++}`;
      params.push(endTime);
    }

    query += ` ORDER BY rc.priority DESC, status_order, rc.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await execSQL(query, params);

    // 获取总数
    let countQuery = `SELECT COUNT(*) FROM robot_commands rc WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (robotId) {
      countQuery += ` AND rc.robot_id = $${countParamIndex++}`;
      countParams.push(robotId);
    }

    if (status) {
      countQuery += ` AND rc.status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (priority) {
      countQuery += ` AND rc.priority = $${countParamIndex++}`;
      countParams.push(priority);
    }

    if (type) {
      countQuery += ` AND rc.command_type = $${countParamIndex++}`;
      countParams.push(type);
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
      GROUP BY status
    `;
    const statsResult = await execSQL(statsQuery, []);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      stats: statsResult.rows,
      limit,
      offset
    });
  } catch (error) {
    console.error('获取指令列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取指令列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建指令
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      robotId,
      commandType,
      commandPayload,
      priority,
      scheduledTime,
      retryPolicy,
      metadata,
      batchId
    } = body;

    // 验证必填字段
    if (!robotId || !commandType || !commandPayload) {
      return NextResponse.json(
        { success: false, message: '机器人ID、指令类型和指令内容不能为空' },
        { status: 400 }
      );
    }

    // 检查机器人是否存在且可用
    const checkRobotQuery = `
      SELECT id, is_active, status 
      FROM robots 
      WHERE robot_id = $1
    `;
    const robotResult = await execSQL(checkRobotQuery, [robotId]);

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '机器人不存在' },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];
    if (!robot.is_active || robot.status !== 'online') {
      return NextResponse.json(
        { success: false, message: '机器人不可用' },
        { status: 400 }
      );
    }

    // 生成指令ID
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 插入指令
    const query = `
      INSERT INTO robot_commands (
        command_id, robot_id, command_type, command_payload,
        priority, scheduled_time, retry_policy, metadata,
        batch_id, status, retry_count, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 0, NOW(), NOW())
      RETURNING *
    `;

    const params = [
      commandId,
      robotId,
      commandType,
      JSON.stringify(commandPayload),
      priority || 5,
      scheduledTime || null,
      retryPolicy ? JSON.stringify(retryPolicy) : null,
      metadata ? JSON.stringify(metadata) : null,
      batchId || null
    ];

    const result = await execSQL(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '创建指令成功'
    });
  } catch (error) {
    console.error('创建指令失败:', error);
    return NextResponse.json(
      { success: false, message: '创建指令失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 批量操作指令
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, commandIds, data } = body;

    if (!action || !commandIds || !Array.isArray(commandIds)) {
      return NextResponse.json(
        { success: false, message: '无效的请求参数' },
        { status: 400 }
      );
    }

    if (commandIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '指令ID列表不能为空' },
        { status: 400 }
      );
    }

    let query = '';
    const params: any[] = [];

    switch (action) {
      case 'cancel':
        query = `
          UPDATE robot_commands
          SET status = 'cancelled', updated_at = NOW()
          WHERE command_id = ANY($1) AND status IN ('pending', 'processing')
          RETURNING *
        `;
        params.push(commandIds);
        break;

      case 'retry':
        query = `
          UPDATE robot_commands
          SET 
            status = 'pending',
            retry_count = retry_count + 1,
            error_message = NULL,
            updated_at = NOW()
          WHERE command_id = ANY($1) AND status = 'failed'
          RETURNING *
        `;
        params.push(commandIds);
        break;

      case 'priority':
        if (!data || data.priority === undefined) {
          return NextResponse.json(
            { success: false, message: '优先级不能为空' },
            { status: 400 }
          );
        }
        query = `
          UPDATE robot_commands
          SET priority = $2, updated_at = NOW()
          WHERE command_id = ANY($1)
          RETURNING *
        `;
        params.push(commandIds, data.priority);
        break;

      case 'reschedule':
        if (!data || !data.scheduledTime) {
          return NextResponse.json(
            { success: false, message: '调度时间不能为空' },
            { status: 400 }
          );
        }
        query = `
          UPDATE robot_commands
          SET 
            scheduled_time = $2,
            status = 'pending',
            updated_at = NOW()
          WHERE command_id = ANY($1)
          RETURNING *
        `;
        params.push(commandIds, data.scheduledTime);
        break;

      default:
        return NextResponse.json(
          { success: false, message: '不支持的操作' },
          { status: 400 }
        );
    }

    const result = await execSQL(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      message: `批量${action}成功，影响${result.rows.length}条记录`
    });
  } catch (error) {
    console.error('批量操作指令失败:', error);
    return NextResponse.json(
      { success: false, message: '批量操作指令失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 清理已完成指令
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'completed';
    const beforeTime = searchParams.get('beforeTime');
    const robotId = searchParams.get('robotId');

    let query = `DELETE FROM robot_commands WHERE status = $1`;
    const params: any[] = [status];

    if (beforeTime) {
      query += ` AND created_at < $2`;
      params.push(beforeTime);
    }

    if (robotId) {
      query += ` AND robot_id = $${params.length + 1}`;
      params.push(robotId);
    }

    const result = await execSQL(query, params);

    return NextResponse.json({
      success: true,
      message: `删除了${result.rowCount}条指令`
    });
  } catch (error) {
    console.error('清理指令失败:', error);
    return NextResponse.json(
      { success: false, message: '清理指令失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 辅助函数：执行 SQL
async function execSQL(query: string, params: any[]) {
  const { default: Client } = await import('pg');
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
