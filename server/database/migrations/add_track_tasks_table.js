/**
 * WorkTool AI - 创建跟踪任务表
 * Migration: add_track_tasks_table.js
 */

import { db } from '../db.js';
import { sql } from 'drizzle-orm';

export async function up() {
  console.log('🚀 开始创建 track_tasks 表...');

  try {
    // 创建 track_tasks 表
    await db.execute(sql`
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
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_task_type_idx ON track_tasks(task_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_task_status_idx ON track_tasks(task_status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_priority_idx ON track_tasks(priority)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_target_user_id_idx ON track_tasks(target_user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_group_id_idx ON track_tasks(group_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_staff_id_idx ON track_tasks(staff_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_operation_id_idx ON track_tasks(operation_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_created_at_idx ON track_tasks(created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_deadline_idx ON track_tasks(deadline)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_response_detected_at_idx ON track_tasks(response_detected_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS track_tasks_pending_idx ON track_tasks(task_status, priority, created_at DESC) WHERE task_status IN ('pending', 'responded')`);
    console.log('  ✅ 索引创建成功');

    console.log('✅ track_tasks 表及其索引创建完成！');
  } catch (error) {
    console.error('❌ 创建 track_tasks 表失败:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 开始删除 track_tasks 表...');
  try {
    await db.execute(sql`DROP TABLE IF EXISTS track_tasks CASCADE`);
    console.log('✅ track_tasks 表删除成功');
  } catch (error) {
    console.error('❌ 删除 track_tasks 表失败:', error);
    throw error;
  }
}
