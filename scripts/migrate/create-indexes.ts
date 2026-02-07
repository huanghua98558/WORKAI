/**
 * 创建索引脚本
 * 为新表和新字段创建索引以提高查询性能
 */

import { getDb } from '@coze-coding-dev-sdk/postgres';
import { sql } from 'drizzle-orm';

interface IndexResult {
  success: boolean;
  created: string[];
  errors: string[];
}

async function createIndexes(): Promise<IndexResult> {
  console.log('[Indexes] 开始创建索引...');

  const result: IndexResult = {
    success: true,
    created: [],
    errors: [],
  };

  try {
    const db = await getDb();

    // 1. 售后任务表索引
    console.log('[Indexes] 创建售后任务表索引...');
    
    const taskIndexes = [
      {
        name: 'idx_after_sales_tasks_session_id',
        table: 'after_sales_tasks',
        columns: ['session_id'],
      },
      {
        name: 'idx_after_sales_tasks_staff_user_id',
        table: 'after_sales_tasks',
        columns: ['staff_user_id'],
      },
      {
        name: 'idx_after_sales_tasks_user_id',
        table: 'after_sales_tasks',
        columns: ['user_id'],
      },
      {
        name: 'idx_after_sales_tasks_status',
        table: 'after_sales_tasks',
        columns: ['status'],
      },
      {
        name: 'idx_after_sales_tasks_priority',
        table: 'after_sales_tasks',
        columns: ['priority'],
      },
      {
        name: 'idx_after_sales_tasks_created_at',
        table: 'after_sales_tasks',
        columns: ['created_at'],
      },
      {
        name: 'idx_after_sales_tasks_expected_response_time',
        table: 'after_sales_tasks',
        columns: ['expected_response_time'],
      },
      {
        name: 'idx_after_sales_tasks_assigned_to',
        table: 'after_sales_tasks',
        columns: ['assigned_to'],
      },
      {
        name: 'idx_after_sales_tasks_session_status',
        table: 'after_sales_tasks',
        columns: ['session_id', 'status'],
      },
    ];

    for (const index of taskIndexes) {
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS ${sql.raw(index.name)} 
          ON ${sql.raw(index.table)} (${sql.raw(index.columns.join(', '))})
        `);
        result.created.push(index.name);
        console.log(`[Indexes] ✅ 创建索引: ${index.name}`);
      } catch (error) {
        console.error(`[Indexes] ❌ 创建索引失败: ${index.name}`, error);
        result.errors.push(`${index.name}: ${error}`);
      }
    }

    // 2. 工作人员识别日志表索引
    console.log('[Indexes] 创建工作人员识别日志表索引...');
    
    const logIndexes = [
      {
        name: 'idx_staff_identification_logs_session_id',
        table: 'staff_identification_logs',
        columns: ['session_id'],
      },
      {
        name: 'idx_staff_identification_logs_message_id',
        table: 'staff_identification_logs',
        columns: ['message_id'],
      },
      {
        name: 'idx_staff_identification_logs_sender_user_id',
        table: 'staff_identification_logs',
        columns: ['sender_user_id'],
      },
      {
        name: 'idx_staff_identification_logs_is_identified_as_staff',
        table: 'staff_identification_logs',
        columns: ['is_identified_as_staff'],
      },
      {
        name: 'idx_staff_identification_logs_staff_type',
        table: 'staff_identification_logs',
        columns: ['staff_type'],
      },
      {
        name: 'idx_staff_identification_logs_created_at',
        table: 'staff_identification_logs',
        columns: ['created_at'],
      },
      {
        name: 'idx_staff_identification_logs_identification_method',
        table: 'staff_identification_logs',
        columns: ['identification_method'],
      },
    ];

    for (const index of logIndexes) {
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS ${sql.raw(index.name)} 
          ON ${sql.raw(index.table)} (${sql.raw(index.columns.join(', '))})
        `);
        result.created.push(index.name);
        console.log(`[Indexes] ✅ 创建索引: ${index.name}`);
      } catch (error) {
        console.error(`[Indexes] ❌ 创建索引失败: ${index.name}`, error);
        result.errors.push(`${index.name}: ${error}`);
      }
    }

    // 3. staff 表索引
    console.log('[Indexes] 创建 staff 表索引...');
    
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_staff_staff_type 
        ON staff (staff_type)
      `);
      result.created.push('idx_staff_staff_type');
      console.log('[Indexes] ✅ 创建索引: idx_staff_staff_type');
    } catch (error) {
      console.error('[Indexes] ❌ 创建索引失败: idx_staff_staff_type', error);
      result.errors.push(`idx_staff_staff_type: ${error}`);
    }

    // 4. interventions 表索引
    console.log('[Indexes] 创建 interventions 表索引...');
    
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_interventions_staff_type 
        ON interventions (staff_type)
      `);
      result.created.push('idx_interventions_staff_type');
      console.log('[Indexes] ✅ 创建索引: idx_interventions_staff_type');
    } catch (error) {
      console.error('[Indexes] ❌ 创建索引失败: idx_interventions_staff_type', error);
      result.errors.push(`idx_interventions_staff_type: ${error}`);
    }

    // 5. alert_history 表索引
    console.log('[Indexes] 创建 alert_history 表索引...');
    
    const alertIndexes = [
      {
        name: 'idx_alert_history_related_task_id',
        table: 'alert_history',
        columns: ['related_task_id'],
      },
      {
        name: 'idx_alert_history_source',
        table: 'alert_history',
        columns: ['source'],
      },
      {
        name: 'idx_alert_history_related_task_source',
        table: 'alert_history',
        columns: ['related_task_id', 'source'],
      },
    ];

    for (const index of alertIndexes) {
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS ${sql.raw(index.name)} 
          ON ${sql.raw(index.table)} (${sql.raw(index.columns.join(', '))})
        `);
        result.created.push(index.name);
        console.log(`[Indexes] ✅ 创建索引: ${index.name}`);
      } catch (error) {
        console.error(`[Indexes] ❌ 创建索引失败: ${index.name}`, error);
        result.errors.push(`${index.name}: ${error}`);
      }
    }

    // 6. collaboration_decision_logs 表索引
    console.log('[Indexes] 创建 collaboration_decision_logs 表索引...');
    
    const decisionIndexes = [
      {
        name: 'idx_collaboration_decision_logs_staff_type',
        table: 'collaboration_decision_logs',
        columns: ['staff_type'],
      },
      {
        name: 'idx_collaboration_decision_logs_message_type',
        table: 'collaboration_decision_logs',
        columns: ['message_type'],
      },
      {
        name: 'idx_collaboration_decision_logs_staff_type_message_type',
        table: 'collaboration_decision_logs',
        columns: ['staff_type', 'message_type'],
      },
    ];

    for (const index of decisionIndexes) {
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS ${sql.raw(index.name)} 
          ON ${sql.raw(index.table)} (${sql.raw(index.columns.join(', '))})
        `);
        result.created.push(index.name);
        console.log(`[Indexes] ✅ 创建索引: ${index.name}`);
      } catch (error) {
        console.error(`[Indexes] ❌ 创建索引失败: ${index.name}`, error);
        result.errors.push(`${index.name}: ${error}`);
      }
    }

    if (result.success) {
      console.log(`\n[Indexes] ✅ 索引创建完成！共创建 ${result.created.length} 个索引`);
    } else {
      console.log(`\n[Indexes] ⚠️ 索引创建完成，但存在 ${result.errors.length} 个错误`);
    }

    return result;

  } catch (error) {
    console.error('[Indexes] ❌ 索引创建失败:', error);
    result.success = false;
    result.errors.push(`创建过程出错: ${error}`);
    return result;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createIndexes()
    .then(result => {
      console.log('\n[Indexes] 创建的索引:');
      result.created.forEach(index => console.log(`  ✅ ${index}`));
      
      if (result.errors.length > 0) {
        console.log('\n[Indexes] 错误:');
        result.errors.forEach(error => console.log(`  ❌ ${error}`));
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('[Indexes] 执行失败:', error);
      process.exit(1);
    });
}

export { createIndexes };
