import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/flow-engine/definitions
 * 获取所有流程定义列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const is_active = searchParams.get('is_active');

    let query = 'SELECT id, name, description, version, is_active, trigger_type, created_at, updated_at FROM flow_definitions';
    const params: any[] = [];

    if (is_active === 'true') {
      query += ' WHERE is_active = true';
    } else if (is_active === 'false') {
      query += ' WHERE is_active = false';
    }

    query += ' ORDER BY updated_at DESC';

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('[GET /api/flow-engine/definitions] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flow-engine/definitions
 * 创建新的流程定义
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, trigger_type, created_by } = body;

    if (!name || !trigger_type) {
      return NextResponse.json(
        { success: false, error: 'name 和 trigger_type 参数必填' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO flow_definitions (
        name,
        description,
        version,
        is_active,
        trigger_type,
        trigger_config,
        nodes,
        edges,
        variables,
        created_by,
        priority
      ) VALUES ($1, $2, '1.0', true, $3, '{}', '[]', '[]', '{}', $4, 0)
      RETURNING *`,
      [name, description || '', trigger_type, created_by || 'system']
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '流程创建成功',
    });
  } catch (error: any) {
    console.error('[POST /api/flow-engine/definitions] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
