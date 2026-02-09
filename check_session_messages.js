const { getDb } = require('coze-coding-dev-sdk');
const { sessionMessages } = require('./server/database/schema');
const { gt, and, eq } = require('drizzle-orm');

async function checkMessages() {
  try {
    const db = await getDb();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const messages = await db.select()
      .from(sessionMessages)
      .where(
        gt(sessionMessages.createdAt, oneMinuteAgo)
      )
      .orderBy(sessionMessages.createdAt)
      .limit(20);

    console.log('\n========================================');
    console.log('📊 最近1分钟的消息记录');
    console.log('========================================');
    
    if (messages.length === 0) {
      console.log('❌ 没有找到最近1分钟的消息记录');
    } else {
      console.log(`✅ 找到 ${messages.length} 条消息记录：\n`);
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. 消息 ID: ${msg.id}`);
        console.log(`   会话 ID: ${msg.sessionId}`);
        console.log(`   用户: ${msg.userName}`);
        console.log(`   群组: ${msg.groupName}`);
        console.log(`   内容: ${msg.content}`);
        console.log(`   来源: ${msg.isFromUser ? '用户' : msg.isFromBot ? '机器人' : msg.isHuman ? '人工' : '未知'}`);
        console.log(`   时间: ${msg.createdAt}`);
        console.log('   ----------------------------------------');
      });
    }
    
    console.log('========================================\n');
    
    process.exit(messages.length > 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkMessages();
