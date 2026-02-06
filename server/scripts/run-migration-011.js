/**
 * 执行数据库迁移 - 插入内置AI模型
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/worktool_ai'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('📝 开始执行迁移: 011_insert_builtin_ai_models.sql');
    
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, '../database/migrations/011_insert_builtin_ai_models.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 执行SQL
    await client.query(sql);
    
    console.log('✅ 迁移执行成功！');
    console.log('📊 已插入的AI模型:');
    console.log('   1. 豆包 Pro 4K - 意图识别');
    console.log('   2. 豆包 Pro 32K - 服务回复');
    console.log('   3. DeepSeek V3 - 转化客服');
    console.log('   4. Kimi K2 - 报告生成 (新增加)');
    console.log('   5. 豆包 Pro 32K - 通用对话');
    console.log('   6. DeepSeek R1 - 技术支持');
    console.log('👥 已插入的AI角色: 7个');
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// 执行迁移
runMigration()
  .then(() => {
    console.log('🎉 迁移完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 迁移失败:', error);
    process.exit(1);
  });
