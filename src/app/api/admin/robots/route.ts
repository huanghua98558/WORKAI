import { NextRequest, NextResponse } from 'next/server';

/**
 * 机器人管理 API（优化版 - 支持分组、角色、能力配置）
 * GET /api/admin/robots - 获取机器人列表（支持按分组、角色筛选）
 * POST /api/admin/robots - 创建机器人
 */

// GET - 获取机器人列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const roleId = searchParams.get('roleId');
    const status = searchParams.get('status');
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        r.*,
        rg.name as group_name,
        rg.color as group_color,
        rg.icon as group_icon,
        rg.priority as group_priority,
        rr.name as role_name,
        rr.permissions as role_permissions,
        lb.health_score,
        lb.is_available as is_available,
        lb.current_sessions,
        lb.max_sessions,
        lb.avg_response_time,
        lb.success_rate
      FROM robots r
      LEFT JOIN robot_groups rg ON r.group_id = rg.id
      LEFT JOIN robot_roles rr ON r.role_id = rr.id
      LEFT JOIN robot_load_balancing lb ON r.robot_id = lb.robot_id
      WHERE 1=1
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

    if (status) {
      query += ` AND r.status = $${paramIndex++}`;
      params.push(status);
    }

    if (isActive !== null) {
      query += ` AND r.is_active = $${paramIndex++}`;
      params.push(isActive === 'true');
    }

    query += ` ORDER BY r.priority DESC, r.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await execSQL(query, params);

    // 获取总数
    let countQuery = `SELECT COUNT(*) FROM robots r WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (groupId) {
      countQuery += ` AND r.group_id = $${countParamIndex++}`;
      countParams.push(groupId);
    }

    if (roleId) {
      countQuery += ` AND r.role_id = $${countParamIndex++}`;
      countParams.push(roleId);
    }

    if (status) {
      countQuery += ` AND r.status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (isActive !== null) {
      countQuery += ` AND r.is_active = $${countParamIndex++}`;
      countParams.push(isActive === 'true');
    }

    const countResult = await execSQL(countQuery, countParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error) {
    console.error('获取机器人列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取机器人列表失败', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - 创建机器人
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      robotId, 
      name, 
      apiBaseUrl, 
      description,
      groupId,
      roleId,
      capabilities,
      priority,
      maxConcurrentSessions,
      enabledIntents,
      aiModelConfig,
      responseConfig,
      loadBalancingWeight,
      tags,
      metadata,
      isActive 
    } = body;

    // 验证必填字段
    if (!robotId || !name) {
      return NextResponse.json(
        { success: false, message: '机器人ID和名称不能为空' },
        { status: 400 }
      );
    }

    // 检查机器人ID是否已存在
    const checkQuery = `SELECT id FROM robots WHERE robot_id = $1`;
    const checkResult = await execSQL(checkQuery, [robotId]);

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: '机器人ID已存在' },
        { status: 409 }
      );
    }

    // 插入机器人
    const query = `
      INSERT INTO robots (
        robot_id, name, api_base_url, description, 
        group_id, role_id, capabilities, priority,
        max_concurrent_sessions, enabled_intents,
        ai_model_config, response_config, load_balancing_weight,
        tags, metadata, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *
    `;

    const params = [
      robotId,
      name,
      apiBaseUrl || process.env.NEXT_PUBLIC_WORKTOOL_API_BASE_URL || 'https://api.worktool.ymdyes.cn/wework/',
      description || null,
      groupId || null,
      roleId || null,
      capabilities ? JSON.stringify(capabilities) : null,
      priority || 10,
      maxConcurrentSessions || 100,
      enabledIntents ? JSON.stringify(enabledIntents) : null,
      aiModelConfig ? JSON.stringify(aiModelConfig) : null,
      responseConfig ? JSON.stringify(responseConfig) : null,
      loadBalancingWeight || 1,
      tags ? JSON.stringify(tags) : '[]',
      metadata ? JSON.stringify(metadata) : '{}',
      isActive !== undefined ? isActive : true
    ];

    const result = await execSQL(query, params);

    // 初始化负载均衡记录
    const loadBalanceQuery = `
      INSERT INTO robot_load_balancing (robot_id, group_id, current_sessions, max_sessions, health_score, is_available)
      VALUES ($1, $2, 0, $3, 100, true)
    `;
    await execSQL(loadBalanceQuery, [robotId, groupId || null, maxConcurrentSessions || 100]);

    // 初始化能力记录
    const capabilitiesQuery = `
      INSERT INTO robot_capabilities (robot_id, capabilities, enabled_abilities, disabled_abilities)
      VALUES ($1, $2, $3, $4)
    `;
    await execSQL(capabilitiesQuery, [
      robotId,
      capabilities ? JSON.stringify(capabilities) : '[]',
      capabilities ? JSON.stringify(capabilities) : '[]',
      '[]'
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '创建机器人成功'
    });
  } catch (error) {
    console.error('创建机器人失败:', error);
    return NextResponse.json(
      { success: false, message: '创建机器人失败', error: String(error) },
      { status: 500 }
    );
  }
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
