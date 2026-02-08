/**
 * 验证工作人员类型迁移
 * 检查所有字段和表是否正确创建
 */

import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

interface ValidationResult {
  success: boolean;
  errors: string[];
  checks: {
    staff_type_in_staff: boolean;
    staff_type_in_interventions: boolean;
    after_sales_tasks_table: boolean;
    staff_identification_logs_table: boolean;
    related_task_id_in_alert_history: boolean;
    source_in_alert_history: boolean;
    staff_type_in_collaboration_logs: boolean;
    message_type_in_collaboration_logs: boolean;
  };
}

async function verifyMigration(): Promise<ValidationResult> {
  console.log('[Verification] 开始验证迁移结果...');

  const result: ValidationResult = {
    success: true,
    errors: [],
    checks: {
      staff_type_in_staff: false,
      staff_type_in_interventions: false,
      after_sales_tasks_table: false,
      staff_identification_logs_table: false,
      related_task_id_in_alert_history: false,
      source_in_alert_history: false,
      staff_type_in_collaboration_logs: false,
      message_type_in_collaboration_logs: false,
    },
  };

  try {
    const db = await getDb();

    // 1. 检查 staff.staff_type 字段
    console.log('[Verification] 检查 staff.staff_type 字段...');
    const staffColumnResult = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND column_name = 'staff_type'
    `);
    const staffColumn = staffColumnResult.rows || [];
    if (staffColumn.length > 0) {
      result.checks.staff_type_in_staff = true;
      console.log('[Verification] ✅ staff.staff_type 字段存在');
    } else {
      result.errors.push('staff.staff_type 字段不存在');
      result.success = false;
    }

    // 2. 检查 interventions.staff_type 字段
    console.log('[Verification] 检查 interventions.staff_type 字段...');
    const interventionColumnResult = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'interventions' 
      AND column_name = 'staff_type'
    `);
    const interventionColumn = interventionColumnResult.rows || [];
    if (interventionColumn.length > 0) {
      result.checks.staff_type_in_interventions = true;
      console.log('[Verification] ✅ interventions.staff_type 字段存在');
    } else {
      result.errors.push('interventions.staff_type 字段不存在');
      result.success = false;
    }

    // 3. 检查 after_sales_tasks 表
    console.log('[Verification] 检查 after_sales_tasks 表...');
    const taskTableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'after_sales_tasks'
    `);
    const taskTable = taskTableResult.rows || [];
    if (taskTable.length > 0) {
      result.checks.after_sales_tasks_table = true;
      console.log('[Verification] ✅ after_sales_tasks 表存在');

      // 检查关键字段
      const taskColumnsResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'after_sales_tasks'
        ORDER BY ordinal_position
      `);
      const taskColumns = taskColumnsResult.rows || [];
      console.log(`[Verification] after_sales_tasks 表有 ${taskColumns.length} 个字段`);
    } else {
      result.errors.push('after_sales_tasks 表不存在');
      result.success = false;
    }

    // 4. 检查 staff_identification_logs 表
    console.log('[Verification] 检查 staff_identification_logs 表...');
    const logTableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'staff_identification_logs'
    `);
    const logTable = logTableResult.rows || [];
    if (logTable.length > 0) {
      result.checks.staff_identification_logs_table = true;
      console.log('[Verification] ✅ staff_identification_logs 表存在');
    } else {
      result.errors.push('staff_identification_logs 表不存在');
      result.success = false;
    }

    // 5. 检查 alert_history 表的新字段
    console.log('[Verification] 检查 alert_history 表新字段...');
    const alertColumnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'alert_history' 
      AND column_name IN ('related_task_id', 'source')
    `);
    const alertColumns = alertColumnsResult.rows || [];
    if (alertColumns.length === 2) {
      result.checks.related_task_id_in_alert_history = true;
      result.checks.source_in_alert_history = true;
      console.log('[Verification] ✅ alert_history 新字段存在');
    } else {
      if (alertColumns.length === 0) {
        result.errors.push('alert_history 表缺少 related_task_id 和 source 字段');
      } else {
        result.errors.push(`alert_history 表只找到 ${alertColumns.length}/2 个新字段`);
      }
      result.success = false;
    }

    // 6. 检查 collaboration_decision_logs 表的新字段
    console.log('[Verification] 检查 collaboration_decision_logs 表新字段...');
    const decisionColumnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'collaboration_decision_logs' 
      AND column_name IN ('staff_type', 'message_type')
    `);
    const decisionColumns = decisionColumnsResult.rows || [];
    if (decisionColumns.length === 2) {
      result.checks.staff_type_in_collaboration_logs = true;
      result.checks.message_type_in_collaboration_logs = true;
      console.log('[Verification] ✅ collaboration_decision_logs 新字段存在');
    } else {
      if (decisionColumns.length === 0) {
        result.errors.push('collaboration_decision_logs 表缺少 staff_type 和 message_type 字段');
      } else {
        result.errors.push(`collaboration_decision_logs 表只找到 ${decisionColumns.length}/2 个新字段`);
      }
      result.success = false;
    }

    // 7. 检查索引
    console.log('[Verification] 检查索引...');
    const indexesResult = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('after_sales_tasks', 'staff_identification_logs')
    `);
    const indexes = indexesResult.rows || [];
    console.log(`[Verification] 找到 ${indexes.length} 个索引`);

    // 8. 数据采样检查
    console.log('[Verification] 数据采样检查...');
    const staffCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM staff`);
    const staffCount = staffCountResult.rows || [];
    console.log(`[Verification] staff 表有 ${staffCount[0]?.count || 0} 条记录`);

    const staffWithDefaultTypeResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM staff WHERE staff_type = 'management'
    `);
    const staffWithDefaultType = staffWithDefaultTypeResult.rows || [];
    console.log(`[Verification] staff_type 默认值为 'management' 的记录: ${staffWithDefaultType[0]?.count || 0}`);

    if (result.success) {
      console.log('[Verification] ✅ 验证通过！所有检查项都正确');
    } else {
      console.log('[Verification] ❌ 验证失败，发现以下问题:');
      result.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    return result;

  } catch (error) {
    console.error('[Verification] ❌ 验证过程出错:', error);
    result.errors.push(`验证过程出错: ${error}`);
    result.success = false;
    return result;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  verifyMigration()
    .then(result => {
      console.log('\n[Verification] 最终结果:', JSON.stringify(result.checks, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('[Verification] 执行失败:', error);
      process.exit(1);
    });
}

export { verifyMigration };
