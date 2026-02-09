const { getDb } = require('coze-coding-dev-sdk');
const { sessionMessages } = require('./server/database/schema');
const { gt } = require('drizzle-orm');

async function checkAllMessages() {
  try {
    const db = await getDb();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const messages = await db.select()
      .from(sessionMessages)
      .where(
        gt(sessionMessages.createdAt, oneMinuteAgo)
      )
      .orderBy(sessionMessages.createdAt);

    console.log('\n========================================');
    console.log('📊 最近1分钟的所有消息记录（按时间顺序）');
    console.log('========================================');
    
    if (messages.length === 0) {
      console.log('❌ 没有找到最近1分钟的消息记录');
    } else {
      console.log(`✅ 找到 ${messages.length} 条消息记录：\n`);
      messages.forEach((msg, index) => {
        const source = msg.isFromUser ? '👤 用户' : msg.isFromBot ? '🤖 机器人' : msg.isHuman ? '👨‍💼 人工' : '❓ 未知';
        console.log(`${index + 1}. ${source}`);
        console.log(`   消息 ID: ${msg.id}`);
        console.log(`   内容: ${msg.content}`);
        console.log(`   时间: ${msg.createdAt}`);
        console.log(`   机器人: ${msg.robotName || 'N/A'}`);
        console.log('   ----------------------------------------');
      });
      
      // 统计
      const userCount = messages.filter(m => m.isFromUser).length;
      const botCount = messages.filter(m => m.isFromBot).length;
      const humanCount = messages.filter(m => m.isHuman).length;
      
      console.log(`\n📈 统计：`);
      console.log(`   👤 用户消息: ${userCount} 条`);
      console.log(`   🤖 机器人回复: ${botCount} 条`);
      console.log(`   👨‍💼 人工回复: ${humanCount} 条`);
    }
    
    console.log('========================================\n');
    
    process.exit(messages.length > 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkAllMessages();
