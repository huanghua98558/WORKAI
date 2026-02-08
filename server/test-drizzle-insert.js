require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { userLoginSessions } = require('./database/schema');

(async () => {
  try {
    const db = await getDb();

    console.log('尝试插入会话记录...');

    const session = {
      id: 'test-id-2',
      userId: 'test-user-id-2',
      token: 'test-token-2',
      refreshToken: 'test-refresh-token-2',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      deviceType: 'unknown',
      location: null,
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      lastActivityAt: new Date()
    };

    const [createdSession] = await db.insert(userLoginSessions).values(session).returning();

    console.log('✅ 插入成功:', createdSession);
  } catch (error) {
    console.error('❌ 插入失败:', error.message);
    console.error('Stack:', error.stack);
  }
})();
