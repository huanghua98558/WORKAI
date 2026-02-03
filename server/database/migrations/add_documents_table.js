/**
 * 数据库迁移：创建 documents 表
 * 使用方法：
 * node server/database/migrations/add_documents_table.js
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { documents } = require('../schema');

async function up() {
  console.log('开始创建 documents 表...');
  
  const db = await getDb();
  
  try {
    // 创建 documents 表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        content TEXT,
        file_name VARCHAR(500),
        file_type VARCHAR(100),
        file_size INTEGER,
        file_url TEXT,
        category VARCHAR(100),
        tags JSONB DEFAULT '[]',
        source VARCHAR(50) NOT NULL DEFAULT 'upload',
        is_active BOOLEAN NOT NULL DEFAULT true,
        uploaded_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    
    console.log('✅ documents 表创建成功');
    
    // 创建索引
    await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_is_active_idx ON documents(is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_source_idx ON documents(source)`);
    
    console.log('✅ documents 表索引创建成功');
  } catch (error) {
    console.error('❌ 创建 documents 表失败:', error.message);
    throw error;
  }
}

async function down() {
  console.log('开始删除 documents 表...');
  
  const db = await getDb();
  
  try {
    await db.execute(sql`DROP TABLE IF EXISTS documents CASCADE`);
    console.log('✅ documents 表删除成功');
  } catch (error) {
    console.error('❌ 删除 documents 表失败:', error.message);
    throw error;
  }
}

// 执行迁移
async function run() {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';
  
  try {
    if (command === 'up') {
      await up();
    } else if (command === 'down') {
      await down();
    } else {
      console.log('用法: node add_documents_table.js [up|down]');
    }
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { up, down };
