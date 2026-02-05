/**
 * Migration: Add messageId to robot_commands table
 * 用于关联 WorkTool 回调和指令记录
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function up() {
  console.log('[Migration] Adding messageId column to robot_commands table...');

  const db = await getDb();

  try {
    // 检查列是否已存在
    const checkColumn = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'robot_commands'
      AND column_name = 'message_id';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('[Migration] messageId column already exists, skipping...');
      return;
    }

    // 添加 messageId 列
    await db.execute(sql`
      ALTER TABLE robot_commands
      ADD COLUMN message_id VARCHAR(100);
    `);

    // 添加索引以提高查询性能
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS robot_commands_message_id_idx
      ON robot_commands(message_id);
    `);

    console.log('[Migration] ✅ messageId column added successfully');

  } catch (error) {
    console.error('[Migration] ❌ Error adding messageId column:', error);
    throw error;
  }
}

async function down() {
  console.log('[Migration] Removing messageId column from robot_commands table...');

  const db = await getDb();

  try {
    // 删除索引
    await db.execute(sql`
      DROP INDEX IF EXISTS robot_commands_message_id_idx;
    `);

    // 删除列
    await db.execute(sql`
      ALTER TABLE robot_commands
      DROP COLUMN IF EXISTS message_id;
    `);

    console.log('[Migration] ✅ messageId column removed successfully');

  } catch (error) {
    console.error('[Migration] ❌ Error removing messageId column:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      if (command === 'down') {
        await down();
      } else {
        await up();
      }
      console.log('[Migration] Migration completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('[Migration] Migration failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
