import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人角色 API
 * GET /api/admin/robot-roles - 获取角色列表
 * POST /api/admin/robot-roles - 创建角色
 */

// GET - 获取角色列表
export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT 
        rr.*,
        (SELECT COUNT(*) FROM robots WHERE role_id = rr.id) as robot_count
      FROM robot_roles rr
      ORDER BY rr.created_at DESC
    `;

    const result = await execSQL(query, []);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取角色列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建角色
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: '角色名称不能为空' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO robot_roles (id, name, description, permissions, is_system, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, false, NOW(), NOW())
      RETURNING *
    `;

    const result = await execSQL(query, [
      name,
      description || null,
      JSON.stringify(permissions || [])
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '创建角色成功'
    });
  } catch (error: any) {
    console.error('创建角色失败:', error);
    
    if (String(error).includes('unique constraint') || String(error).includes('duplicate key')) {
      return NextResponse.json(
        { success: false, message: '角色名称已存在' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: '创建角色失败: ' + error.message },
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
