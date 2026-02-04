/**
 * 创建审计日志表
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function createAuditLogsTable() {
  const db = await getDb();

  console.log('开始创建审计日志表...');

  try {
    // 创建表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36),
        username VARCHAR(64),
        action VARCHAR(50) NOT NULL,
        resource VARCHAR(100),
        resource_id VARCHAR(36),
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(50),
        user_agent TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ audit_logs 表创建成功');

    // 创建索引
    await db.execute(sql`CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id)`);
    console.log('✅ audit_logs_user_id_idx 索引创建成功');

    await db.execute(sql`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action)`);
    console.log('✅ audit_logs_action_idx 索引创建成功');

    await db.execute(sql`CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource)`);
    console.log('✅ audit_logs_resource_idx 索引创建成功');

    await db.execute(sql`CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at)`);
    console.log('✅ audit_logs_created_at_idx 索引创建成功');

    console.log('\n🎉 审计日志表和索引创建完成！');
  } catch (error) {
    console.error('❌ 创建审计日志表失败:', error.message);
    throw error;
  }
}

createAuditLogsTable()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
