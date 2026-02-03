/**
 * 数据库迁移：为 robots 表添加 conversionMode 字段
 * 支持机器人配置为转化客服模式
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function up() {
  console.log('开始执行迁移：为 robots 表添加 conversionMode 字段...');
  
  const db = await getDb();
  
  try {
    // 检查字段是否已存在
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'robots' 
      AND column_name = 'conversion_mode'
    `);
    
    if (checkResult.rows && checkResult.rows.length > 0) {
      console.log('✅ conversion_mode 字段已存在，跳过迁移');
      return;
    }
    
    // 添加 conversionMode 字段
    await db.execute(sql`
      ALTER TABLE robots 
      ADD COLUMN conversion_mode BOOLEAN DEFAULT false
    `);
    
    console.log('✅ 成功添加 conversion_mode 字段到 robots 表');
    
    // 添加注释
    await db.execute(sql`
      COMMENT ON COLUMN robots.conversion_mode IS '是否启用转化客服模式'
    `);
    
    console.log('✅ 成功添加字段注释');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
}

async function down() {
  console.log('开始回滚迁移：删除 robots 表的 conversionMode 字段...');
  
  const db = await getDb();
  
  try {
    await db.execute(sql`
      ALTER TABLE robots 
      DROP COLUMN IF EXISTS conversion_mode
    `);
    
    console.log('✅ 成功删除 conversion_mode 字段');
    
  } catch (error) {
    console.error('❌ 回滚失败:', error);
    throw error;
  }
}

module.exports = { up, down };

// 如果直接运行此文件
if (require.main === module) {
  const command = process.argv[2];
  
  (async () => {
    try {
      if (command === 'up') {
        await up();
        console.log('\n✅ 迁移完成！');
        process.exit(0);
      } else if (command === 'down') {
        await down();
        console.log('\n✅ 回滚完成！');
        process.exit(0);
      } else {
        console.log('用法: node add_conversion_mode_to_robots.js [up|down]');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ 执行失败:', error);
      process.exit(1);
    }
  })();
}
