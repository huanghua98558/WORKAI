/**
 * 迁移工作人员类型
 * 为现有工作人员添加 staff_type 字段
 */

import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

async function migrateStaffType() {
  console.log('[Migration] 开始迁移工作人员类型...');

  try {
    const db = await getDb();

    // 1. 检查 staff_type 字段是否已存在
    const checkColumnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND column_name = 'staff_type'
    `);

    const checkColumn = checkColumnResult.rows || [];

    if (checkColumn.length > 0) {
      console.log('[Migration] staff_type 字段已存在，跳过创建');
    } else {
      // 2. 添加 staff_type 字段
      console.log('[Migration] 添加 staff_type 字段...');
      await db.execute(sql`
        ALTER TABLE staff 
        ADD COLUMN staff_type VARCHAR(50) DEFAULT 'management'
      `);
      console.log('[Migration] ✅ staff_type 字段添加成功');
    }

    // 3. 检查 interventions 表的 staff_type 字段
    const checkInterventionResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'interventions' 
      AND column_name = 'staff_type'
    `);

    const checkInterventionColumn = checkInterventionResult.rows || [];

    if (checkInterventionColumn.length > 0) {
      console.log('[Migration] interventions.staff_type 字段已存在，跳过创建');
    } else {
      // 4. 为 interventions 表添加 staff_type 字段
      console.log('[Migration] 添加 interventions.staff_type 字段...');
      await db.execute(sql`
        ALTER TABLE interventions 
        ADD COLUMN staff_type VARCHAR(50) DEFAULT 'management'
      `);
      console.log('[Migration] ✅ interventions.staff_type 字段添加成功');
    }

    // 5. 创建售后任务表
    console.log('[Migration] 创建售后任务表...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS after_sales_tasks (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL,
        staff_user_id VARCHAR(255),
        staff_name VARCHAR(255),
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        task_type VARCHAR(50) DEFAULT 'general',
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(50) DEFAULT 'pending',
        title VARCHAR(255),
        description TEXT,
        message_id VARCHAR(255),
        keyword VARCHAR(100),
        escalated_from VARCHAR(36),
        escalation_reason TEXT,
        expected_response_time TIMESTAMP WITH TIME ZONE,
        timeout_reminder_level INTEGER DEFAULT 0,
        last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
        assigned_to VARCHAR(36),
        assigned_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by VARCHAR(36),
        completion_note TEXT,
        metadata JSONB DEFAULT '{}'
      )
    `);
    console.log('[Migration] ✅ 售后任务表创建成功');

    // 6. 创建工作人员识别日志表
    console.log('[Migration] 创建工作人员识别日志表...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS staff_identification_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255) NOT NULL,
        sender_user_id VARCHAR(255),
        sender_name VARCHAR(255),
        is_identified_as_staff BOOLEAN NOT NULL,
        staff_type VARCHAR(50),
        confidence INTEGER,
        identification_method VARCHAR(50),
        matched_keywords TEXT,
        matched_pattern VARCHAR(255),
        manual_override_by VARCHAR(36),
        manual_override_reason TEXT,
        original_identification JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('[Migration] ✅ 工作人员识别日志表创建成功');

    // 7. 添加 alertHistory 表的新字段
    const checkAlertRelatedTaskResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'alert_history' 
      AND column_name = 'related_task_id'
    `);

    const checkAlertRelatedTask = checkAlertRelatedTaskResult.rows || [];

    if (checkAlertRelatedTask.length > 0) {
      console.log('[Migration] alert_history.related_task_id 字段已存在，跳过创建');
    } else {
      console.log('[Migration] 添加 alert_history 新字段...');
      await db.execute(sql`
        ALTER TABLE alert_history 
        ADD COLUMN related_task_id VARCHAR(36),
        ADD COLUMN source VARCHAR(50)
      `);
      console.log('[Migration] ✅ alert_history 新字段添加成功');
    }

    // 8. 添加 collaborationDecisionLogs 表的新字段
    const checkDecisionStaffTypeResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'collaboration_decision_logs' 
      AND column_name = 'staff_type'
    `);

    const checkDecisionStaffType = checkDecisionStaffTypeResult.rows || [];

    if (checkDecisionStaffType.length > 0) {
      console.log('[Migration] collaboration_decision_logs.staff_type 字段已存在，跳过创建');
    } else {
      console.log('[Migration] 添加 collaboration_decision_logs 新字段...');
      await db.execute(sql`
        ALTER TABLE collaboration_decision_logs 
        ADD COLUMN staff_type VARCHAR(50),
        ADD COLUMN message_type VARCHAR(50)
      `);
      console.log('[Migration] ✅ collaboration_decision_logs 新字段添加成功');
    }

    console.log('[Migration] ✅ 迁移完成！');
    return { success: true };

  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error);
    return { success: false, error };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateStaffType()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('[Migration] 执行失败:', error);
      process.exit(1);
    });
}

export { migrateStaffType };
