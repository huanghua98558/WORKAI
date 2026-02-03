/**
 * 测试执行追踪服务
 * 验证 Redis 和数据库双写功能
 */

const tracker = require('./services/execution-tracker.service');

async function test() {
  console.log('开始测试执行追踪服务...');

  try {
    // 1. 测试开始处理
    console.log('\n1. 测试 startProcessing...');
    const processingId = await tracker.startProcessing({
      robotId: 'test-robot-001',
      sessionId: 'test-session-001',
      messageData: {
        FromUserName: 'user001',
        ToUserName: 'group001',
        MsgId: 'msg001',
        Content: '测试消息'
      }
    });
    console.log(`✓ processingId: ${processingId}`);

    // 2. 测试更新步骤
    console.log('\n2. 测试 updateStep...');
    await tracker.updateStep(processingId, 'intent_recognition', {
      result: 'service',
      confidence: 0.95
    });
    await tracker.updateStep(processingId, 'ai_response', {
      response: '这是测试回复',
      model: 'doubao-1.8'
    });
    console.log('✓ 步骤更新成功');

    // 3. 测试完成处理
    console.log('\n3. 测试 completeProcessing...');
    await tracker.completeProcessing(processingId, {
      status: 'success',
      processingTime: 1500,
      decision: {
        action: 'auto_reply',
        reason: '正常回复'
      }
    });
    console.log('✓ 处理完成');

    // 4. 验证 Redis 数据
    console.log('\n4. 验证 Redis 数据...');
    const redisData = await tracker.getProcessingDetail(processingId);
    console.log('Redis 数据:', JSON.stringify(redisData, null, 2));

    // 5. 验证数据库数据
    console.log('\n5. 验证数据库数据...');
    const { getDb } = require('coze-coding-dev-sdk');
    const { sql } = require('drizzle-orm');
    const db = await getDb();

    const dbResult = await db.execute(sql`
      SELECT * FROM execution_tracking
      WHERE processing_id = ${processingId}
    `);

    if (dbResult.rows.length > 0) {
      console.log('✓ 数据库记录存在');
      console.log('数据库数据:', JSON.stringify(dbResult.rows[0], null, 2));
    } else {
      console.log('✗ 数据库记录不存在');
    }

    // 6. 验证 API 返回
    console.log('\n6. 验证 API 返回...');
    const apiResponse = await fetch('http://localhost:5000/api/monitoring/executions?limit=5');
    const apiData = await apiResponse.json();
    console.log('API 返回:', JSON.stringify(apiData, null, 2));

    if (apiData.data.length > 0) {
      console.log('✓ API 返回成功，数据已同步');
    } else {
      console.log('✗ API 返回空数据');
    }

    console.log('\n✅ 测试完成！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

test();
