/**
 * 创建超级管理员账号
 */

require('dotenv').config();
const bcrypt = require('bcrypt');

async function createSuperAdmin() {
  const { getDb } = require('coze-coding-dev-sdk');
  const { users } = require('./database/schema');
  const { sql } = require('drizzle-orm');
  const { eq } = require('drizzle-orm');

  console.log('🔐 开始创建超级管理员账号...');

  try {
    const db = await getDb();

    // 检查是否已存在超级管理员
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, 'superadmin'));

    if (existingAdmin.length > 0) {
      console.log('⚠️  超级管理员已存在');
      console.log('账号: superadmin');
      console.log('角色: admin');
      process.exit(0);
    }

    // 生成密码
    const password = 'SuperAdmin123!@#';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建超级管理员
    const newAdmin = await db
      .insert(users)
      .values({
        username: 'superadmin',
        password: hashedPassword,
        email: 'superadmin@worktool.local',
        role: 'admin',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log('✅ 超级管理员创建成功！');
    console.log('========================================');
    console.log('👤 用户名: superadmin');
    console.log('🔑 密码: SuperAdmin123!@#');
    console.log('📧 邮箱: superadmin@worktool.local');
    console.log('🎭 角色: admin');
    console.log('📅 创建时间:', new Date().toISOString());
    console.log('========================================');
    console.log('⚠️  请妥善保存以上信息，登录后请及时修改密码！');

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建超级管理员失败:', error);
    process.exit(1);
  }
}

createSuperAdmin();
