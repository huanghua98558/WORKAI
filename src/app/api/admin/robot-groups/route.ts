import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人分组 API
 * GET /api/admin/robot-groups - 获取分组列表
 * POST /api/admin/robot-groups - 创建分组
 */

// GET - 获取分组列表
export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT 
        rg.*,
        (SELECT COUNT(*) FROM robots WHERE group_id = rg.id) as robot_count,
        (SELECT COUNT(*) FROM robots WHERE group_id = rg.id AND status = 'online') as online_robot_count
      FROM robot_groups rg
      ORDER BY rg.priority DESC, rg.created_at DESC
    `;

    const result = await execSQL(query, []);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取分组列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取分组列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建分组
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, icon, priority } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: '分组名称不能为空' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO robot_groups (id, name, description, color, icon, priority, is_enabled, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING *
    `;

    const result = await execSQL(query, [
      name,
      description || null,
      color || null,
      icon || null,
      priority || 10
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '创建分组成功'
    });
  } catch (error: any) {
    console.error('创建分组失败:', error);
    
    if (String(error).includes('unique constraint') || String(error).includes('duplicate key')) {
      return NextResponse.json(
        { success: false, message: '分组名称已存在' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: '创建分组失败: ' + error.message },
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
