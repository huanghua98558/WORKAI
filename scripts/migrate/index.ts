/**
 * 统一迁移入口脚本
 * 按顺序执行: 备份 -> 迁移 -> 索引 -> 验证
 */

import { backupDatabase } from './backup-db';
import { migrateStaffType } from './migrate-staff-type';
import { createIndexes } from './create-indexes';
import { verifyMigration } from './verify-migration';
import { rollbackMigration } from './rollback-migration';

interface MigrationStep {
  name: string;
  execute: () => Promise<any>;
  rollback?: () => Promise<any>;
}

class MigrationOrchestrator {
  private steps: MigrationStep[] = [];
  private currentStep: number = 0;
  private failedStep: number = -1;
  private rollbackExecuted: boolean = false;

  constructor() {
    this.steps = [
      {
        name: '备份数据库',
        execute: backupDatabase,
      },
      {
        name: '迁移数据结构',
        execute: migrateStaffType,
        rollback: rollbackMigration,
      },
      {
        name: '创建索引',
        execute: createIndexes,
      },
      {
        name: '验证迁移结果',
        execute: verifyMigration,
      },
    ];
  }

  async execute(): Promise<{ success: boolean; steps: string[]; message: string }> {
    console.log('\n========================================');
    console.log('开始执行工作人员类型迁移流程');
    console.log('========================================\n');

    const executedSteps: string[] = [];

    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i;
      const step = this.steps[i];
      
      console.log(`\n[${i + 1}/${this.steps.length}] 执行步骤: ${step.name}`);
      console.log('----------------------------------------');

      try {
        const result = await step.execute();
        
        if (!result.success) {
          this.failedStep = i;
          executedSteps.push(`❌ ${step.name}`);
          console.error(`\n❌ 步骤 "${step.name}" 执行失败`);
          
          if (result.errors) {
            console.error('错误详情:');
            result.errors.forEach((error: string) => console.error(`  - ${error}`));
          }

          // 自动回滚
          console.log('\n开始自动回滚...');
          await this.rollback();
          
          return {
            success: false,
            steps: executedSteps,
            message: `迁移失败在步骤 "${step.name}"，已自动回滚`,
          };
        }

        executedSteps.push(`✅ ${step.name}`);
        console.log(`\n✅ 步骤 "${step.name}" 执行成功`);

      } catch (error) {
        this.failedStep = i;
        executedSteps.push(`❌ ${step.name}`);
        console.error(`\n❌ 步骤 "${step.name}" 执行异常:`, error);

        // 自动回滚
        console.log('\n开始自动回滚...');
        await this.rollback();
        
        return {
          success: false,
          steps: executedSteps,
          message: `迁移失败在步骤 "${step.name}"，已自动回滚`,
        };
      }
    }

    console.log('\n========================================');
    console.log('✅ 所有迁移步骤执行成功！');
    console.log('========================================\n');

    return {
      success: true,
      steps: executedSteps,
      message: '迁移成功完成',
    };
  }

  async rollback(): Promise<void> {
    if (this.rollbackExecuted) {
      console.log('[Rollback] 回滚已执行，跳过');
      return;
    }

    console.log('\n========================================');
    console.log('开始回滚迁移');
    console.log('========================================\n');

    this.rollbackExecuted = true;

    // 从失败的步骤开始，按相反顺序回滚
    for (let i = this.failedStep; i >= 0; i--) {
      const step = this.steps[i];
      
      if (!step.rollback) {
        console.log(`[${this.steps.length - i}] 跳过 "${step.name}" (无可回滚操作)`);
        continue;
      }

      console.log(`[${this.steps.length - i}] 回滚步骤: ${step.name}`);
      console.log('----------------------------------------');

      try {
        await step.rollback();
        console.log(`\n✅ 步骤 "${step.name}" 回滚成功`);
      } catch (error) {
        console.error(`\n❌ 步骤 "${step.name}" 回滚失败:`, error);
      }
    }

    console.log('\n========================================');
    console.log('回滚流程结束');
    console.log('========================================\n');
  }

  async dryRun(): Promise<void> {
    console.log('\n========================================');
    console.log('迁移预览（Dry Run）');
    console.log('========================================\n');

    console.log('将执行以下步骤:');
    this.steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.name}`);
    });

    console.log('\n将创建/修改:');
    console.log('  - 表:');
    console.log('    • after_sales_tasks');
    console.log('    • staff_identification_logs');
    console.log('  • 字段:');
    console.log('    • staff.staff_type');
    console.log('    • interventions.staff_type');
    console.log('    • alert_history.related_task_id');
    console.log('    • alert_history.source');
    console.log('    • collaboration_decision_logs.staff_type');
    console.log('    • collaboration_decision_logs.message_type');
    console.log('  • 索引: 25+ 个');

    console.log('\n========================================\n');
  }
}

// CLI 命令行处理
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const orchestrator = new MigrationOrchestrator();

  switch (command) {
    case 'dry-run':
      await orchestrator.dryRun();
      break;

    case 'execute':
      const result = await orchestrator.execute();
      if (result.success) {
        console.log('\n✅ 迁移成功完成！');
        console.log('\n执行步骤:');
        result.steps.forEach(step => console.log(`  ${step}`));
        process.exit(0);
      } else {
        console.log(`\n❌ ${result.message}`);
        console.log('\n执行步骤:');
        result.steps.forEach(step => console.log(`  ${step}`));
        process.exit(1);
      }
      break;

    case 'rollback':
      await orchestrator.rollback();
      console.log('\n✅ 手动回滚完成');
      process.exit(0);
      break;

    default:
      console.log('\n用法:');
      console.log('  pnpm tsx scripts/migrate/index.ts dry-run     # 预览迁移步骤');
      console.log('  pnpm tsx scripts/migrate/index.ts execute     # 执行迁移');
      console.log('  pnpm tsx scripts/migrate/index.ts rollback    # 回滚迁移');
      console.log('\n单独执行步骤:');
      console.log('  pnpm tsx scripts/migrate/backup-db.ts          # 仅备份数据库');
      console.log('  pnpm tsx scripts/migrate/migrate-staff-type.ts # 仅迁移数据结构');
      console.log('  pnpm tsx scripts/migrate/create-indexes.ts     # 仅创建索引');
      console.log('  pnpm tsx scripts/migrate/verify-migration.ts   # 仅验证迁移结果');
      process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  });
}

export { MigrationOrchestrator };
