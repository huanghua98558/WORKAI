import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/flow-engine/definitions/[id]
 * 获取指定流程定义的详细信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const flowId = resolvedParams.id;

    const result = await pool.query(
      'SELECT * FROM flow_definitions WHERE id = $1',
      [flowId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到流程定义' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('[GET /api/flow-engine/definitions/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flow-engine/definitions/[id]
 * 更新流程定义
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const flowId = resolvedParams.id;
    const body = await request.json();

    const result = await pool.query(
      `UPDATE flow_definitions
       SET name = $1,
           description = $2,
           nodes = $3,
           edges = $4,
           variables = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        body.name,
        body.description,
        JSON.stringify(body.nodes || []),
        JSON.stringify(body.edges || []),
        JSON.stringify(body.variables || {}),
        flowId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到流程定义' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '流程更新成功',
    });
  } catch (error: any) {
    console.error('[PUT /api/flow-engine/definitions/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flow-engine/definitions/[id]
 * 删除流程定义
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const flowId = resolvedParams.id;

    const result = await pool.query(
      'DELETE FROM flow_definitions WHERE id = $1 RETURNING *',
      [flowId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到流程定义' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '流程删除成功',
    });
  } catch (error: any) {
    console.error('[DELETE /api/flow-engine/definitions/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
