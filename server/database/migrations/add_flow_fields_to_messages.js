/**
 * WorkTool AI - 为 messages 和 session_messages 表添加流程引擎相关字段
 * Migration: add_flow_fields_to_messages.js
 */

import { db } from '../db.js';
import { sql } from 'drizzle-orm';

export async function up() {
  console.log('🚀 开始为 messages 和 session_messages 表添加流程引擎相关字段...');

  try {
    // 修改 messages 表
    console.log('  ⏳ 修改 messages 表...');
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(50)`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS priority VARCHAR(20)`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS alert_level VARCHAR(20)`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS alert_id VARCHAR(36)`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS track_task_id VARCHAR(36)`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_bot_comfort BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_conflict_message BOOLEAN DEFAULT false`);
    console.log('  ✅ messages 表字段添加成功');

    // 为 messages 表创建索引
    console.log('  ⏳ 为 messages 表创建索引...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_sender_role ON messages(sender_role)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_alert_level ON messages(alert_level)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_alert_id ON messages(alert_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_track_task_id ON messages(track_task_id)`);
    console.log('  ✅ messages 表索引创建成功');

    // 修改 session_messages 表
    console.log('  ⏳ 修改 session_messages 表...');
    await db.execute(sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS emotion VARCHAR(50)`);
    await db.execute(sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS emotion_score NUMERIC`);
    await db.execute(sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS cooperation_level INTEGER`);
    await db.execute(sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER`);
    await db.execute(sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS has_alert BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS is_bot_comfort BOOLEAN DEFAULT false`);
    console.log('  ✅ session_messages 表字段添加成功');

    // 为 session_messages 表创建索引
    console.log('  ⏳ 为 session_messages 表创建索引...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_session_messages_emotion ON session_messages(emotion)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_session_messages_has_alert ON session_messages(has_alert)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_session_messages_is_bot_comfort ON session_messages(is_bot_comfort)`);
    console.log('  ✅ session_messages 表索引创建成功');

    console.log('✅ messages 和 session_messages 表字段及索引添加完成！');
  } catch (error) {
    console.error('❌ 添加流程引擎字段失败:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 开始删除 messages 和 session_messages 表的流程引擎相关字段...');
  try {
    // 删除 messages 表的字段
    console.log('  ⏳ 删除 messages 表字段...');
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS sender_role`);
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS priority`);
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS alert_level`);
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS alert_id`);
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS track_task_id`);
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS is_bot_comfort`);
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS is_conflict_message`);
    console.log('  ✅ messages 表字段删除成功');

    // 删除 session_messages 表的字段
    console.log('  ⏳ 删除 session_messages 表字段...');
    await db.execute(sql`ALTER TABLE session_messages DROP COLUMN IF EXISTS emotion`);
    await db.execute(sql`ALTER TABLE session_messages DROP COLUMN IF EXISTS emotion_score`);
    await db.execute(sql`ALTER TABLE session_messages DROP COLUMN IF EXISTS cooperation_level`);
    await db.execute(sql`ALTER TABLE session_messages DROP COLUMN IF EXISTS satisfaction_score`);
    await db.execute(sql`ALTER TABLE session_messages DROP COLUMN IF EXISTS has_alert`);
    await db.execute(sql`ALTER TABLE session_messages DROP COLUMN IF EXISTS is_bot_comfort`);
    console.log('  ✅ session_messages 表字段删除成功');

    console.log('✅ messages 和 session_messages 表字段删除完成！');
  } catch (error) {
    console.error('❌ 删除流程引擎字段失败:', error);
    throw error;
  }
}
