/**
 * 回滚工作人员类型迁移
 * 删除添加的字段和表
 */

import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

async function rollbackMigration() {
  console.log('[Rollback] 开始回滚工作人员类型迁移...');

  try {
    const db = await getDb();

    // 1. 删除 collaboration_decision_logs 的新字段
    console.log('[Rollback] 删除 collaboration_decision_logs 新字段...');
    try {
      await db.execute(sql`
        ALTER TABLE collaboration_decision_logs 
        DROP COLUMN IF EXISTS staff_type,
        DROP COLUMN IF EXISTS message_type
      `);
      console.log('[Rollback] ✅ collaboration_decision_logs 新字段删除成功');
    } catch (error) {
      console.log('[Rollback] collaboration_decision_logs 新字段不存在或已删除');
    }

    // 2. 删除 alert_history 的新字段
    console.log('[Rollback] 删除 alert_history 新字段...');
    try {
      await db.execute(sql`
        ALTER TABLE alert_history 
        DROP COLUMN IF EXISTS related_task_id,
        DROP COLUMN IF EXISTS source
      `);
      console.log('[Rollback] ✅ alert_history 新字段删除成功');
    } catch (error) {
      console.log('[Rollback] alert_history 新字段不存在或已删除');
    }

    // 3. 删除工作人员识别日志表
    console.log('[Rollback] 删除 staff_identification_logs 表...');
    try {
      await db.execute(sql`DROP TABLE IF EXISTS staff_identification_logs`);
      console.log('[Rollback] ✅ staff_identification_logs 表删除成功');
    } catch (error) {
      console.log('[Rollback] staff_identification_logs 表不存在或已删除');
    }

    // 4. 删除售后任务表
    console.log('[Rollback] 删除 after_sales_tasks 表...');
    try {
      await db.execute(sql`DROP TABLE IF EXISTS after_sales_tasks`);
      console.log('[Rollback] ✅ after_sales_tasks 表删除成功');
    } catch (error) {
      console.log('[Rollback] after_sales_tasks 表不存在或已删除');
    }

    // 5. 删除 interventions 表的 staff_type 字段
    console.log('[Rollback] 删除 interventions.staff_type 字段...');
    try {
      await db.execute(sql`
        ALTER TABLE interventions 
        DROP COLUMN IF EXISTS staff_type
      `);
      console.log('[Rollback] ✅ interventions.staff_type 字段删除成功');
    } catch (error) {
      console.log('[Rollback] interventions.staff_type 字段不存在或已删除');
    }

    // 6. 删除 staff 表的 staff_type 字段
    console.log('[Rollback] 删除 staff.staff_type 字段...');
    try {
      await db.execute(sql`
        ALTER TABLE staff 
        DROP COLUMN IF EXISTS staff_type
      `);
      console.log('[Rollback] ✅ staff.staff_type 字段删除成功');
    } catch (error) {
      console.log('[Rollback] staff.staff_type 字段不存在或已删除');
    }

    console.log('[Rollback] ✅ 回滚完成！');
    return { success: true };

  } catch (error) {
    console.error('[Rollback] ❌ 回滚失败:', error);
    return { success: false, error };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  rollbackMigration()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('[Rollback] 执行失败:', error);
      process.exit(1);
    });
}

export { rollbackMigration };
