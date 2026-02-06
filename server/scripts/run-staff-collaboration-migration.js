/**
 * 执行工作人员协同功能迁移
 */

const { getDb } = require('coze-coding-dev-sdk');
const migration = require('../database/migrations/add_staff_collaboration');

async function runMigration() {
  console.log('[Migration Script] 开始执行迁移...');

  try {
    const db = await getDb();

    // 执行迁移
    await migration.up(db);

    console.log('[Migration Script] ✅ 迁移执行成功');

    // 验证表是否创建成功
    console.log('[Migration Script] 验证表创建情况...');

    const tables = await db.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'staff_messages',
        'staff_activities',
        'session_staff_status',
        'info_detection_history',
        'collaboration_decision_logs'
      )
      ORDER BY table_name
    `);

    console.log('[Migration Script] 创建的表:', tables.rows.map(row => row.table_name));

    if (tables.rows.length === 5) {
      console.log('[Migration Script] ✅ 所有表创建成功');
    } else {
      console.warn(`[Migration Script] ⚠️  预期创建5个表，实际创建${tables.rows.length}个表`);
    }

  } catch (error) {
    console.error('[Migration Script] ❌ 迁移执行失败:', error);
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    console.log('[Migration Script] 迁移完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('[Migration Script] 错误:', error);
    process.exit(1);
  });
