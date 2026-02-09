/**
 * 使用真实机器人数据模拟 WorkTool 回调消息
 */

require('dotenv').config();
const axios = require('axios');

const ROBOT_ID = 'wt22phhjpt2xboerspxsote472xdnyq2'; // 真实的机器人ID
const CALLBACK_URL = `http://localhost:5001/api/worktool/callback/message?robotId=${ROBOT_ID}`;

// 模拟真实的工作场景消息
const TEST_MESSAGES = [
  {
    name: '标准客服咨询',
    data: {
      spoken: '你好，请问你们的产品支持哪些功能？',
      rawSpoken: '你好，请问你们的产品支持哪些功能？',
      receivedName: '张三',
      groupName: '测试群',
      groupRemark: '客户咨询群',
      roomType: 1,
      atMe: true,
      textType: 1,
      msgId: `msg_${Date.now()}_001`
    }
  },
  {
    name: '技术支持请求',
    data: {
      spoken: '我的系统无法登录，提示认证失败，请帮我排查一下',
      rawSpoken: '我的系统无法登录，提示认证失败，请帮我排查一下',
      receivedName: '李四',
      groupName: '技术支持群',
      groupRemark: '内部技术支持',
      roomType: 3,
      atMe: true,
      textType: 1,
      msgId: `msg_${Date.now()}_002`
    }
  },
  {
    name: '产品咨询',
    data: {
      spoken: '我想了解一下你们的企业版价格',
      rawSpoken: '我想了解一下你们的企业版价格',
      receivedName: '王五',
      groupName: '销售群',
      groupRemark: '潜在客户',
      roomType: 1,
      atMe: true,
      textType: 1,
      msgId: `msg_${Date.now()}_003`
    }
  },
  {
    name: '风险消息',
    data: {
      spoken: '这个系统太烂了，我要投诉！',
      rawSpoken: '这个系统太烂了，我要投诉！',
      receivedName: '赵六',
      groupName: '投诉群',
      groupRemark: '',
      roomType: 1,
      atMe: true,
      textType: 1,
      msgId: `msg_${Date.now()}_004`
    }
  },
  {
    name: '简单问候',
    data: {
      spoken: '早上好',
      rawSpoken: '早上好',
      receivedName: '小明',
      groupName: '内部群',
      groupRemark: '公司内部群',
      roomType: 3,
      atMe: false,
      textType: 1,
      msgId: `msg_${Date.now()}_005`
    }
  }
];

async function sendCallbackMessage(messageData) {
  try {
    console.log(`\n📤 发送回调消息: ${messageData.name}`);
    console.log(`📝 消息内容:`, messageData.data);

    const response = await axios.post(CALLBACK_URL, messageData.data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    });

    console.log(`✅ 响应成功:`, {
      status: response.status,
      data: response.data
    });

    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error(`❌ 发送失败:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

async function runSimulation() {
  console.log('='.repeat(60));
  console.log('🚀 开始真实机器人数据模拟测试');
  console.log('='.repeat(60));
  console.log(`🤖 机器人 ID: ${ROBOT_ID}`);
  console.log(`🌐 回调 URL: ${CALLBACK_URL}`);
  console.log(`📋 测试消息数量: ${TEST_MESSAGES.length}`);
  console.log('='.repeat(60));

  const results = [];

  for (let i = 0; i < TEST_MESSAGES.length; i++) {
    const testMessage = TEST_MESSAGES[i];
    console.log(`\n\n${'─'.repeat(60)}`);
    console.log(`测试 ${i + 1}/${TEST_MESSAGES.length}: ${testMessage.name}`);
    console.log(`${'─'.repeat(60)}`);

    const result = await sendCallbackMessage(testMessage);
    results.push({
      testName: testMessage.name,
      ...result
    });

    // 等待一段时间再发送下一条消息
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 输出测试总结
  console.log('\n\n');
  console.log('='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  results.forEach((result, index) => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    console.log(`${index + 1}. ${result.testName}: ${status}`);
    if (!result.success) {
      console.log(`   错误: ${result.error}`);
    }
  });

  console.log('─'.repeat(60));
  console.log(`总计: ${results.length} 条消息`);
  console.log(`成功: ${successCount} 条`);
  console.log(`失败: ${failureCount} 条`);
  console.log('='.repeat(60));

  return results;
}

// 运行模拟测试
runSimulation()
  .then((results) => {
    console.log('\n✅ 模拟测试完成');
    const allSuccess = results.every(r => r.success);
    process.exit(allSuccess ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ 模拟测试失败:', error);
    process.exit(1);
  });
