#!/usr/bin/env node
/**
 * WorkTool AI - 执行流程引擎相关迁移
 * 执行 track_tasks 表创建和 messages/session_messages 表字段添加
 */

import pg from 'pg';
const { Client } = pg;

// 从环境变量获取数据库配置
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

async function runMigrations() {
  const client = new Client(dbConfig);

  try {
    console.log('🚀 开始执行流程引擎相关迁移\n');
    console.log('='.repeat(60));

    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // ========== 迁移 1: 创建 track_tasks 表 ==========
    console.log('📦 迁移 1: 创建 track_tasks 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS track_tasks (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        task_type VARCHAR(50) NOT NULL,
        task_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        group_id VARCHAR(255),
        group_name VARCHAR(255),
        operation_id VARCHAR(255),
        operation_name VARCHAR(255),
        staff_id VARCHAR(255),
        staff_name VARCHAR(255),
        target_user_id VARCHAR(255),
        target_user_name VARCHAR(255),
        task_requirement TEXT,
        task_description TEXT,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        deadline TIMESTAMP WITH TIME ZONE,
        response_detected_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        conflict_detected BOOLEAN DEFAULT false,
        conflict_resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `);
    console.log('  ✅ track_tasks 表创建成功');

    // 创建索引
    console.log('  ⏳ 创建索引...');
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_task_type_idx ON track_tasks(task_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_task_status_idx ON track_tasks(task_status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_priority_idx ON track_tasks(priority)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_target_user_id_idx ON track_tasks(target_user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_group_id_idx ON track_tasks(group_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_staff_id_idx ON track_tasks(staff_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_operation_id_idx ON track_tasks(operation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_created_at_idx ON track_tasks(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_deadline_idx ON track_tasks(deadline)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_response_detected_at_idx ON track_tasks(response_detected_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS track_tasks_pending_idx ON track_tasks(task_status, priority, created_at DESC) WHERE task_status IN ('pending', 'responded')`);
    console.log('  ✅ track_tasks 表索引创建成功\n');

    // ========== 迁移 2: 修改 messages 表 ==========
    console.log('📦 迁移 2: 修改 messages 表...');
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(50)`);
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS priority VARCHAR(20)`);
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS alert_level VARCHAR(20)`);
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS alert_id VARCHAR(36)`);
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS track_task_id VARCHAR(36)`);
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_bot_comfort BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_conflict_message BOOLEAN DEFAULT false`);
    console.log('  ✅ messages 表字段添加成功');

    // 为 messages 表创建索引
    console.log('  ⏳ 创建索引...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender_role ON messages(sender_role)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_alert_level ON messages(alert_level)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_alert_id ON messages(alert_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_track_task_id ON messages(track_task_id)`);
    console.log('  ✅ messages 表索引创建成功\n');

    // ========== 迁移 3: 修改 session_messages 表 ==========
    console.log('📦 迁移 3: 修改 session_messages 表...');
    await client.query(`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS emotion VARCHAR(50)`);
    await client.query(`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS emotion_score NUMERIC`);
    await client.query(`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS cooperation_level INTEGER`);
    await client.query(`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER`);
    await client.query(`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS has_alert BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS is_bot_comfort BOOLEAN DEFAULT false`);
    console.log('  ✅ session_messages 表字段添加成功');

    // 为 session_messages 表创建索引
    console.log('  ⏳ 创建索引...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_session_messages_emotion ON session_messages(emotion)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_session_messages_has_alert ON session_messages(has_alert)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_session_messages_is_bot_comfort ON session_messages(is_bot_comfort)`);
    console.log('  ✅ session_messages 表索引创建成功\n');

    console.log('='.repeat(60));
    console.log('✅ 所有流程引擎相关迁移执行完成！');
    console.log('\n已创建:');
    console.log('  - track_tasks 表及其索引');
    console.log('\n已修改:');
    console.log('  - messages 表（添加 7 个字段）');
    console.log('  - session_messages 表（添加 6 个字段）');
    console.log('\n数据库升级完成！🎉\n');

  } catch (error) {
    console.error('\n❌ 迁移执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 执行迁移
runMigrations();
