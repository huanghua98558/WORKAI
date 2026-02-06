const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user_7602223693946847251:c433b5c4-bfd9-4d56-96ff-0c1ebe281064@cp-magic-foam-59c291ea.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770032307116?sslmode=require'
});

async function createTable() {
  const client = await pool.connect();

  try {
    console.log('📝 创建 ai_io_logs 表...');

    // 创建 ai_io_logs 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_io_logs (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255),
        message_id VARCHAR(255),
        robot_id VARCHAR(255),
        robot_name VARCHAR(255),
        operation_type VARCHAR(100),
        ai_input TEXT,
        ai_output TEXT,
        model_id VARCHAR(255),
        temperature FLOAT,
        request_duration INTEGER,
        status VARCHAR(50),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ ai_io_logs 表创建成功');

    // 创建索引
    console.log('📝 创建索引...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_io_logs_session_id ON ai_io_logs(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_io_logs_message_id ON ai_io_logs(message_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_io_logs_operation_type ON ai_io_logs(operation_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_io_logs_created_at ON ai_io_logs(created_at)`);

    console.log('✅ 索引创建成功');

    // 添加表注释
    await client.query(`COMMENT ON TABLE ai_io_logs IS 'AI 输入输出日志表'`);

    console.log('🎉 ai_io_logs 表及相关索引创建完成！');
  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTable()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 执行失败:', error);
    process.exit(1);
  });
