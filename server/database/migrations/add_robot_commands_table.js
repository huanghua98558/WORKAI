/**
 * 数据库迁移脚本：添加机器人指令表
 * 
 * 使用方法：
 * node server/database/migrations/add_robot_commands_table.js
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function up() {
  console.log('开始创建机器人指令相关表...');
  
  const db = await getDb();

  // 创建机器人指令表
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS robot_commands (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      robot_id VARCHAR(64) NOT NULL,
      command_type VARCHAR(50) NOT NULL,
      command_data JSONB NOT NULL,
      priority INTEGER NOT NULL DEFAULT 5,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      error_message TEXT,
      result JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE
    );
  `);

  // 创建索引
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robot_commands_robot_id_idx ON robot_commands(robot_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robot_commands_status_idx ON robot_commands(status);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robot_commands_priority_idx ON robot_commands(priority);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robot_commands_created_at_idx ON robot_commands(created_at);`);

  console.log('✅ 机器人指令表创建成功');

  // 创建机器人指令队列表（优化查询性能）
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS robot_command_queue (
      id VARCHAR(36) PRIMARY KEY,
      command_id VARCHAR(36) NOT NULL REFERENCES robot_commands(id) ON DELETE CASCADE,
      robot_id VARCHAR(64) NOT NULL,
      priority INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL,
      scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      locked_at TIMESTAMP WITH TIME ZONE,
      locked_by VARCHAR(100),
      retry_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(command_id)
    );
  `);

  // 创建索引
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robot_command_queue_status_idx ON robot_command_queue(status);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robot_command_queue_priority_idx ON robot_command_queue(priority);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robot_command_queue_scheduled_for_idx ON robot_command_queue(scheduled_for);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS robot_command_queue_robot_id_idx ON robot_command_queue(robot_id);`);

  console.log('✅ 机器人指令队列表创建成功');
}

async function down() {
  console.log('开始删除机器人指令相关表...');
  
  const db = await getDb();

  await db.execute(sql`DROP TABLE IF EXISTS robot_command_queue CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS robot_commands CASCADE;`);

  console.log('✅ 机器人指令相关表删除成功');
}

// 运行迁移
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';

  (async () => {
    try {
      if (command === 'up') {
        await up();
      } else if (command === 'down') {
        await down();
      } else {
        console.error('未知命令:', command);
        console.error('使用方法: node add_robot_commands_table.js [up|down]');
        process.exit(1);
      }
      process.exit(0);
    } catch (error) {
      console.error('迁移失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
