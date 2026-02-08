require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

(async () => {
  try {
    const db = await getDb();
    
    // 检查表是否存在
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_login_sessions'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ user_login_sessions 表存在');
      
      // 获取表结构
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_login_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('\n表结构:');
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'YES' : 'NO'})`);
      });
    } else {
      console.log('❌ user_login_sessions 表不存在');
    }
  } catch (error) {
    console.error('查询失败:', error.message);
  }
})();
