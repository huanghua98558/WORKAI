/**
 * 创建测试用户
 */

const { getDb } = require('coze-coding-dev-sdk');
const { users } = require('../server/database/schema');
const { eq, and } = require('drizzle-orm');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const db = await getDb();
  const SALT_ROUNDS = 10;
  
  const testUsername = 'testuser';
  const testPassword = 'testpass123';
  
  // 检查用户是否存在
  const existing = await db.select().from(users).where(eq(users.username, testUsername));
  
  if (existing.length > 0) {
    console.log(`用户 ${testUsername} 已存在，正在删除...`);
    await db.delete(users).where(eq(users.username, testUsername));
  }
  
  // 加密密码
  const hashedPassword = await bcrypt.hash(testPassword, SALT_ROUNDS);
  
  // 创建用户
  const [newUser] = await db.insert(users).values({
    username: testUsername,
    password: hashedPassword,
    role: 'operator',
    email: 'test@example.com',
    isActive: true
  }).returning();
  
  console.log('\n✅ 测试用户创建成功:');
  console.log(`  用户名: ${newUser.username}`);
  console.log(`  密码: ${testPassword}`);
  console.log(`  角色: ${newUser.role}`);
  console.log(`  Email: ${newUser.email}`);
  console.log(`\n现在可以使用以下命令测试登录:`);
  console.log(`curl -X POST http://localhost:5001/api/auth/login \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"username":"${testUsername}","password":"${testPassword}"}'`);
}

createTestUser()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
