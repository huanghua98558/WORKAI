import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/flow-engine/monitor/stats
 * 获取执行统计信息
 */
export async function GET(request: NextRequest) {
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
