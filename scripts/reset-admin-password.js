const { getDb } = require('coze-coding-dev-sdk');
const { users } = require('../server/database/schema');
const bcrypt = require('bcrypt');
const { eq } = require('drizzle-orm');

async function resetAdminPassword() {
  try {
    const db = await getDb();

    // 生成新密码的哈希
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 更新 admin 用户的密码
    const result = await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.username, 'admin'));

    console.log('Admin 密码已重置为: admin123');
    console.log('影响行数:', result.rowCount || result);
  } catch (error) {
    console.error('重置密码失败:', error);
  }
}

resetAdminPassword();
