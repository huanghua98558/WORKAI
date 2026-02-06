/**
 * 创建AI日志测试数据
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { ai_io_logs } = require('../database/schema');
const { getLogger } = require('../lib/logger');

const logger = getLogger('SEED_AI_LOGS');

async function seedAILogs() {
  console.log('🌱 开始创建AI日志测试数据...\n');

  try {
    const db = await getDb();

    const testLogs = [
      {
        sessionId: 'test-session-1',
        messageId: 'msg-1',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'intent_recognition',
        aiInput: '你好，请问有什么可以帮助你的？',
        aiOutput: '识别意图：问候',
        modelId: 'doubao-pro-4k-241515',
        temperature: 0.7,
        requestDuration: 500,
        status: 'completed',
        errorMessage: null
      },
      {
        sessionId: 'test-session-1',
        messageId: 'msg-2',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'reply',
        aiInput: '我想了解一下你们的产品价格',
        aiOutput: '您好，我们的产品有多种套餐：基础版￥99/月，专业版￥199/月，企业版￥399/月。',
        modelId: 'doubao-pro-32k-241515',
        temperature: 0.8,
        requestDuration: 1200,
        status: 'completed',
        errorMessage: null
      },
      {
        sessionId: 'test-session-2',
        messageId: 'msg-3',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'intent_recognition',
        aiInput: '这个功能怎么使用？',
        aiOutput: '识别意图：咨询',
        modelId: 'doubao-pro-4k-241515',
        temperature: 0.7,
        requestDuration: 450,
        status: 'completed',
        errorMessage: null
      },
      {
        sessionId: 'test-session-3',
        messageId: 'msg-4',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'reply',
        aiInput: '我要退款',
        aiOutput: '很抱歉听到这个消息。我们提供30天无理由退款服务，您可以联系客服办理。',
        modelId: 'deepseek-v3',
        temperature: 0.7,
        requestDuration: 800,
        status: 'completed',
        errorMessage: null
      },
      {
        sessionId: 'test-session-4',
        messageId: 'msg-5',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'reply',
        aiInput: '系统出错了怎么办？',
        aiOutput: null,
        modelId: 'deepseek-r1',
        temperature: 0.7,
        requestDuration: 0,
        status: 'failed',
        errorMessage: 'API调用超时'
      },
      {
        sessionId: 'test-session-5',
        messageId: 'msg-6',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'conversion',
        aiInput: '这个产品有什么优势？',
        aiOutput: '我们的产品具有以下优势：1）智能高效 2）安全可靠 3）易于使用 4）价格合理',
        modelId: 'deepseek-v3',
        temperature: 0.8,
        requestDuration: 1500,
        status: 'completed',
        errorMessage: null
      },
      {
        sessionId: 'test-session-6',
        messageId: 'msg-7',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'tech_support',
        aiInput: '如何配置环境变量？',
        aiOutput: '您可以通过以下步骤配置环境变量：1）打开项目根目录 2）创建.env文件 3）添加配置项 4）重启服务',
        modelId: 'deepseek-r1',
        temperature: 0.5,
        requestDuration: 2000,
        status: 'completed',
        errorMessage: null
      },
      {
        sessionId: 'test-session-7',
        messageId: 'msg-8',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'reply',
        aiInput: '生成一份周报',
        aiOutput: '# 工作周报\n\n## 本周工作\n1. 完成了AI模块的开发\n2. 优化了系统性能\n3. 修复了多个bug\n\n## 下周计划\n1. 继续优化功能\n2. 准备发布版本',
        modelId: 'kimi-k2-250905',
        temperature: 0.7,
        requestDuration: 3000,
        status: 'completed',
        errorMessage: null
      },
      {
        sessionId: 'test-session-8',
        messageId: 'msg-9',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'reply',
        aiInput: '这个价格太贵了',
        aiOutput: '我理解您的顾虑。我们现在有优惠活动，新用户注册可享受8折优惠，折后只需￥79.2/月起。另外我们还提供7天免费试用期，您可以先体验再决定。',
        modelId: 'deepseek-v3',
        temperature: 0.8,
        requestDuration: 1100,
        status: 'completed',
        errorMessage: null
      },
      {
        sessionId: 'test-session-9',
        messageId: 'msg-10',
        robotId: 'robot-1',
        robotName: '测试机器人',
        operationType: 'reply',
        aiInput: '谢谢你的帮助',
        aiOutput: '不客气！很高兴能帮助到您。如果您还有其他问题，随时可以问我。',
        modelId: 'doubao-pro-32k-241515',
        temperature: 0.7,
        requestDuration: 600,
        status: 'completed',
        errorMessage: null
      }
    ];

    let insertedLogs = 0;
    for (const log of testLogs) {
      console.log(`   ✨ 插入日志: ${log.operationType} - ${log.status}`);
      await db.insert(ai_io_logs).values(log);
      insertedLogs++;
    }
    console.log(`   ✅ AI日志创建完成，共插入 ${insertedLogs} 条日志`);

    console.log('\n🎉 AI日志测试数据创建完成！');
    console.log('\n数据统计:');
    console.log(`  - AI日志: ${testLogs.length}`);
    console.log(`  - 成功: ${testLogs.filter(l => l.status === 'completed').length}`);
    console.log(`  - 失败: ${testLogs.filter(l => l.status === 'failed').length}`);
    
  } catch (error) {
    console.error('❌ AI日志创建失败:', error);
    process.exit(1);
  }
}

// 运行初始化
seedAILogs();
