const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addRobotIdColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ 连接数据库成功');

    // 检查 robot_id 列是否存在
    const checkColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'business_roles'
        AND column_name = 'robot_id'
      );
    `);

    if (checkColumn.rows[0].exists) {
      console.log('⚠️  列 robot_id 已存在，跳过添加');
      return;
    }

    // 添加 robot_id 列
    await client.query(`
      ALTER TABLE business_roles
      ADD COLUMN robot_id VARCHAR(36);
    `);

    // 创建索引
    await client.query(`
      CREATE INDEX business_roles_robot_id_idx ON business_roles(robot_id);
    `);

    console.log('✓ 列 robot_id 添加成功');
  } catch (error) {
    console.error('✗ 添加列失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addRobotIdColumn();
