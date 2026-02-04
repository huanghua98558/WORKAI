/**
 * 测试密码验证
 */

const bcrypt = require('bcrypt');
const { getDb } = require('coze-coding-dev-sdk');
const { users } = require('../server/database/schema');
const { eq, and } = require('drizzle-orm');

async function testPassword() {
  const db = await getDb();
  
  // 获取 admin 用户
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.username, 'admin'), eq(users.isActive, true)));
  
  if (!user) {
    console.log('❌ 用户不存在');
    return;
  }
  
  console.log('用户信息:');
  console.log(`  用户名: ${user.username}`);
  console.log(`  密码哈希: ${user.password.substring(0, 20)}...`);
  
  // 测试密码验证
  const passwords = ['admin123', 'wrongpassword', 'admin'];
  
  for (const testPassword of passwords) {
    try {
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`\n测试密码: "${testPassword}"`);
      console.log(`  结果: ${isValid ? '✅ 正确' : '❌ 错误'}`);
    } catch (error) {
      console.log(`\n测试密码: "${testPassword}"`);
      console.log(`  错误: ${error.message}`);
    }
  }
}

testPassword()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
