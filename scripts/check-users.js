/**
 * 检查用户表
 */

const { getDb } = require('coze-coding-dev-sdk');
const { users } = require('../server/database/schema');
const { eq } = require('drizzle-orm');

async function checkUsers() {
  const db = await getDb();
  
  console.log('获取所有用户...\n');
  const allUsers = await db.select().from(users);
  
  allUsers.forEach(user => {
    console.log(`用户: ${user.username}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  邮箱: ${user.email}`);
    console.log(`  角色: ${user.role}`);
    console.log(`  激活: ${user.isActive}`);
    console.log(`  密码长度: ${user.password.length}`);
    console.log(`  密码前缀: ${user.password.substring(0, 10)}...`);
    console.log('');
  });
}

checkUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
