/**
 * 添加回调历史记录表
 */

const { getDb } = require("coze-coding-dev-sdk");
const { callbackHistory } = require("../schema");

async function migrate() {
  const db = await getDb();
  
  try {
    console.log('开始创建 callback_history 表...');
    
    // 使用 drizzle kit 或手动创建表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS callback_history (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        robot_id VARCHAR(64) NOT NULL,
        message_id VARCHAR(128) NOT NULL,
        callback_type INTEGER NOT NULL,
        error_code INTEGER NOT NULL,
        error_reason TEXT NOT NULL,
        run_time INTEGER,
        time_cost INTEGER,
        command_type INTEGER,
        raw_msg TEXT,
        extra_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    
    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS callback_history_robot_id_idx ON callback_history(robot_id)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS callback_history_message_id_idx ON callback_history(message_id)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS callback_history_callback_type_idx ON callback_history(callback_type)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS callback_history_error_code_idx ON callback_history(error_code)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS callback_history_created_at_idx ON callback_history(created_at)
    `);
    
    console.log('✅ callback_history 表创建成功！');
  } catch (error) {
    console.error('❌ 创建 callback_history 表失败:', error);
    throw error;
  }
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('迁移完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
