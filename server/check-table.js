/**
 * 检查 userSessions 表是否存在的脚本
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function checkTable() {
  try {
    const db = await getDb();
    
    // 查询 information_schema 检查表是否存在
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_sessions'
    `);
    
    console.log('查询结果:', result.rows);
    
    if (result.rows.length > 0) {
      console.log('✅ user_sessions 表存在');
      
      // 查看表结构
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('\n表结构:');
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    } else {
      console.log('❌ user_sessions 表不存在');
      console.log('\n可用的表:');
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      tables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkTable();
