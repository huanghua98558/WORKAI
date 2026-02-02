/**
 * 数据库迁移脚本：添加会话消息记录表
 * 用于长期存储完整的消息记录，便于查询和历史追溯
 *
 * 使用方法：
 * node server/database/migrations/add_session_messages_table.js
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function up() {
  console.log('开始创建会话消息记录表...');

  const db = await getDb();

  // 创建会话消息记录表
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS session_messages (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id VARCHAR(255) NOT NULL,
      message_id VARCHAR(255),
      user_id VARCHAR(255),
      group_id VARCHAR(255),
      user_name VARCHAR(255),
      group_name VARCHAR(255),
      content TEXT NOT NULL,
      is_from_user BOOLEAN NOT NULL DEFAULT false,
      is_from_bot BOOLEAN NOT NULL DEFAULT false,
      is_human BOOLEAN NOT NULL DEFAULT false,
      intent VARCHAR(50),
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      extra_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  // 创建索引
  await db.execute(sql`CREATE INDEX IF NOT EXISTS session_messages_session_id_idx ON session_messages(session_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS session_messages_user_id_idx ON session_messages(user_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS session_messages_group_id_idx ON session_messages(group_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS session_messages_timestamp_idx ON session_messages(timestamp);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS session_messages_intent_idx ON session_messages(intent);`);

  console.log('✅ 会话消息记录表创建成功');
}

async function down() {
  console.log('开始删除会话消息记录表...');

  const db = await getDb();

  await db.execute(sql`DROP TABLE IF EXISTS session_messages CASCADE;`);

  console.log('✅ 会话消息记录表删除成功');
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
      console.log('用法: node add_session_messages_table.js [up|down]');
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

run();
