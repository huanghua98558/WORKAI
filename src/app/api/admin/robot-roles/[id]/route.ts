import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人角色详情 API
 * GET /api/admin/robot-roles/[id] - 获取角色详情
 * PUT /api/admin/robot-roles/[id] - 更新角色
 * DELETE /api/admin/robot-roles/[id] - 删除角色
 */

// GET - 获取角色详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const query = `
      SELECT 
        rr.*,
        (SELECT COUNT(*) FROM robots WHERE role_id = rr.id) as robot_count,
        (SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', r.id,
            'name', r.name,
            'robotId', r.robot_id,
            'status', r.status
          )
        ) FROM robots r WHERE r.role_id = rr.id LIMIT 10) as recent_robots
      FROM robot_roles rr
      WHERE rr.id = $1
    `;

    const result = await execSQL(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '角色不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取角色详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取角色详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新角色
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, permissions, is_enabled } = body;

    // 检查角色是否存在
    const checkQuery = `SELECT * FROM robot_roles WHERE id = $1`;
    const checkResult = await execSQL(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '角色不存在' },
        { status: 404 }
      );
    }

    const role = checkResult.rows[0];

    // 系统角色不允许修改名称和权限
    if (role.is_system) {
      if (name !== undefined || permissions !== undefined) {
        return NextResponse.json(
          { success: false, message: '系统角色不允许修改名称和权限' },
          { status: 403 }
        );
      }
    }

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
    if (permissions !== undefined) {
      if (typeof permissions !== 'object') {
        return NextResponse.json(
          { success: false, message: '权限配置必须是对象' },
          { status: 400 }
        );
      }
      updates.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(permissions));
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
      UPDATE robot_roles
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await execSQL(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '更新角色成功'
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    
    if (String(error).includes('unique constraint') || String(error).includes('duplicate key')) {
      return NextResponse.json(
        { success: false, message: '角色名称已存在' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: '更新角色失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 删除角色
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查角色是否存在
    const checkQuery = `SELECT * FROM robot_roles WHERE id = $1`;
    const checkResult = await execSQL(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '角色不存在' },
        { status: 404 }
      );
    }

    const role = checkResult.rows[0];

    // 系统角色不允许删除
    if (role.is_system) {
      return NextResponse.json(
        { success: false, message: '系统角色不允许删除' },
        { status: 403 }
      );
    }

    // 检查是否有机器人使用该角色
    const robotCheckQuery = `
      SELECT COUNT(*) as count FROM robots WHERE role_id = $1
    `;
    const robotCheckResult = await execSQL(robotCheckQuery, [id]);

    if (parseInt(robotCheckResult.rows[0].count) > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `该角色下还有 ${robotCheckResult.rows[0].count} 个机器人，无法删除` 
        },
        { status: 400 }
      );
    }

    // 删除角色
    const query = `
      DELETE FROM robot_roles
      WHERE id = $1
      RETURNING *
    `;

    const result = await execSQL(query, [id]);

    return NextResponse.json({
      success: true,
      message: '删除角色成功'
    });
  } catch (error) {
    console.error('删除角色失败:', error);
    return NextResponse.json(
      { success: false, message: '删除角色失败', error: String(error) },
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
