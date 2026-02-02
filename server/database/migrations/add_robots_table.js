/**
 * 数据库迁移脚本：添加机器人管理表
 * 
 * 使用方法：
 * node server/database/migrations/add_robots_table.js
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { robots } = require('../schema');

async function up() {
  console.log('开始创建机器人管理表...');
  
  const db = await getDb();

  // 创建机器人管理表
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS robots (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      robot_id VARCHAR(64) NOT NULL UNIQUE,
      api_base_url VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      status VARCHAR(20) NOT NULL DEFAULT 'unknown',
      last_check_at TIMESTAMP WITH TIME ZONE,
      last_error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  // 创建索引
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robots_robot_id_idx ON robots(robot_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robots_is_active_idx ON robots(is_active);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robots_status_idx ON robots(status);`);

  console.log('✅ 机器人管理表创建成功');
}

async function down() {
  console.log('开始删除机器人管理表...');
  
  const db = await getDb();

  await db.execute(sql`DROP TABLE IF EXISTS robots CASCADE;`);

  console.log('✅ 机器人管理表删除成功');
}

// 执行迁移
async function run() {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';

  try {
    if (command === 'up') {
      await up();
    } else if (command === 'down') {
      await down();
    } else {
      console.log('用法: node add_robots_table.js [up|down]');
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

run();
