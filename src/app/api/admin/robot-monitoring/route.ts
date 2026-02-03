import { NextRequest, NextResponse } from 'next/server';

/**
 * 性能监控 API
 * GET /api/admin/robot-monitoring - 获取性能监控数据
 * POST /api/admin/robot-monitoring/heartbeat - 心跳上报
 */

// GET - 获取性能监控数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get('robotId');
    const groupId = searchParams.get('groupId');
    const period = searchParams.get('period') || '1h'; // 1h, 6h, 24h, 7d
    const aggregateBy = searchParams.get('aggregateBy') || 'hour'; // hour, day

    // 计算时间范围
    const timeRange = getTimeRange(period);

    // 获取机器人列表及性能指标
    const robotsQuery = `
      SELECT 
        r.*,
        lb.*,
        rg.name as group_name,
        rg.color as group_color,
        (lb.current_sessions * 100.0 / NULLIF(lb.max_sessions, 0)) as utilization_rate,
        CASE 
          WHEN lb.health_score >= 90 THEN 'excellent'
          WHEN lb.health_score >= 70 THEN 'good'
          WHEN lb.health_score >= 50 THEN 'fair'
          ELSE 'poor'
        END as health_level
      FROM robots r
      LEFT JOIN robot_load_balancing lb ON r.robot_id = lb.robot_id
      LEFT JOIN robot_groups rg ON r.group_id = rg.id
      WHERE 1=1
      ${robotId ? `AND r.robot_id = '${robotId}'` : ''}
      ${groupId ? `AND r.group_id = '${groupId}'` : ''}
    `;

    const robotsResult = await execSQL(robotsQuery, []);

    // 获取会话统计
    const sessionQuery = `
      SELECT 
        robot_id,
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_sessions,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
      FROM robot_sessions
      WHERE created_at >= $1
      ${robotId ? `AND robot_id = '${robotId}'` : ''}
      GROUP BY robot_id
    `;

    const sessionResult = await execSQL(sessionQuery, [timeRange]);

    // 获取指令统计
    const commandQuery = `
      SELECT 
        robot_id,
        COUNT(*) as total_commands,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_commands,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_commands,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_commands,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_commands,
        AVG(EXTRACT(EPOCH FROM (CASE 
          WHEN completed_at IS NOT NULL THEN completed_at - started_at
          ELSE updated_at - created_at
        END))) as avg_processing_seconds
      FROM robot_commands
      WHERE created_at >= $1
      ${robotId ? `AND robot_id = '${robotId}'` : ''}
      GROUP BY robot_id
    `;

    const commandResult = await execSQL(commandQuery, [timeRange]);

    // 获取错误统计
    const errorQuery = `
      SELECT 
        robot_id,
        error_type,
        COUNT(*) as error_count
      FROM robot_callback_logs
      WHERE status = 'error' AND created_at >= $1
      ${robotId ? `AND robot_id = '${robotId}'` : ''}
      GROUP BY robot_id, error_type
      ORDER BY error_count DESC
      LIMIT 20
    `;

    const errorResult = await execSQL(errorQuery, [timeRange]);

    // 合并数据
    const robots = robotsResult.rows.map(robot => {
      const sessions = sessionResult.rows.find(s => s.robot_id === robot.robot_id) || {};
      const commands = commandResult.rows.find(c => c.robot_id === robot.robot_id) || {};
      const errors = errorResult.rows.filter(e => e.robot_id === robot.robot_id);

      return {
        ...robot,
        sessionStats: {
          total: parseInt(sessions.total_sessions) || 0,
          active: parseInt(sessions.active_sessions) || 0,
          completed: parseInt(sessions.completed_sessions) || 0,
          failed: parseInt(sessions.failed_sessions) || 0,
          avgDuration: parseFloat(sessions.avg_duration_seconds) || 0
        },
        commandStats: {
          total: parseInt(commands.total_commands) || 0,
          pending: parseInt(commands.pending_commands) || 0,
          processing: parseInt(commands.processing_commands) || 0,
          completed: parseInt(commands.completed_commands) || 0,
          failed: parseInt(commands.failed_commands) || 0,
          avgProcessing: parseFloat(commands.avg_processing_seconds) || 0
        },
        topErrors: errors
      };
    });

    // 计算总体统计
    const totalStats = {
      totalRobots: robots.length,
      activeRobots: robots.filter(r => r.is_active && r.robot_status === 'online').length,
      totalSessions: robots.reduce((sum, r) => sum + r.sessionStats.total, 0),
      activeSessions: robots.reduce((sum, r) => sum + r.sessionStats.active, 0),
      totalCommands: robots.reduce((sum, r) => sum + r.commandStats.total, 0),
      avgHealthScore: robots.length > 0 
        ? robots.reduce((sum, r) => sum + r.health_score, 0) / robots.length 
        : 0,
      avgSuccessRate: robots.length > 0
        ? robots.reduce((sum, r) => sum + r.success_rate, 0) / robots.length
        : 0,
      overallUtilization: robots.length > 0
        ? robots.reduce((sum, r) => sum + r.utilization_rate, 0) / robots.length
        : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        robots,
        stats: totalStats,
        timeRange: {
          start: timeRange,
          end: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('获取性能监控数据失败:', error);
    return NextResponse.json(
      { success: false, message: '获取性能监控数据失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 心跳上报
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { robotId, metrics } = body;

    if (!robotId || !metrics) {
      return NextResponse.json(
        { success: false, message: '机器人ID和指标不能为空' },
        { status: 400 }
      );
    }

    // 检查机器人是否存在
    const checkQuery = `SELECT id FROM robots WHERE robot_id = $1`;
    const checkResult = await execSQL(checkQuery, [robotId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '机器人不存在' },
        { status: 404 }
      );
    }

    // 更新机器人心跳
    const updateRobotQuery = `
      UPDATE robots 
      SET 
        last_heartbeat = NOW(),
        status = 'online',
        updated_at = NOW()
      WHERE robot_id = $1
    `;
    await execSQL(updateRobotQuery, [robotId]);

    // 更新负载均衡表
    const updateLbQuery = `
      UPDATE robot_load_balancing 
      SET 
        current_sessions = $2,
        max_sessions = $3,
        health_score = $4,
        avg_response_time = $5,
        success_rate = $6,
        total_requests = $7,
        error_count = $8,
        is_available = $9,
        updated_at = NOW()
      WHERE robot_id = $1
    `;

    const lbParams = [
      robotId,
      metrics.currentSessions || 0,
      metrics.maxSessions || 100,
      metrics.healthScore || 100,
      metrics.avgResponseTime || 0,
      metrics.successRate || 100,
      metrics.totalRequests || 0,
      metrics.errorCount || 0,
      metrics.isAvailable !== undefined ? metrics.isAvailable : true
    ];

    await execSQL(updateLbQuery, lbParams);

    // 检查是否需要告警
    const alerts = [];
    if (metrics.healthScore < 70) {
      alerts.push({
        type: 'warning',
        level: 'high',
        message: `机器人 ${robotId} 健康度低于阈值: ${metrics.healthScore}`,
        robotId
      });
    }

    if (metrics.successRate < 80) {
      alerts.push({
        type: 'error',
        level: 'critical',
        message: `机器人 ${robotId} 成功率过低: ${metrics.successRate}%`,
        robotId
      });
    }

    if ((metrics.currentSessions / metrics.maxSessions) > 0.9) {
      alerts.push({
        type: 'warning',
        level: 'high',
        message: `机器人 ${robotId} 负载过高: ${((metrics.currentSessions / metrics.maxSessions) * 100).toFixed(1)}%`,
        robotId
      });
    }

    return NextResponse.json({
      success: true,
      message: '心跳上报成功',
      alerts: alerts.length > 0 ? alerts : undefined
    });
  } catch (error) {
    console.error('心跳上报失败:', error);
    return NextResponse.json(
      { success: false, message: '心跳上报失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 辅助函数：获取时间范围
function getTimeRange(period: string): Date {
  const now = new Date();
  switch (period) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 60 * 60 * 1000);
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
