const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function checkTable() {
  try {
    const db = await getDb();

    // 检查表是否存在
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'alert_history'
    `);

    console.log('alert_history表存在:', result.rows.length > 0);

    if (result.rows.length > 0) {
      // 获取表结构
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'alert_history'
        ORDER BY ordinal_position
      `);

      console.log('\n表结构:');
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // 统计数据
      const count = await db.execute(sql`SELECT COUNT(*) as count FROM alert_history`);
      console.log(`\n总记录数: ${count.rows[0].count}`);
    }
  } catch (error) {
    console.error('检查失败:', error.message);
  }
  process.exit(0);
}

checkTable();
