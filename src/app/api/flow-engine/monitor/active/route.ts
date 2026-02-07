import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/flow-engine/monitor/active
 * 获取正在运行的流程实例
 */
export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT
        fi.id,
        fi.flow_definition_id,
        fi.flow_name,
        fi.status,
        fi.current_node_id,
        fi.started_at,
        fi.processing_time,
        fd.name as flow_definition_name,
        fd.version as flow_definition_version
      FROM flow_instances fi
      LEFT JOIN flow_definitions fd ON fi.flow_definition_id = fd.id
      WHERE fi.status = 'running'
      ORDER BY fi.started_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error: any) {
    console.error('[GET /api/flow-engine/monitor/active] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
