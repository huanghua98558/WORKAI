import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/flow-engine/monitor?status=running&limit=50
 * 获取流程执行监控数据
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'running';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = '';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause = 'WHERE fi.status = $1';
      params.push(status);
    }

    // 查询流程实例
    const query = `
      SELECT
        fi.*,
        fd.name as flow_definition_name,
        fd.version as flow_definition_version,
        COUNT(DISTINCT fel.id) as total_nodes,
        SUM(CASE WHEN fel.status = 'completed' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN fel.status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM flow_instances fi
      LEFT JOIN flow_definitions fd ON fi.flow_definition_id = fd.id
      LEFT JOIN flow_execution_logs fel ON fi.id = fel.flow_instance_id
      ${whereClause}
      GROUP BY fi.id, fd.name, fd.version
      ORDER BY fi.started_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(query, params);

    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT fi.id) as total
      FROM flow_instances fi
      ${whereClause}
    `;
    const countParams = status && status !== 'all' ? [status] : [];
    const countResult = await pool.query(countQuery, countParams);

    // 转换数据格式
    const transformedData = result.rows.map((row) => ({
      id: row.id,
      flowDefinitionId: row.flow_definition_id,
      flowName: row.flow_name,
      flowDefinitionName: row.flow_definition_name,
      flowDefinitionVersion: row.flow_definition_version,
      status: row.status,
      currentNodeId: row.current_node_id,
      triggerData: row.trigger_data,
      outputData: row.output_data,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      processingTime: row.processing_time,
      retryCount: row.retry_count,
      metadata: row.metadata,
      totalNodes: parseInt(row.total_nodes) || 0,
      successCount: parseInt(row.success_count) || 0,
      failedCount: parseInt(row.failed_count) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      total: parseInt(countResult.rows[0].total) || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[GET /api/flow-engine/monitor] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/flow-engine/monitor/stats
 * 获取执行统计信息
 */
export async function GET_STATS() {
  try {
    // 统计各个状态的流程实例数量
    const statusStats = await pool.query(`
      SELECT
        status,
        COUNT(*) as count,
        AVG(processing_time) as avg_processing_time,
        MIN(processing_time) as min_processing_time,
        MAX(processing_time) as max_processing_time
      FROM flow_instances
      GROUP BY status
    `);

    // 统计最近的执行趋势（最近7天）
    const trendStats = await pool.query(`
      SELECT
        DATE(started_at) as date,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM flow_instances
      WHERE started_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `);

    // 统计各个流程的执行情况
    const flowStats = await pool.query(`
      SELECT
        flow_name,
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        AVG(processing_time) as avg_processing_time
      FROM flow_instances
      WHERE started_at >= NOW() - INTERVAL '30 days'
      GROUP BY flow_name
      ORDER BY total_count DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      data: {
        statusStats: statusStats.rows,
        trendStats: trendStats.rows,
        flowStats: flowStats.rows,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/flow-engine/monitor/stats] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
