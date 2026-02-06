/**
 * WorkTool AI 2.1 - 数据库迁移脚本
 * 为 flow_definitions 表添加流程路由相关字段
 *
 * 新增字段：
 * - is_default: 是否为默认流程
 * - priority: 优先级
 *
 * 执行方式：
 * node server/database/migrations/add_flow_routing_fields.js
 */

const { getDb } = require('coze-coding-dev-sdk');
const { getLogger } = require('../../lib/logger');

const logger = getLogger('DB_MIGRATION');

async function migrate() {
  try {
    logger.info('开始数据库迁移：添加流程路由字段');

    const db = await getDb();

    // 检查字段是否已存在
    const checkColumn = await db.execute(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'flow_definitions'
      AND column_name IN ('is_default', 'priority');
    `);

    const existingColumns = checkColumn.rows.map(row => row.column_name);

    // 添加 is_default 字段
    if (!existingColumns.includes('is_default')) {
      await db.execute(`
        ALTER TABLE flow_definitions
        ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
      `);
      logger.info('✓ 添加字段 is_default');
    } else {
      logger.info('✓ 字段 is_default 已存在，跳过');
    }

    // 添加 priority 字段
    if (!existingColumns.includes('priority')) {
      await db.execute(`
        ALTER TABLE flow_definitions
        ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
      `);
      logger.info('✓ 添加字段 priority');
    } else {
      logger.info('✓ 字段 priority 已存在，跳过');
    }

    // 创建索引
    if (!existingColumns.includes('is_default')) {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS flow_definitions_is_default_idx
        ON flow_definitions(is_default);
      `);
      logger.info('✓ 创建索引 flow_definitions_is_default_idx');
    }

    if (!existingColumns.includes('priority')) {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS flow_definitions_priority_idx
        ON flow_definitions(priority);
      `);
      logger.info('✓ 创建索引 flow_definitions_priority_idx');
    }

    // 更新"标准客服流程"为默认流程
    await db.execute(`
      UPDATE flow_definitions
      SET is_default = true
      WHERE name LIKE '%标准客服流程%'
      AND is_default = false;
    `);
    logger.info('✓ 更新标准客服流程为默认流程');

    logger.info('✅ 数据库迁移完成');
  } catch (error) {
    logger.error('❌ 数据库迁移失败', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// 执行迁移
migrate()
  .then(() => {
    logger.info('迁移成功，退出');
    process.exit(0);
  })
  .catch(error => {
    logger.error('迁移失败', error);
    process.exit(1);
  });
