import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人角色管理 API
 * GET /api/admin/robot-roles - 获取所有角色
 * POST /api/admin/robot-roles - 创建角色
 */

// GET - 获取所有角色
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const systemOnly = searchParams.get('systemOnly') === 'true';

    let query = `
      SELECT 
        id,
        name,
        description,
        permissions,
        is_system,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM robots WHERE role_id = robot_roles.id) as robot_count
      FROM robot_roles
      WHERE 1=1
    `;

    const params: any[] = [];

    if (systemOnly) {
      query += ` AND is_system = true`;
    }

    query += ` ORDER BY is_system DESC, created_at ASC`;

    const result = await execSQL(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('获取机器人角色失败:', error);
    return NextResponse.json(
      { success: false, message: '获取机器人角色失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建角色
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions, is_system } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { success: false, message: '角色名称不能为空' },
        { status: 400 }
      );
    }

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { success: false, message: '权限配置不能为空' },
        { status: 400 }
      );
    }

    // 插入角色
    const query = `
      INSERT INTO robot_roles (name, description, permissions, is_system)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const params = [
      name,
      description || null,
      JSON.stringify(permissions),
      is_system || false
    ];

    const result = await execSQL(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '创建角色成功'
    });
  } catch (error) {
    console.error('创建机器人角色失败:', error);
    
    if (String(error).includes('unique constraint') || String(error).includes('duplicate key')) {
      return NextResponse.json(
        { success: false, message: '角色名称已存在' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: '创建角色失败', error: String(error) },
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
