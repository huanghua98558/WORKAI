import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/flow-engine/versions/[id]/activate
 * 激活指定版本
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

      // 1. 查找要激活的版本
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

      // 3. 激活目标版本
      await client.query(`
        UPDATE flow_definitions
        SET is_active = true, updated_at = NOW()
        WHERE id = $1
      `, [versionId]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: targetVersion,
        message: `成功激活版本 ${targetVersion.version}`
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[POST /api/flow-engine/versions/[id]/activate] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
