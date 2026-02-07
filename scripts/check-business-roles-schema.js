const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTableSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ 连接数据库成功');

    // 查看表结构
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'business_roles'
      ORDER BY ordinal_position;
    `);

    console.log('\n表结构:');
    console.table(result.rows);
  } catch (error) {
    console.error('✗ 查询失败:', error.message);
  } finally {
    await client.end();
  }
}

checkTableSchema();
