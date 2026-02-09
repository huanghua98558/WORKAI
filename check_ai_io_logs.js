const { getDb } = require('coze-coding-dev-sdk');
const { aiIoLogs } = require('./server/database/schema');
const { gt } = require('drizzle-orm');

async function checkAIIoLogs() {
  try {
    const db = await getDb();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const logs = await db.select()
      .from(aiIoLogs)
      .where(
        gt(aiIoLogs.createdAt, oneMinuteAgo)
      )
      .orderBy(aiIoLogs.createdAt);

    console.log('\n========================================');
    console.log('📊 最近1分钟的 AI IO 日志');
    console.log('========================================');
    
    if (logs.length === 0) {
      console.log('❌ 没有找到最近1分钟的 AI IO 记录');
    } else {
      console.log(`✅ 找到 ${logs.length} 条 AI IO 记录：\n`);
      logs.forEach((log, index) => {
        console.log(`${index + 1}. 操作类型: ${log.operationType}`);
        console.log(`   模型: ${log.modelId}`);
        console.log(`   状态: ${log.status}`);
        console.log(`   输入: ${log.aiInput ? log.aiInput.substring(0, 100) : 'N/A'}...`);
        console.log(`   输出: ${log.aiOutput ? log.aiOutput.substring(0, 100) : 'N/A'}...`);
        console.log(`   时间: ${log.createdAt}`);
        console.log('   ----------------------------------------');
      });
    }
    
    console.log('========================================\n');
    
    process.exit(logs.length > 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkAIIoLogs();
