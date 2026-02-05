const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  // 使用环境变量中的数据库连接字符串
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://user_7602223693946847251:c433b5c4-bfd9-4d56-96ff-0c1ebe281064@cp-magic-foam-59c291ea.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770032307116?sslmode=require';

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    const sqlPath = path.join(__dirname, '../database/migrations/015_create_user_sessions_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('开始执行迁移: 015_create_user_sessions_table.sql');
    console.log('SQL路径:', sqlPath);

    await pool.query(sql);

    console.log('✅ 用户会话表创建成功！');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    console.error('错误详情:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('🎉 迁移完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 迁移失败:', error);
    process.exit(1);
  });
