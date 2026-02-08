/**
 * 数据库备份脚本
 * 在迁移前备份关键表
 */

import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);

interface BackupResult {
  success: boolean;
  backupPath?: string;
  backupSize?: number;
  errors: string[];
}

async function backupDatabase(): Promise<BackupResult> {
  console.log('[Backup] 开始备份数据库...');

  const result: BackupResult = {
    success: true,
    errors: [],
  };

  try {
    // 创建备份目录
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `/tmp/backups/staff-type-migration/${timestamp}`;
    
    await exec(`mkdir -p ${backupDir}`);
    console.log(`[Backup] 备份目录: ${backupDir}`);

    // 获取数据库连接信息
    const db = await getDb();
    const tablesToBackup = [
      'staff',
      'interventions',
      'alert_history',
      'collaboration_decision_logs',
    ];

    // 备份每个表
    for (const table of tablesToBackup) {
      console.log(`[Backup] 备份表: ${table}...`);
      
      try {
        const backupFile = `${backupDir}/${table}.sql`;
        await exec(
          `pg_dump -t ${table} --data-only --disable-triggers > ${backupFile}`
        );

        // 检查文件大小
        const { stdout: fileSize } = await exec(`wc -c < ${backupFile}`);
        const size = parseInt(fileSize.trim(), 10);
        
        console.log(`[Backup] ✅ ${table} 备份成功 (大小: ${size} bytes)`);
      } catch (error) {
        console.error(`[Backup] ❌ ${table} 备份失败:`, error);
        result.errors.push(`表 ${table} 备份失败: ${error}`);
      }
    }

    // 创建备份摘要
    console.log('[Backup] 创建备份摘要...');
    const summaryFile = `${backupDir}/backup-summary.txt`;
    const summary = [
      `备份时间: ${new Date().toISOString()}`,
      `备份目录: ${backupDir}`,
      `备份的表: ${tablesToBackup.join(', ')}`,
      `备份原因: 工作人员类型迁移`,
    ].join('\n');

    await exec(`cat > ${summaryFile} << 'EOF'\n${summary}\nEOF`);
    console.log('[Backup] ✅ 备份摘要创建成功');

    // 获取备份总大小
    const { stdout: totalSize } = await exec(`du -sh ${backupDir}`);
    console.log(`[Backup] 总备份大小: ${totalSize.trim()}`);

    result.backupPath = backupDir;
    return result;

  } catch (error) {
    console.error('[Backup] ❌ 备份失败:', error);
    result.success = false;
    result.errors.push(`备份过程出错: ${error}`);
    return result;
  }
}

async function restoreDatabase(backupPath: string): Promise<boolean> {
  console.log(`[Restore] 开始从备份恢复数据库...`);
  console.log(`[Restore] 备份路径: ${backupPath}`);

  try {
    const tablesToRestore = [
      'staff',
      'interventions',
      'alert_history',
      'collaboration_decision_logs',
    ];

    // 恢复每个表
    for (const table of tablesToRestore) {
      const backupFile = `${backupPath}/${table}.sql`;
      
      console.log(`[Restore] 恢复表: ${table}...`);
      
      try {
        await exec(`psql < ${backupFile}`);
        console.log(`[Restore] ✅ ${table} 恢复成功`);
      } catch (error) {
        console.error(`[Restore] ❌ ${table} 恢复失败:`, error);
        return false;
      }
    }

    console.log('[Restore] ✅ 数据库恢复完成！');
    return true;

  } catch (error) {
    console.error('[Restore] ❌ 恢复失败:', error);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  backupDatabase()
    .then(result => {
      if (result.success) {
        console.log(`\n[Backup] ✅ 备份完成！`);
        console.log(`备份路径: ${result.backupPath}`);
        process.exit(0);
      } else {
        console.log('\n[Backup] ❌ 备份失败');
        result.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('[Backup] 执行失败:', error);
      process.exit(1);
    });
}

export { backupDatabase, restoreDatabase };
