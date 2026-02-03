import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人分组管理 API
 * GET /api/admin/robot-groups - 获取所有分组
 * POST /api/admin/robot-groups - 创建分组
 */

// GET - 获取所有分组
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    let query = `
      SELECT 
        id,
        name,
        description,
        color,
        icon,
        priority,
        is_enabled,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM robots WHERE group_id = robot_groups.id) as robot_count
      FROM robot_groups
      WHERE 1=1
    `;

    const params: any[] = [];
    const paramIndex: any[] = [];

    if (enabledOnly) {
      paramIndex.push(params.length + 1);
      query += ` AND is_enabled = $${paramIndex.length}`;
      params.push(true);
    }

    query += ` ORDER BY priority DESC, created_at DESC`;

    const result = await execSQL(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('获取机器人分组失败:', error);
    return NextResponse.json(
      { success: false, message: '获取机器人分组失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建分组
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, icon, priority, is_enabled } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { success: false, message: '分组名称不能为空' },
        { status: 400 }
      );
    }

    // 插入分组
    const query = `
      INSERT INTO robot_groups (name, description, color, icon, priority, is_enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const params = [
      name,
      description || null,
      color || null,
      icon || null,
      priority || 10,
      is_enabled !== undefined ? is_enabled : true
    ];

    const result = await execSQL(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '创建分组成功'
    });
  } catch (error) {
    console.error('创建机器人分组失败:', error);
    
    // 检查是否是唯一性约束错误
    if (String(error).includes('unique constraint') || String(error).includes('duplicate key')) {
      return NextResponse.json(
        { success: false, message: '分组名称已存在' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: '创建分组失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 辅助函数：执行 SQL
async function execSQL(query: string, params: any[]) {
  // 这里需要根据实际的数据库连接方式实现
  // 临时返回空结果，需要后续集成真实的数据库连接
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
