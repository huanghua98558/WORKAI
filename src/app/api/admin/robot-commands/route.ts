import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人指令管理 API
 * GET /api/admin/robot-commands - 获取指令列表
 * POST /api/admin/robot-commands - 发送指令
 */

// GET - 获取指令列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get('robotId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        rc.*,
        r.name as robot_name,
        r.group_id as robot_group_id
      FROM robot_commands rc
      LEFT JOIN robots r ON rc.robot_id = r.robot_id
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

    query += ` ORDER BY rc.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await execSQL(query, params);

    // 获取总数
    let countQuery = `SELECT COUNT(*) FROM robot_commands WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (robotId) {
      countQuery += ` AND robot_id = $${countParamIndex++}`;
      countParams.push(robotId);
    }

    if (status) {
      countQuery += ` AND status = $${countParamIndex++}`;
      countParams.push(status);
    }

    const countResult = await execSQL(countQuery, countParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
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

// POST - 发送指令
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { robotId, commandType, commandData, priority, createdBy } = body;

    // 验证必填字段
    if (!robotId || !commandType || !commandData) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数：robotId, commandType, commandData' },
        { status: 400 }
      );
    }

    // 验证机器人是否存在且在线
    const robotQuery = `SELECT * FROM robots WHERE robot_id = $1 AND is_active = true`;
    const robotResult = await execSQL(robotQuery, [robotId]);

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '机器人不存在或未激活' },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];

    if (robot.status !== 'online') {
      return NextResponse.json(
        { success: false, message: '机器人不在线' },
        { status: 400 }
      );
    }

    // 创建指令记录
    const commandId = generateUUID();
    const insertQuery = `
      INSERT INTO robot_commands (
        id, robot_id, command_type, command_data, priority, 
        status, created_by, sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const commandResult = await execSQL(insertQuery, [
      commandId,
      robotId,
      commandType,
      JSON.stringify(commandData),
      priority || 10,
      'sent',
      createdBy || 'system'
    ]);

    // 调用 WorkTool API 发送指令
    let apiResponse;
    try {
      const worktoolApiUrl = process.env.NEXT_PUBLIC_WORKTOOL_API_BASE_URL || 'https://api.worktool.ymdyes.cn/wework/';
      
      let endpoint = '';
      switch (commandType) {
        case 'send_message':
          endpoint = 'message/send';
          break;
        case 'broadcast':
          endpoint = 'message/broadcast';
          break;
        case 'get_status':
          endpoint = 'robot/status';
          break;
        default:
          endpoint = commandType;
      }

      const apiUrl = `${worktoolApiUrl}${endpoint}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...commandData,
          robotId: robotId
        })
      });

      apiResponse = await response.json();

      // 更新指令状态
      if (response.ok) {
        await execSQL(
          `UPDATE robot_commands SET status = 'sent', completed_at = NOW() WHERE id = $1`,
          [commandId]
        );
      } else {
        await execSQL(
          `UPDATE robot_commands SET status = 'failed', error_message = $1 WHERE id = $2`,
          [JSON.stringify(apiResponse), commandId]
        );
      }

      return NextResponse.json({
        success: response.ok,
        data: commandResult.rows[0],
        apiResponse: apiResponse,
        message: response.ok ? '指令发送成功' : '指令发送失败'
      });

    } catch (apiError) {
      // 更新指令状态为失败
      await execSQL(
        `UPDATE robot_commands SET status = 'failed', error_message = $1, retry_count = retry_count + 1 WHERE id = $2`,
        [String(apiError), commandId]
      );

      return NextResponse.json(
        { 
          success: false, 
          data: commandResult.rows[0],
          message: '调用 WorkTool API 失败',
          error: String(apiError)
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('发送指令失败:', error);
    return NextResponse.json(
      { success: false, message: '发送指令失败', error: String(error) },
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

// 生成 UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
