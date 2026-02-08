require('dotenv').config();
const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    await client.connect();
    console.log('✅ 数据库连接成功');

    const query = `
      INSERT INTO user_login_sessions (id, user_id, token, refresh_token, ip_address, user_agent, device_type, location, is_active, expires_at, created_at, last_activity_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, user_id, token
    `;

    const values = [
      'test-id-3',
      'test-user-id-3',
      'test-token-3',
      'test-refresh-token-3',
      '127.0.0.1',
      'test-agent',
      'unknown',
      null,
      true,
      new Date(Date.now() + 3600000),
      new Date(),
      new Date()
    ];

    const result = await client.query(query, values);
    console.log('✅ 插入成功:', result.rows[0]);
  } catch (error) {
    console.error('❌ 插入失败:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
})();
