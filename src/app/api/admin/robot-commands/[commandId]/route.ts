import { NextRequest, NextResponse } from 'next/server';

/**
 * 指令详情 API
 * GET /api/admin/robot-commands/[commandId] - 获取指令详情
 * PUT /api/admin/robot-commands/[commandId] - 更新指令状态
 * DELETE /api/admin/robot-commands/[commandId] - 删除指令
 */

// GET - 获取指令详情
export async function GET(
  request: NextRequest,
  { params }: { params: { commandId: string } }
) {
  try {
    const { commandId } = params;

    const query = `
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
      WHERE rc.id = $1
    `;

    const result = await execSQL(query, [commandId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '指令不存在' },
        { status: 404 }
      );
    }

    // 获取相关的回调日志
    const callbackQuery = `
      SELECT * FROM robot_callback_logs
      WHERE id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const callbackResult = await execSQL(callbackQuery, [commandId]);

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        callbacks: callbackResult.rows
      }
    });
  } catch (error) {
    console.error('获取指令详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取指令详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新指令状态
export async function PUT(
  request: NextRequest,
  { params }: { params: { commandId: string } }
) {
  try {
    const { commandId } = params;
    const body = await request.json();
    const { status, error, result: commandResult, metadata } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: '状态不能为空' },
        { status: 400 }
      );
    }

    // 验证状态
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: '无效的状态' },
        { status: 400 }
      );
    }

    // 构建更新字段
    const updates: string[] = ['status = $1', 'updated_at = NOW()'];
    const values: any[] = [status];
    let paramIndex = 2;

    if (error !== undefined) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(error);
    }

    if (commandResult !== undefined) {
      updates.push(`result = $${paramIndex++}`);
      values.push(JSON.stringify(commandResult));
    }

    // 根据状态设置时间戳
    if (status === 'processing') {
      updates.push(`started_at = NOW()`);
    } else if (status === 'completed' || status === 'failed') {
      updates.push(`completed_at = NOW()`);
    }

    values.push(commandId);

    const query = `
      UPDATE robot_commands
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await execSQL(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '指令不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '更新指令状态成功'
    });
  } catch (error) {
    console.error('更新指令状态失败:', error);
    return NextResponse.json(
      { success: false, message: '更新指令状态失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 删除指令
export async function DELETE(
  request: NextRequest,
  { params }: { params: { commandId: string } }
) {
  try {
    const { commandId } = params;

    // 检查指令是否存在
    const checkQuery = `SELECT id, status FROM robot_commands WHERE id = $1`;
    const checkResult = await execSQL(checkQuery, [commandId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '指令不存在' },
        { status: 404 }
      );
    }

    const command = checkResult.rows[0];

    // 只有非处理中的指令可以删除
    if (command.status === 'processing') {
      return NextResponse.json(
        { success: false, message: '处理中的指令无法删除' },
        { status: 400 }
      );
    }

    const query = `DELETE FROM robot_commands WHERE id = $1`;
    await execSQL(query, [commandId]);

    return NextResponse.json({
      success: true,
      message: '删除指令成功'
    });
  } catch (error) {
    console.error('删除指令失败:', error);
    return NextResponse.json(
      { success: false, message: '删除指令失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 重试指令
export async function POST(
  request: NextRequest,
  { params }: { params: { commandId: string } }
) {
  try {
    const { commandId } = params;
    const body = await request.json();
    const { force } = body; // 强制重试（即使是成功的）

    // 检查指令是否存在
    const checkQuery = `SELECT * FROM robot_commands WHERE id = $1`;
    const checkResult = await execSQL(checkQuery, [commandId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '指令不存在' },
        { status: 404 }
      );
    }

    const command = checkResult.rows[0];

    // 检查是否可以重试
    if (!force && command.status !== 'failed') {
      return NextResponse.json(
        { success: false, message: '只有失败的指令可以重试' },
        { status: 400 }
      );
    }

    // 检查重试次数限制
    if (!force && command.retry_count >= command.max_retries) {
      return NextResponse.json(
        { success: false, message: '已达到最大重试次数' },
        { status: 400 }
      );
    }

    // 重置指令状态
    const query = `
      UPDATE robot_commands
      SET 
        status = 'pending',
        retry_count = retry_count + 1,
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await execSQL(query, [commandId]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '重试指令成功'
    });
  } catch (error) {
    console.error('重试指令失败:', error);
    return NextResponse.json(
      { success: false, message: '重试指令失败', error: String(error) },
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
