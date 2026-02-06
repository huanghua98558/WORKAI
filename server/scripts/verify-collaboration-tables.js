/**
 * 验证协同相关表是否创建成功
 */

const { getDb } = require('coze-coding-dev-sdk');

async function verifyTables() {
  console.log('[Verification] 开始验证表创建情况...');

  try {
    const db = await getDb();

    // 1. 查询所有协同相关表
    const tablesResult = await db.execute(`
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

    console.log('[Verification] 协同相关表:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // 2. 查询每个表的列信息
    const tables = ['staff_messages', 'staff_activities', 'session_staff_status', 'info_detection_history', 'collaboration_decision_logs'];

    for (const tableName of tables) {
      const columnsResult = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `);

      console.log(`\n[Verification] 表 ${tableName} 的列:`);
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }

    // 3. 查询索引信息
    console.log('\n[Verification] 协同相关表的索引:');
    for (const tableName of tables) {
      const indexesResult = await db.execute(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = '${tableName}'
        AND schemaname = 'public'
        ORDER BY indexname
      `);

      if (indexesResult.rows.length > 0) {
        console.log(`\n${tableName} 的索引:`);
        indexesResult.rows.forEach(idx => {
          console.log(`  - ${idx.indexname}`);
        });
      }
    }

    // 4. 查询表记录数
    console.log('\n[Verification] 表记录数:');
    for (const tableName of tables) {
      const countResult = await db.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`  - ${tableName}: ${countResult.rows[0].count} 条记录`);
    }

    console.log('\n[Verification] ✅ 验证完成');

  } catch (error) {
    console.error('[Verification] ❌ 验证失败:', error);
    process.exit(1);
  }
}

verifyTables()
  .then(() => {
    console.log('[Verification] 完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('[Verification] 错误:', error);
    process.exit(1);
  });
