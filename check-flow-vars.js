const { pool } = require('./server/db/postgres.js');

async function checkFlowVariables() {
  try {
    // 检查机器人配置表
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%robot%' 
           OR table_name LIKE '%config%' 
           OR table_name LIKE '%variable%')
      ORDER BY table_name;
    `);
    
    console.log('相关表：');
    result.rows.forEach(row => console.log('  -', row.table_name));
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

checkFlowVariables();
