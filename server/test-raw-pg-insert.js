require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { userLoginSessions } = require('./database/schema');

(async () => {
  try {
    // 获取原始数据库连接
    const db = await getDb();
    
    // 尝试访问底层的 pg 客户端
    const pgClient = db.session.client; // 或者 db.session.pool
    
    console.log('Database instance type:', db.constructor.name);
    console.log('Session type:', db.session.constructor.name);
    console.log('Client type:', db.session.client?.constructor?.name);
    
    console.log('\n尝试插入会话记录...');
    const session = {
      id: 'test-id-raw-pg-' + Date.now(),
      userId: 'test-user-id-raw-pg',
      token: 'test-token-raw-pg',
      refreshToken: 'test-refresh-token-raw-pg',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      deviceType: 'unknown',
      location: null,
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      lastActivityAt: new Date()
    };

    // 直接使用 pg 客户端插入
    const result = await pgClient.query(
      `INSERT INTO user_login_sessions (id, user_id, token, refresh_token, ip_address, user_agent, device_type, location, is_active, expires_at, created_at, last_activity_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, user_id, token`,
      [
        session.id,
        session.userId,
        session.token,
        session.refreshToken,
        session.ipAddress,
        session.userAgent,
        session.deviceType,
        session.location,
        session.isActive,
        session.expiresAt,
        session.createdAt,
        session.lastActivityAt
      ]
    );

    console.log('✅ 插入成功:', result.rows[0]);
  } catch (error) {
    console.error('❌ 插入失败:', error.message);
    console.error('Stack:', error.stack);
    if (error.cause) {
      console.error('Cause:', error.cause.message);
      console.error('Cause Stack:', error.cause.stack);
    }
  }
})();
