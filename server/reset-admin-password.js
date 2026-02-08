/**
 * 重置管理员密码脚本
 * 用法: node server/reset-admin-password.js
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { hashPassword } = require('./lib/password');

async function resetAdminPassword() {
  try {
    console.log('🔧 开始重置管理员密码...\n');

    const db = await getDb();
    const { users } = require('./database/schema');

    // 查找 admin 用户
    const result = await db
      .select()
      .from(users)
      .where(require('drizzle-orm').eq(users.username, 'admin'));

    if (result.length === 0) {
      console.log('❌ 未找到 admin 用户');
      console.log('提示: 请先注册 admin 用户');
      process.exit(1);
    }

    const adminUser = result[0];

    // 新密码
    const newPassword = 'Admin123!';

    // 加密密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新密码
    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(require('drizzle-orm').eq(users.username, 'admin'));

    console.log('✅ 管理员密码重置成功！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  用户名: admin');
    console.log('  密码: Admin123!');
    console.log('  角色: admin (超级管理员)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  请立即登录系统并修改默认密码！\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ 重置密码失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetAdminPassword();
