/**
 * 初始化管理员账号脚本
 * 部署时自动创建超级管理员账号
 * 
 * 使用方法：
 *   node server/scripts/init-admin.js
 * 
 * 或者在 package.json 中添加：
 *   "postinstall": "node server/scripts/init-admin.js"
 */

// 默认管理员账号配置
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'Admin@123456',
  email: 'admin@worktool.ai',
  fullName: '超级管理员',
  role: 'admin',
};

async function initAdmin() {
  console.log('');
  console.log('========================================');
  console.log('🚀 初始化管理员账号');
  console.log('========================================');
  console.log('');

  try {
    // 检查数据库环境变量是否配置
    const databaseUrl = process.env.DATABASE_URL || process.env.PGDATABASE_URL;
    if (!databaseUrl) {
      console.log('⚠️  数据库未配置，跳过管理员初始化');
      console.log('   请设置 DATABASE_URL 或 PGDATABASE_URL 环境变量');
      console.log('   管理员账号将在首次启动时自动创建');
      console.log('');
      console.log('📝 默认管理员账号信息：');
      console.log('   用户名:', DEFAULT_ADMIN.username);
      console.log('   密码:', DEFAULT_ADMIN.password);
      console.log('');
      return true; // 返回 true 表示成功跳过，不影响构建
    }

    const { getDb } = require('coze-coding-dev-sdk');
    const { users } = require('../database/schema');
    const { hashPassword, checkPasswordStrength } = require('../lib/password');
    const { eq } = require('drizzle-orm');

    const db = await getDb();

    // 检查管理员账号是否已存在
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, DEFAULT_ADMIN.username));

    if (existingAdmin.length > 0) {
      console.log('📌 管理员账号已存在，正在更新密码...');
      
      // 更新密码
      const hashedPassword = await hashPassword(DEFAULT_ADMIN.password);
      
      await db
        .update(users)
        .set({
          password: hashedPassword,
          role: 'admin',
          isActive: true,
          updatedAt: new Date(),
          passwordChangedAt: new Date(),
        })
        .where(eq(users.username, DEFAULT_ADMIN.username));

      console.log('✅ 管理员密码已更新！');
    } else {
      console.log('📌 创建新的管理员账号...');
      
      // 检查密码强度
      const strength = checkPasswordStrength(DEFAULT_ADMIN.password);
      if (!strength.isValid) {
        console.warn('⚠️  密码强度警告:', strength.issues.join(', '));
      }

      // 加密密码
      const hashedPassword = await hashPassword(DEFAULT_ADMIN.password);

      // 创建管理员
      await db.insert(users).values({
        username: DEFAULT_ADMIN.username,
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        fullName: DEFAULT_ADMIN.fullName,
        role: DEFAULT_ADMIN.role,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        passwordChangedAt: new Date(),
      });

      console.log('✅ 管理员账号创建成功！');
    }

    console.log('');
    console.log('========================================');
    console.log('🎉 管理员账号信息');
    console.log('========================================');
    console.log('用户名:', DEFAULT_ADMIN.username);
    console.log('密码:', DEFAULT_ADMIN.password);
    console.log('邮箱:', DEFAULT_ADMIN.email);
    console.log('角色: admin (超级管理员)');
    console.log('========================================');
    console.log('');
    console.log('⚠️  重要提示：');
    console.log('   1. 请妥善保管此密码！');
    console.log('   2. 登录后建议立即修改密码！');
    console.log('   3. 生产环境请通过环境变量设置密码！');
    console.log('');

    return true;
  } catch (error) {
    console.error('❌ 初始化管理员失败:', error.message);
    // 不输出完整堆栈，减少日志噪音
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    // 返回 true 表示继续执行，不影响构建流程
    console.log('⚠️  管理员初始化跳过，将在服务启动时重试');
    return true;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initAdmin()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { initAdmin, DEFAULT_ADMIN };
