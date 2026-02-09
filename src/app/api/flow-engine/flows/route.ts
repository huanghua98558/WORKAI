import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/flow-engine/flows
 * 获取所有活跃的流程定义列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // 查询活跃的流程定义
    const result = await pool.query(
      `SELECT 
        id,
        name,
        version,
        description,
        created_at,
        updated_at
       FROM flow_definitions
       WHERE is_active = true
       ORDER BY updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // 获取总数
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM flow_definitions WHERE is_active = true'
    );
    const total = parseInt(countResult.rows[0].count);

    const flows = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: flows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch flows:', error);
    return NextResponse.json(
      { success: false, error: '获取流程列表失败' },
      { status: 500 }
    );
  }
}
