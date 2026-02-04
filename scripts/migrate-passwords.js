/**
 * 数据库密码迁移脚本
 * 将所有用户的明文密码加密为 bcrypt 哈希
 * 
 * 使用方法：
 * node scripts/migrate-passwords.js
 */

const { getDb } = require('coze-coding-dev-sdk');
const { users } = require('../server/database/schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function migratePasswords() {
  const db = await getDb();
  
  console.log('========================================');
  console.log('  密码迁移脚本');
  console.log('========================================\n');

  try {
    // 获取所有用户
    console.log('正在获取所有用户...');
    const allUsers = await db.select().from(users);
    console.log(`找到 ${allUsers.length} 个用户\n`);

    if (allUsers.length === 0) {
      console.log('✅ 没有需要迁移的用户');
      return;
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 逐个迁移用户密码
    for (const user of allUsers) {
      try {
        // 检查密码是否已经是 bcrypt 哈希（bcrypt 哈希长度为 60）
        if (user.password.length === 60 && user.password.startsWith('$2b$')) {
          console.log(`⏭️  跳过用户 ${user.username} (密码已加密)`);
          skippedCount++;
          continue;
        }

        console.log(`🔄 正在加密用户 ${user.username} 的密码...`);
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
        
        // 更新数据库
        await db.update(users)
          .set({ password: hashedPassword, updatedAt: new Date() })
          .where(eq(users.id, user.id));
        
        console.log(`✅ 用户 ${user.username} 密码已加密\n`);
        successCount++;
      } catch (error) {
        console.error(`❌ 用户 ${user.username} 密码加密失败:`, error.message, '\n');
        errorCount++;
      }
    }

    // 输出统计结果
    console.log('========================================');
    console.log('  迁移完成！');
    console.log('========================================');
    console.log(`成功: ${successCount}`);
    console.log(`跳过: ${skippedCount}`);
    console.log(`失败: ${errorCount}`);
    console.log(`总计: ${allUsers.length}`);
    console.log('========================================\n');

    if (errorCount > 0) {
      console.log('⚠️  部分用户密码迁移失败，请检查错误信息');
      process.exit(1);
    } else {
      console.log('✅ 所有密码迁移成功！');
    }
  } catch (error) {
    console.error('\n❌ 迁移过程发生错误:', error);
    process.exit(1);
  }
}

// 执行迁移
migratePasswords()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 未捕获的错误:', error);
    process.exit(1);
  });
