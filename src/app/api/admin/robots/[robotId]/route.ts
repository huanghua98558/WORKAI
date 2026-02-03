import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人详情 API
 * GET /api/admin/robots/[robotId] - 获取机器人详情
 * PUT /api/admin/robots/[robotId] - 更新机器人
 * DELETE /api/admin/robots/[robotId] - 删除机器人
 */

// GET - 获取机器人详情
export async function GET(
  request: NextRequest,
  { params }: { params: { robotId: string } }
) {
  try {
    const { robotId } = params;

    const query = `
      SELECT 
        r.*,
        rg.name as group_name,
        rg.color as group_color,
        rg.icon as group_icon,
        rg.priority as group_priority,
        rr.name as role_name,
        rr.permissions as role_permissions,
        rr.priority as role_priority,
        lb.health_score,
        lb.is_available as is_available,
        lb.current_sessions,
        lb.max_sessions,
        lb.avg_response_time,
        lb.success_rate,
        lb.total_requests,
        lb.error_count,
        lb.load_score,
        lb.performance_score
      FROM robots r
      LEFT JOIN robot_groups rg ON r.group_id = rg.id
      LEFT JOIN robot_roles rr ON r.role_id = rr.id
      LEFT JOIN robot_load_balancing lb ON r.robot_id = lb.robot_id
      WHERE r.robot_id = $1
    `;

    const result = await execSQL(query, [robotId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '机器人不存在' },
        { status: 404 }
      );
    }

    // 获取机器人的能力
    const capsQuery = `
      SELECT * FROM robot_capabilities WHERE robot_id = $1
    `;
    const capsResult = await execSQL(capsQuery, [robotId]);

    // 获取机器人的会话统计
    const sessionQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_sessions,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration
      FROM robot_sessions 
      WHERE robot_id = $1
    `;
    const sessionResult = await execSQL(sessionQuery, [robotId]);

    // 获取最近的指令
    const recentCommandsQuery = `
      SELECT * FROM robot_commands
      WHERE robot_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const recentCommandsResult = await execSQL(recentCommandsQuery, [robotId]);

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        capabilities: capsResult.rows[0] || null,
        sessionStats: sessionResult.rows[0],
        recentCommands: recentCommandsResult.rows
      }
    });
  } catch (error) {
    console.error('获取机器人详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取机器人详情失败', error: String(error) },
      { status: 500 }
    );
  }
}

// PUT - 更新机器人
export async function PUT(
  request: NextRequest,
  { params }: { params: { robotId: string } }
) {
  try {
    const { robotId } = params;
    const body = await request.json();

    // 构建动态更新字段
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'apiBaseUrl', 'description', 'groupId', 'roleId',
      'capabilities', 'priority', 'maxConcurrentSessions', 'enabledIntents',
      'aiModelConfig', 'responseConfig', 'loadBalancingWeight', 'tags',
      'metadata', 'isActive', 'status', 'lastHeartbeat', 'version'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${snakeCase(field)} = $${paramIndex++}`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有要更新的字段' },
        { status: 400 }
      );
    }

    // 添加 updated_at
    updates.push(`updated_at = NOW()`);
    values.push(robotId);
    values.push(robotId); // WHERE 条件

    const query = `
      UPDATE robots 
      SET ${updates.join(', ')}
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

    // 如果更新了 maxConcurrentSessions，同步更新负载均衡表
    if (body.maxConcurrentSessions !== undefined) {
      const updateLbQuery = `
        UPDATE robot_load_balancing 
        SET max_sessions = $1, updated_at = NOW()
        WHERE robot_id = $2
      `;
      await execSQL(updateLbQuery, [body.maxConcurrentSessions, robotId]);
    }

    // 如果更新了 capabilities，同步更新能力表
    if (body.capabilities !== undefined) {
      const updateCapsQuery = `
        UPDATE robot_capabilities 
        SET capabilities = $1, enabled_abilities = $1, updated_at = NOW()
        WHERE robot_id = $2
      `;
      await execSQL(updateCapsQuery, [JSON.stringify(body.capabilities), robotId]);
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '更新机器人成功'
    });
  } catch (error) {
    console.error('更新机器人失败:', error);
    return NextResponse.json(
      { success: false, message: '更新机器人失败', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - 删除机器人
export async function DELETE(
  request: NextRequest,
  { params }: { params: { robotId: string } }
) {
  try {
    const { robotId } = params;

    // 检查机器人是否存在
    const checkQuery = `SELECT id, status FROM robots WHERE robot_id = $1`;
    const checkResult = await execSQL(checkQuery, [robotId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '机器人不存在' },
        { status: 404 }
      );
    }

    // 检查机器人是否有活跃会话
    const activeSessionQuery = `
      SELECT COUNT(*) FROM robot_sessions 
      WHERE robot_id = $1 AND status = 'active'
    `;
    const activeSessionResult = await execSQL(activeSessionQuery, [robotId]);

    if (parseInt(activeSessionResult.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, message: '机器人有活跃会话，无法删除' },
        { status: 400 }
      );
    }

    // 删除机器人
    await execSQL('BEGIN', []);

    try {
      // 删除指令队列
      await execSQL(`DELETE FROM robot_commands WHERE robot_id = $1`, [robotId]);
      
      // 删除会话
      await execSQL(`DELETE FROM robot_sessions WHERE robot_id = $1`, [robotId]);
      
      // 删除能力
      await execSQL(`DELETE FROM robot_capabilities WHERE robot_id = $1`, [robotId]);
      
      // 删除负载均衡记录
      await execSQL(`DELETE FROM robot_load_balancing WHERE robot_id = $1`, [robotId]);
      
      // 删除回调日志
      await execSQL(`DELETE FROM robot_callback_logs WHERE robot_id = $1`, [robotId]);
      
      // 删除机器人
      await execSQL(`DELETE FROM robots WHERE robot_id = $1`, [robotId]);

      await execSQL('COMMIT', []);

      return NextResponse.json({
        success: true,
        message: '删除机器人成功'
      });
    } catch (error) {
      await execSQL('ROLLBACK', []);
      throw error;
    }
  } catch (error) {
    console.error('删除机器人失败:', error);
    return NextResponse.json(
      { success: false, message: '删除机器人失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 启用/停用机器人
export async function POST(
  request: NextRequest,
  { params }: { params: { robotId: string } }
) {
  try {
    const { robotId } = params;
    const body = await request.json();
    const { action } = body; // 'activate' | 'deactivate'

    if (!action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { success: false, message: '无效的操作' },
        { status: 400 }
      );
    }

    const isActive = action === 'activate';
    const status = isActive ? 'online' : 'offline';

    const query = `
      UPDATE robots 
      SET is_active = $1, status = $2, updated_at = NOW()
      WHERE robot_id = $3
      RETURNING *
    `;

    const result = await execSQL(query, [isActive, status, robotId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: '机器人不存在' },
        { status: 404 }
      );
    }

    // 更新负载均衡可用性
    const updateLbQuery = `
      UPDATE robot_load_balancing 
      SET is_available = $1, updated_at = NOW()
      WHERE robot_id = $2
    `;
    await execSQL(updateLbQuery, [isActive, robotId]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: isActive ? '启用机器人成功' : '停用机器人成功'
    });
  } catch (error) {
    console.error('操作机器人失败:', error);
    return NextResponse.json(
      { success: false, message: '操作机器人失败', error: String(error) },
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
