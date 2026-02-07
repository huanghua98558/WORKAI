import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/flow-engine/versions?flowName=xxx
 * 获取指定流程的所有版本
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const flowName = searchParams.get('flowName');

    if (!flowName) {
      return NextResponse.json({
        success: false,
        error: 'flowName 参数必填'
      }, { status: 400 });
    }

    const query = `
      SELECT 
        id,
        name,
        version,
        is_active,
        description,
        created_by,
        created_at,
        updated_at,
        priority
      FROM flow_definitions
      WHERE name = $1
      ORDER BY version DESC
    `;

    const result = await pool.query(query, [flowName]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error: any) {
    console.error('[GET /api/flow-engine/versions] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/flow-engine/versions
 * 创建新版本（基于当前活跃版本）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowName, changes } = body;

    if (!flowName) {
      return NextResponse.json({
        success: false,
        error: 'flowName 参数必填'
      }, { status: 400 });
    }

    // 开始事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. 查找当前活跃版本
      const currentQuery = `
        SELECT * FROM flow_definitions
        WHERE name = $1 AND is_active = true
      `;
      const currentResult = await client.query(currentQuery, [flowName]);

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          error: '未找到活跃版本的流程定义'
        }, { status: 404 });
      }

      const currentFlow = currentResult.rows[0];

      // 2. 将当前版本设为非活跃
      await client.query(`
        UPDATE flow_definitions
        SET is_active = false, updated_at = NOW()
        WHERE name = $1 AND is_active = true
      `, [flowName]);

      // 3. 计算新版本号
      const maxVersionQuery = `
        SELECT MAX(version) as max_version
        FROM flow_definitions
        WHERE name = $1
      `;
      const maxVersionResult = await client.query(maxVersionQuery, [flowName]);
      const currentVersion = maxVersionResult.rows[0].max_version || '1.0';
      const newVersion = incrementVersion(currentVersion);

      // 4. 创建新版本
      const insertQuery = `
        INSERT INTO flow_definitions (
          name,
          description,
          version,
          is_active,
          trigger_type,
          trigger_config,
          nodes,
          edges,
          variables,
          timeout,
          retry_config,
          created_by,
          priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      // 如果有修改，应用修改
      const newNodes = changes?.nodes || currentFlow.nodes;
      const newEdges = changes?.edges || currentFlow.edges;
      const newVariables = changes?.variables || currentFlow.variables;

      const insertResult = await client.query(insertQuery, [
        flowName,
        currentFlow.description,
        newVersion,
        true, // 新版本为活跃版本
        currentFlow.trigger_type,
        currentFlow.trigger_config,
        newNodes,
        newEdges,
        newVariables,
        currentFlow.timeout,
        currentFlow.retry_config,
        currentFlow.created_by,
        currentFlow.priority
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: insertResult.rows[0],
        message: `成功创建版本 ${newVersion}`
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[POST /api/flow-engine/versions] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 版本号递增
 * 1.0 -> 1.1 -> 1.2 -> 2.0
 */
function incrementVersion(version: string): string {
  const parts = version.split('.');
  const major = parseInt(parts[0]) || 0;
  const minor = parseInt(parts[1]) || 0;

  // 如果是主版本变更（有重大修改），递增主版本
  // 这里简单处理：每次递增次版本
  return `${major}.${minor + 1}`;
}
