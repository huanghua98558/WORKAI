require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { callbackHistory } = require('/workspace/projects/server/database/schema');

async function testCallbackHistory() {
  console.log('🧪 开始测试 callback_history 表插入...');

  try {
    const db = await getDb();
    
    // 测试插入一条记录
    const testRecord = {
      robotId: 'test_robot_123',
      messageId: 'test_message_456',
      callbackType: 11, // 消息回调
      errorCode: 0,
      errorReason: '',
      runTime: Date.now(),
      timeCost: 100,
      commandType: null,
      rawMsg: JSON.stringify({ test: true }),
      extraData: { test: true, responseTime: 100 }
    };

    console.log('📝 插入测试记录:', testRecord);

    const result = await db.insert(callbackHistory).values(testRecord);

    console.log('✅ 插入成功！记录 ID:', result);

    // 查询刚插入的记录
    const { eq } = require('drizzle-orm');
    const records = await db.select().from(callbackHistory)
      .where(eq(callbackHistory.robotId, testRecord.robotId))
      .limit(1);

    console.log('📋 查询结果:', records);

    if (records.length > 0) {
      console.log('✅ callback_history 表测试通过！');
      return true;
    } else {
      console.log('❌ 未找到插入的记录');
      return false;
    }
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return false;
  }
}

// 运行测试
testCallbackHistory()
  .then((success) => {
    console.log('\n🎯 测试结果:', success ? '成功' : '失败');
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('测试过程出错:', error);
    process.exit(1);
  });
