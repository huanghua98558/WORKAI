import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/flow-engine/versions/[id]/rollback
 * 回滚到指定版本
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const versionId = resolvedParams.id;

    // 开始事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. 查找要回滚的版本
      const versionQuery = `
        SELECT * FROM flow_definitions
        WHERE id = $1
      `;
      const versionResult = await client.query(versionQuery, [versionId]);

      if (versionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          error: '未找到指定的版本'
        }, { status: 404 });
      }

      const targetVersion = versionResult.rows[0];

      // 2. 将当前活跃版本设为非活跃
      await client.query(`
        UPDATE flow_definitions
        SET is_active = false, updated_at = NOW()
        WHERE name = $1 AND is_active = true
      `, [targetVersion.name]);

      // 3. 创建新版本（基于要回滚的版本）
      const currentVersionQuery = `
        SELECT MAX(version) as max_version
        FROM flow_definitions
        WHERE name = $1
      `;
      const maxVersionResult = await client.query(currentVersionQuery, [targetVersion.name]);
      const currentVersion = maxVersionResult.rows[0].max_version || '1.0';
      const newVersion = incrementVersion(currentVersion);

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

      const insertResult = await client.query(insertQuery, [
        targetVersion.name,
        targetVersion.description,
        newVersion,
        true, // 新版本为活跃版本
        targetVersion.trigger_type,
        targetVersion.trigger_config,
        targetVersion.nodes,
        targetVersion.edges,
        targetVersion.variables,
        targetVersion.timeout,
        targetVersion.retry_config,
        targetVersion.created_by,
        targetVersion.priority
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: insertResult.rows[0],
        message: `成功回滚到版本 ${targetVersion.version}，创建新版本 ${newVersion}`
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[POST /api/flow-engine/versions/[id]/rollback] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 版本号递增
 */
function incrementVersion(version: string): string {
  const parts = version.split('.');
  const major = parseInt(parts[0]) || 0;
  const minor = parseInt(parts[1]) || 0;
  return `${major}.${minor + 1}`;
}
