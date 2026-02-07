const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createBusinessRolesTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ 连接数据库成功');

    // 检查表是否存在
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'business_roles'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('⚠️  表 business_roles 已存在，跳过创建');
      return;
    }

    // 创建表
    await client.query(`
      CREATE TABLE business_roles (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        ai_behavior VARCHAR(20) NOT NULL DEFAULT 'semi_auto',
        staff_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        staff_type_filter JSONB DEFAULT '[]'::jsonb,
        keywords JSONB DEFAULT '[]'::jsonb,
        enable_task_creation BOOLEAN NOT NULL DEFAULT FALSE,
        default_task_priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        robot_id VARCHAR(36),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX business_roles_code_idx ON business_roles(code);
      CREATE INDEX business_roles_robot_id_idx ON business_roles(robot_id);
      CREATE INDEX business_roles_ai_behavior_idx ON business_roles(ai_behavior);
    `);

    console.log('✓ 表 business_roles 创建成功');
  } catch (error) {
    console.error('✗ 创建表失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createBusinessRolesTable();
