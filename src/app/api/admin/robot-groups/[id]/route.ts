import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人分组详情 API
 * GET /api/admin/robot-groups/[id] - 获取分组详情
 * PUT /api/admin/robot-groups/[id] - 更新分组
 * DELETE /api/admin/robot-groups/[id] - 删除分组
 */

// GET - 获取分组详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const query = `
      SELECT 
        rg.*,
        (SELECT COUNT(*) FROM robots WHERE group_id = rg.id) as robot_count,
        (SELECT COUNT(*) FROM robots WHERE group_id = rg.id AND status = 'online') as online_robot_count
      FROM robot_groups rg
      WHERE rg.id = $1
    `;

    const result = await execSQL(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '分组不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取分组详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取分组详情失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新分组
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, color, icon, priority, is_enabled } = body;

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(icon);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramIndex++}`);
      values.push(is_enabled);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有要更新的字段' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE robot_groups
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await execSQL(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '分组不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '更新分组成功'
    });
  } catch (error) {
    console.error('更新分组失败:', error);
    
    if (String(error).includes('unique constraint') || String(error).includes('duplicate key')) {
      return NextResponse.json(
        { success: false, message: '分组名称已存在' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: '更新分组失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除分组
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 检查是否有机器人使用该分组
    const checkQuery = `
      SELECT COUNT(*) as count FROM robots WHERE group_id = $1
    `;
    const checkResult = await execSQL(checkQuery, [id]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `该分组下还有 ${checkResult.rows[0].count} 个机器人，无法删除` 
        },
        { status: 400 }
      );
    }

    // 删除分组
    const query = `
      DELETE FROM robot_groups
      WHERE id = $1
      RETURNING *
    `;

    const result = await execSQL(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '分组不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '删除分组成功'
    });
  } catch (error) {
    console.error('删除分组失败:', error);
    return NextResponse.json(
      { success: false, message: '删除分组失败' },
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
