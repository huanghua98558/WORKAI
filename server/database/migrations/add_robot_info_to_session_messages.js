/**
 * 数据库迁移脚本：为会话消息记录表添加机器人信息字段
 *
 * 使用方法：
 * node server/database/migrations/add_robot_info_to_session_messages.js
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function up() {
  console.log('开始添加机器人信息字段到会话消息记录表...');

  const db = await getDb();

  // 添加 robot_id 字段
  try {
    await db.execute(sql`
      ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS robot_id VARCHAR(64);
    `);
    console.log('✅ 添加 robot_id 字段成功');
  } catch (error) {
    console.log('⚠️  robot_id 字段可能已存在:', error.message);
  }

  // 添加 robot_name 字段
  try {
    await db.execute(sql`
      ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS robot_name VARCHAR(255);
    `);
    console.log('✅ 添加 robot_name 字段成功');
  } catch (error) {
    console.log('⚠️  robot_name 字段可能已存在:', error.message);
  }

  // 创建索引
  await db.execute(sql`CREATE INDEX IF NOT EXISTS session_messages_robot_id_idx ON session_messages(robot_id);`);
  console.log('✅ robot_id 索引创建成功');

  console.log('✅ 所有字段添加完成');
}

async function down() {
  console.log('开始删除机器人信息字段...');

  const db = await getDb();

  // 删除索引
  await db.execute(sql`DROP INDEX IF EXISTS session_messages_robot_id_idx;`);

  // 删除字段
  await db.execute(sql`ALTER TABLE session_messages DROP COLUMN IF EXISTS robot_name;`);
  await db.execute(sql`ALTER TABLE session_messages DROP COLUMN IF EXISTS robot_id;`);

  console.log('✅ 机器人信息字段删除成功');
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
      console.log('用法: node add_robot_info_to_session_messages.js [up|down]');
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

run();
