const { getDb } = require('coze-coding-dev-sdk');
const { flowExecutionLogs } = require('./server/database/schema');
const { gt } = require('drizzle-orm');

async function checkFlowExecution() {
  try {
    const db = await getDb();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const logs = await db.select()
      .from(flowExecutionLogs)
      .where(
        gt(flowExecutionLogs.createdAt, oneMinuteAgo)
      )
      .orderBy(flowExecutionLogs.createdAt);

    console.log('\n========================================');
    console.log('📊 最近1分钟的流程执行日志');
    console.log('========================================');
    
    if (logs.length === 0) {
      console.log('❌ 没有找到最近1分钟的流程执行记录');
    } else {
      console.log(`✅ 找到 ${logs.length} 条流程执行记录：\n`);
      logs.forEach((log, index) => {
        console.log(`${index + 1}. 节点类型: ${log.nodeType}`);
        console.log(`   状态: ${log.status}`);
        console.log(`   时间: ${log.createdAt}`);
        if (log.outputData) {
          console.log(`   输出: ${JSON.stringify(log.outputData).substring(0, 100)}`);
        }
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

checkFlowExecution();
