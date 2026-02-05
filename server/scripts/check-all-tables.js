const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function checkAllTables() {
  try {
    const db = await getDb();

    // 获取所有表
    const result = await db.execute(sql`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('=== 数据库中的所有表 ===\n');
    console.log(`总表数: ${result.rows.length}\n`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name} (${row.table_type})`);
    });

    console.log('\n=== 检查告警相关表 ===\n');

    // 检查特定的告警相关表
    const alertTables = [
      'alert_history',
      'alert_groups',
      'alert_rules',
      'notification_methods',
      'alert_dedup_records',
      'alert_upgrades',
      'alert_notifications',
      'alert_recipients',
      'alert_batch_operations',
      'alert_stats_snapshots'
    ];

    for (const tableName of alertTables) {
      const exists = result.rows.some(row => row.table_name === tableName);
      console.log(`${tableName}: ${exists ? '✅ 存在' : '❌ 不存在'}`);

      if (exists) {
        // 获取表记录数
        const countResult = await db.execute(sql`
          SELECT COUNT(*) as count FROM ${sql.raw(tableName)}
        `);
        console.log(`  - 记录数: ${countResult.rows[0].count}`);

        // 获取表结构（前5个字段）
        const columns = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
          ORDER BY ordinal_position
          LIMIT 5
        `);
        console.log('  - 字段:', columns.rows.map(c => c.column_name).join(', '));
      }
      console.log('');
    }

  } catch (error) {
    console.error('检查失败:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
}

checkAllTables();
