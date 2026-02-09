/**
 * 模拟真实的 WorkTool 机器人回调
 * 使用真实的消息格式发送到系统的回调接口
 */

require('dotenv').config();
const axios = require('axios');

const ROBOT_ID = 'wt22phhjpt2xboerspxsote472xdnyq2'; // 真实的机器人ID
const CALLBACK_URL = `http://localhost:5001/api/worktool/callback/message?robotId=${ROBOT_ID}`;

// 真实的 WorkTool 回调消息格式
const REAL_CALLBACK_MESSAGES = [
  {
    name: '真实客服咨询',
    description: '客户询问产品功能',
    data: {
      spoken: '你好，请问你们的产品支持哪些功能？',
      rawSpoken: '你好，请问你们的产品支持哪些功能？',
      receivedName: '张三',
      groupName: '测试群',
      groupRemark: '客户咨询群',
      roomType: 1, // 外部群
      atMe: true, // @了机器人
      textType: 1, // 文本消息
      msgId: `msg_${Date.now()}_001`,
      timestamp: new Date().toISOString()
    }
  },
  {
    name: '真实技术支持',
    description: '系统登录问题',
    data: {
      spoken: '我的系统无法登录，提示认证失败，请帮我排查一下',
      rawSpoken: '我的系统无法登录，提示认证失败，请帮我排查一下',
      receivedName: '李四',
      groupName: '技术支持群',
      groupRemark: '内部技术支持',
      roomType: 3, // 内部群
      atMe: true,
      textType: 1,
      msgId: `msg_${Date.now()}_002`,
      timestamp: new Date().toISOString()
    }
  },
  {
    name: '真实产品咨询',
    description: '价格咨询',
    data: {
      spoken: '我想了解一下你们的企业版价格',
      rawSpoken: '我想了解一下你们的企业版价格',
      receivedName: '王五',
      groupName: '销售群',
      groupRemark: '潜在客户',
      roomType: 1, // 外部群
      atMe: true,
      textType: 1,
      msgId: `msg_${Date.now()}_003`,
      timestamp: new Date().toISOString()
    }
  }
];

async function sendRealCallbackMessage(messageConfig) {
  try {
    console.log(`\n📤 发送真实回调: ${messageConfig.name}`);
    console.log(`📝 描述: ${messageConfig.description}`);
    console.log(`📋 消息内容:`, JSON.stringify(messageConfig.data, null, 2));

    const response = await axios.post(CALLBACK_URL, messageConfig.data, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WorkTool-Webhook/2.0', // 模拟真实的 User-Agent
        'X-Timestamp': Date.now().toString()
      },
      timeout: 30000 // 30秒超时
    });

    console.log(`✅ 回调成功:`, {
      status: response.status,
      code: response.data.code,
      message: response.data.message,
      data: response.data.data
    });

    // 等待一下让系统处理
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      success: true,
      status: response.status,
      response: response.data
    };
  } catch (error) {
    console.error(`❌ 回调失败:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

async function checkDatabaseRecords() {
  const { getDb } = require('coze-coding-dev-sdk');
  const { callbackHistory, flowInstances, sessionMessages } = require('./database/schema');
  const { desc } = require('drizzle-orm');

  try {
    const db = await getDb();

    console.log('\n📊 检查数据库记录:');

    // 检查回调历史
    const callbackRecords = await db
      .select()
      .from(callbackHistory)
      .orderBy(desc(callbackHistory.createdAt))
      .limit(3);

    console.log(`✅ 回调历史记录: ${callbackRecords.length} 条`);
    callbackRecords.forEach(record => {
      console.log(`   - 消息ID: ${record.messageId}, 错误码: ${record.errorCode}, 时间: ${record.createdAt}`);
    });

    // 检查流程实例
    const flowInstances = await db
      .select()
      .from(flowInstances)
      .orderBy(desc(flowInstances.createdAt))
      .limit(3);

    console.log(`✅ 流程实例: ${flowInstances.length} 条`);
    flowInstances.forEach(instance => {
      console.log(`   - 实例ID: ${instance.id}, 状态: ${instance.status}, 时间: ${instance.createdAt}`);
    });

    // 检查会话消息
    const messages = await db
      .select()
      .from(sessionMessages)
      .orderBy(desc(sessionMessages.createdAt))
      .limit(3);

    console.log(`✅ 会话消息: ${messages.length} 条`);
    messages.forEach(msg => {
      console.log(`   - 消息ID: ${msg.id}, 内容: ${msg.content?.substring(0, 30)}..., 时间: ${msg.createdAt}`);
    });

  } catch (error) {
    console.error('❌ 检查数据库失败:', error.message);
  }
}

async function runRealSimulation() {
  console.log('='.repeat(70));
  console.log('🚀 开始真实的 WorkTool 机器人回调模拟');
  console.log('='.repeat(70));
  console.log(`🤖 机器人 ID: ${ROBOT_ID}`);
  console.log(`🌐 回调 URL: ${CALLBACK_URL}`);
  console.log(`📋 测试消息数量: ${REAL_CALLBACK_MESSAGES.length}`);
  console.log('='.repeat(70));

  const results = [];

  for (let i = 0; i < REAL_CALLBACK_MESSAGES.length; i++) {
    const messageConfig = REAL_CALLBACK_MESSAGES[i];
    console.log(`\n\n${'─'.repeat(70)}`);
    console.log(`测试 ${i + 1}/${REAL_CALLBACK_MESSAGES.length}: ${messageConfig.name}`);
    console.log(`${'─'.repeat(70)}`);

    const result = await sendRealCallbackMessage(messageConfig);
    results.push({
      testName: messageConfig.name,
      ...result
    });

    // 每次发送后检查数据库记录
    await checkDatabaseRecords();

    // 等待一段时间再发送下一条消息
    if (i < REAL_CALLBACK_MESSAGES.length - 1) {
      console.log(`\n⏳ 等待 5 秒后发送下一条消息...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // 最终检查数据库
  console.log('\n\n');
  console.log('='.repeat(70));
  console.log('📊 最终数据库检查');
  console.log('='.repeat(70));
  await checkDatabaseRecords();

  // 输出测试总结
  console.log('\n\n');
  console.log('='.repeat(70));
  console.log('📊 测试总结');
  console.log('='.repeat(70));

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  results.forEach((result, index) => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    console.log(`${index + 1}. ${result.testName}: ${status}`);
    if (!result.success) {
      console.log(`   错误: ${JSON.stringify(result.error)}`);
    }
  });

  console.log('─'.repeat(70));
  console.log(`总计: ${results.length} 条消息`);
  console.log(`成功: ${successCount} 条`);
  console.log(`失败: ${failureCount} 条`);
  console.log('='.repeat(70));
  console.log('\n💡 提示：请访问前端面板查看消息处理结果');
  console.log('📱 前端地址: http://localhost:5000');
  console.log('='.repeat(70));

  return results;
}

// 运行真实模拟
runRealSimulation()
  .then((results) => {
    console.log('\n✅ 真实模拟测试完成');
    const allSuccess = results.every(r => r.success);
    process.exit(allSuccess ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ 真实模拟测试失败:', error);
    process.exit(1);
  });
