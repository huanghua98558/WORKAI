import { NextRequest, NextResponse } from 'next/server';

/**
 * 负载均衡 API
 * GET /api/admin/robot-loadbalancing - 获取负载均衡状态
 * POST /api/admin/robot-loadbalancing/select - 选择最佳机器人
 * PUT /api/admin/robot-loadbalancing/update - 更新负载均衡状态
 */

// GET - 获取负载均衡状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const robotId = searchParams.get('robotId');

    let query = `
      SELECT 
        lb.*,
        r.name as robot_name,
        r.robot_id,
        r.is_active,
        r.status as robot_status,
        r.group_id,
        rg.name as group_name,
        rg.priority as group_priority,
        lb.max_sessions,
        (lb.current_sessions * 100.0 / NULLIF(lb.max_sessions, 0)) as utilization_rate,
        CASE 
          WHEN lb.current_sessions >= lb.max_sessions THEN 'overload'
          WHEN lb.current_sessions >= lb.max_sessions * 0.8 THEN 'high'
          WHEN lb.current_sessions >= lb.max_sessions * 0.5 THEN 'medium'
          ELSE 'low'
        END as load_level
      FROM robot_load_balancing lb
      LEFT JOIN robots r ON lb.robot_id = r.robot_id
      LEFT JOIN robot_groups rg ON r.group_id = rg.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (groupId) {
      query += ` AND r.group_id = $${paramIndex++}`;
      params.push(groupId);
    }

    if (robotId) {
      query += ` AND lb.robot_id = $${paramIndex++}`;
      params.push(robotId);
    }

    query += ` ORDER BY lb.load_score ASC, lb.current_sessions ASC`;

    const result = await execSQL(query, params);

    // 计算汇总统计
    const statsQuery = `
      SELECT 
        COUNT(*) as total_robots,
        COUNT(*) FILTER (WHERE is_available = true) as available_robots,
        COUNT(*) FILTER (WHERE current_sessions >= max_sessions) as overloaded_robots,
        COUNT(*) FILTER (WHERE health_score >= 80) as healthy_robots,
        AVG(current_sessions) as avg_sessions,
        AVG(health_score) as avg_health_score,
        AVG(success_rate) as avg_success_rate,
        SUM(current_sessions) as total_sessions,
        SUM(max_sessions) as total_capacity,
        ROUND((SUM(current_sessions) * 100.0 / NULLIF(SUM(max_sessions), 0)), 2) as overall_utilization
      FROM robot_load_balancing lb
      LEFT JOIN robots r ON lb.robot_id = r.robot_id
      WHERE 1=1
    `;

    const statsParams: any[] = [];
    let statsParamIndex = 1;

    if (groupId) {
      statsQuery += ` AND r.group_id = $${statsParamIndex++}`;
      statsParams.push(groupId);
    }

    const statsResult = await execSQL(statsQuery, statsParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('获取负载均衡状态失败:', error);
    return NextResponse.json(
      { success: false, message: '获取负载均衡状态失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 选择最佳机器人
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      groupId,
      roleId,
      requiredCapabilities,
      excludeRobots = [],
      priority = 'health' // 'health' | 'load' | 'speed'
    } = body;

    let query = `
      SELECT 
        lb.*,
        r.name as robot_name,
        r.robot_id,
        r.is_active,
        r.status as robot_status,
        r.group_id,
        r.role_id,
        r.capabilities,
        r.load_balancing_weight,
        rg.name as group_name,
        rr.name as role_name
      FROM robot_load_balancing lb
      LEFT JOIN robots r ON lb.robot_id = r.robot_id
      LEFT JOIN robot_groups rg ON r.group_id = rg.id
      LEFT JOIN robot_roles rr ON r.role_id = rr.id
      WHERE 
        r.is_active = true 
        AND r.status = 'online'
        AND lb.is_available = true
        AND lb.current_sessions < lb.max_sessions
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (groupId) {
      query += ` AND r.group_id = $${paramIndex++}`;
      params.push(groupId);
    }

    if (roleId) {
      query += ` AND r.role_id = $${paramIndex++}`;
      params.push(roleId);
    }

    if (excludeRobots && excludeRobots.length > 0) {
      query += ` AND lb.robot_id NOT IN ($${paramIndex++})`;
      params.push(excludeRobots);
    }

    // 计算综合得分
    let scoreExpression = '';
    switch (priority) {
      case 'health':
        // 优先健康得分
        scoreExpression = `
          (lb.health_score * 0.4 + 
           (1 - lb.current_sessions / NULLIF(lb.max_sessions, 0)) * 100 * 0.3 + 
           lb.success_rate * 0.3) * 
          COALESCE(r.load_balancing_weight, 1)
        `;
        break;
      case 'load':
        // 优先负载最低
        scoreExpression = `
          (1 - lb.current_sessions / NULLIF(lb.max_sessions, 0)) * 100 * 0.5 + 
          lb.health_score * 0.3 + 
          lb.success_rate * 0.2 * 
          COALESCE(r.load_balancing_weight, 1)
        `;
        break;
      case 'speed':
        // 优先响应速度
        scoreExpression = `
          (100 - NULLIF(lb.avg_response_time, 0)) * 0.4 + 
          lb.health_score * 0.3 + 
          lb.success_rate * 0.3 * 
          COALESCE(r.load_balancing_weight, 1)
        `;
        break;
      default:
        scoreExpression = `
          (lb.health_score * 0.4 + 
           (1 - lb.current_sessions / NULLIF(lb.max_sessions, 0)) * 100 * 0.3 + 
           lb.success_rate * 0.3) * 
          COALESCE(r.load_balancing_weight, 1)
        `;
    }

    query += ` ORDER BY (${scoreExpression}) DESC, lb.current_sessions ASC LIMIT 1`;

    const result = await execSQL(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: '没有可用的机器人',
        data: null
      });
    }

    // 如果需要检查能力
    if (requiredCapabilities && requiredCapabilities.length > 0) {
      const robot = result.rows[0];
      const robotCapabilities = robot.capabilities ? JSON.parse(robot.capabilities) : [];

      const hasAllCapabilities = requiredCapabilities.every(
        (req: string) => robotCapabilities.includes(req)
      );

      if (!hasAllCapabilities) {
        // 尝试找第二个选择
        // 这里简化处理，实际可以递归查找
        return NextResponse.json({
          success: false,
          message: '选中的机器人缺少所需能力',
          data: null
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '选择机器人成功'
    });
  } catch (error) {
    console.error('选择机器人失败:', error);
    return NextResponse.json(
      { success: false, message: '选择机器人失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新负载均衡状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { robotId, updates } = body;

    if (!robotId || !updates) {
      return NextResponse.json(
        { success: false, message: '机器人ID和更新数据不能为空' },
        { status: 400 }
      );
    }

    const allowedFields = [
      'currentSessions', 'maxSessions', 'healthScore',
      'avgResponseTime', 'successRate', 'totalRequests', 'errorCount',
      'loadScore', 'performanceScore', 'isAvailable'
    ];

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fieldsToUpdate.push(`${snakeCase(field)} = $${paramIndex++}`);
        values.push(updates[field]);
      }
    }

    if (fieldsToUpdate.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有要更新的字段' },
        { status: 400 }
      );
    }

    // 自动计算综合得分
    fieldsToUpdate.push('updated_at = NOW()');
    fieldsToUpdate.push('load_score = GREATEST(0, current_sessions * 100.0 / NULLIF(max_sessions, 0))');
    fieldsToUpdate.push('performance_score = (health_score * 0.5 + success_rate * 0.3 + (100 - NULLIF(avg_response_time, 0)) * 0.2)');

    values.push(robotId);

    const query = `
      UPDATE robot_load_balancing
      SET ${fieldsToUpdate.join(', ')}
      WHERE robot_id = $${paramIndex}
      RETURNING *
    `;

    const result = await execSQL(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '机器人不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '更新负载均衡状态成功'
    });
  } catch (error) {
    console.error('更新负载均衡状态失败:', error);
    return NextResponse.json(
      { success: false, message: '更新负载均衡状态失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 辅助函数：驼峰转下划线
function snakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
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
