/**
 * 数据库迁移执行脚本
 * 运行用户管理系统增强迁移
 */

require('dotenv').config();

async function runMigration() {
  const { getDb } = require('coze-coding-dev-sdk');
  const { getLogger } = require('../server/lib/logger');
  const path = require('path');
  const fs = require('fs');

  const logger = getLogger('MIGRATION');

  try {
    logger.info('开始执行数据库迁移...');

    // 读取迁移SQL文件
    const migrationPath = path.join(__dirname, '../server/database/migrations/019_user_management_enhancement.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // 分割SQL语句（按分号分割）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const db = await getDb();

    // 执行每个SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await db.execute(statement);
        logger.info(`执行语句 ${i + 1}/${statements.length} 成功`);
      } catch (error) {
        // 如果错误是"already exists"，忽略（可能已经运行过）
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          logger.warn(`语句 ${i + 1}/${statements.length} 跳过（已存在）: ${error.message}`);
        } else {
          logger.error(`语句 ${i + 1}/${statements.length} 失败: ${error.message}`);
          logger.error(`SQL: ${statement.substring(0, 200)}...`);
        }
      }
    }

    logger.info('数据库迁移完成！');

    // 验证表是否创建成功
    const tables = await db.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'api_keys',
        'user_sessions',
        'password_reset_tokens',
        'user_audit_logs',
        'robot_permissions'
      )
      ORDER BY table_name;
    `);

    logger.info('新表验证结果:', tables);

    console.log('\n✅ 数据库迁移成功完成！');
    console.log('新增的表:', tables.map(t => t.table_name).join(', '));

    process.exit(0);
  } catch (error) {
    logger.error('数据库迁移失败', { error: error.message, stack: error.stack });
    console.error('\n❌ 数据库迁移失败:', error.message);
    process.exit(1);
  }
}

runMigration();
