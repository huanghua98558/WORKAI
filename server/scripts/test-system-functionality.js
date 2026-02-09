/**
 * 系统功能测试脚本
 * 模拟各种场景的消息发送，测试系统功能
 */

require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const messageProcessingService = require('../services/message-processing.service');
const { flowEngine, TriggerType } = require('../services/flow-engine.service');
const sessionService = require('../services/session.service');
const robotService = require('../services/robot.service');
const { staffIdentifierService } = require('../services/staff/staff-identifier.service');
const { getDb } = require('coze-coding-dev-sdk');
const { sessions, flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');

// 测试结果收集器
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// 测试机器人配置
const testRobotId = 'test-robot-001';
const testRobot = {
  robotId: testRobotId,
  name: '测试机器人',
  nickname: '测试助手',
  robotType: '通用',
  robotGroup: '客服',
  conversionMode: false,
  staffList: [],
  staffKeywords: ['客服', '人工', '管理员']
};

// 测试场景配置
const testScenarios = [
  {
    name: '场景1：普通用户发送简单问候',
    description: '测试系统对普通问候的响应能力',
    messages: [
      { role: 'user', content: '你好', fromName: '用户A', userId: 'user-001' },
      { role: 'user', content: '你好呀，请问在吗？', fromName: '用户B', userId: 'user-002' },
      { role: 'user', content: '早上好', fromName: '用户C', userId: 'user-003' }
    ]
  },
  {
    name: '场景2：用户询问产品信息',
    description: '测试系统对产品咨询的响应能力',
    messages: [
      { role: 'user', content: '你们有什么产品？', fromName: '用户D', userId: 'user-004' },
      { role: 'user', content: '产品价格是多少？', fromName: '用户E', userId: 'user-005' },
      { role: 'user', content: '我想了解一下你们的服务', fromName: '用户F', userId: 'user-006' }
    ]
  },
  {
    name: '场景3：用户发送求助消息',
    description: '测试系统对求助消息的处理',
    messages: [
      { role: 'user', content: '我需要帮助', fromName: '用户G', userId: 'user-007' },
      { role: 'user', content: '能帮我解决一个问题吗？', fromName: '用户H', userId: 'user-008' },
      { role: 'user', content: '遇到困难了，求助', fromName: '用户I', userId: 'user-009' }
    ]
  },
  {
    name: '场景4：工作人员发送消息',
    description: '测试工作人员消息识别和处理',
    messages: [
      { role: 'user', content: '你好', fromName: '客服张三', userId: 'staff-001' },
      { role: 'user', content: '这里是人工客服', fromName: '客服李四', userId: 'staff-002' },
      { role: 'user', content: '我是管理员，帮我处理一下', fromName: '管理员王五', userId: 'staff-003' }
    ]
  },
  {
    name: '场景5：用户发送敏感内容',
    description: '测试系统对敏感内容的检测和处理',
    messages: [
      { role: 'user', content: '我要投诉', fromName: '用户J', userId: 'user-010' },
      { role: 'user', content: '我不满意这个服务，我要退款', fromName: '用户K', userId: 'user-011' },
      { role: 'user', content: '我认识你们领导', fromName: '用户L', userId: 'user-012' }
    ]
  },
  {
    name: '场景6：多轮对话场景',
    description: '测试系统的上下文理解能力',
    messages: [
      { role: 'user', content: '我想了解产品A', fromName: '用户M', userId: 'user-013' },
      { role: 'assistant', content: '好的，产品A是我们的主打产品之一...', fromName: '机器人', userId: 'robot' },
      { role: 'user', content: '那产品B呢？', fromName: '用户M', userId: 'user-013' },
      { role: 'assistant', content: '产品B是...', fromName: '机器人', userId: 'robot' },
      { role: 'user', content: '哪个更适合我？', fromName: '用户M', userId: 'user-013' }
    ]
  },
  {
    name: '场景7：会话切换场景',
    description: '测试同一用户在不同会话中的消息处理',
    messages: [
      { role: 'user', content: '我要咨询产品', fromName: '用户N', userId: 'user-014', groupId: 'group-001' },
      { role: 'user', content: '我要技术支持', fromName: '用户N', userId: 'user-014', groupId: 'group-002' },
      { role: 'user', content: '我要售后服务', fromName: '用户N', userId: 'user-014', groupId: 'group-003' }
    ]
  },
  {
    name: '场景8：高频消息场景',
    description: '测试系统在高并发消息下的表现',
    messages: Array.from({ length: 10 }, (_, i) => ({
      role: 'user',
      content: `消息 ${i + 1}：你好`,
      fromName: `用户${i + 15}`,
      userId: `user-${i + 15}`
    }))
  },
  {
    name: '场景9：异常消息场景',
    description: '测试系统对异常消息的处理',
    messages: [
      { role: 'user', content: '', fromName: '用户P', userId: 'user-025' },
      { role: 'user', content: '   ', fromName: '用户Q', userId: 'user-026' },
      { role: 'user', content: '!@#$%^&*()', fromName: '用户R', userId: 'user-027' }
    ]
  },
  {
    name: '场景10：长时间未活动后发送消息',
    description: '测试会话超时后的消息处理',
    messages: [
      { role: 'user', content: '我之前问过一个问题', fromName: '用户S', userId: 'user-028' },
      { role: 'user', content: '还记得我吗？', fromName: '用户T', userId: 'user-029' },
      { role: 'user', content: '继续上次的话题', fromName: '用户U', userId: 'user-030' }
    ]
  }
];

/**
 * 记录测试结果
 */
function recordTestResult(testName, passed, message, details = {}) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  testResults.tests.push({
    testName,
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  });
}

/**
 * 模拟发送消息
 */
async function simulateMessage(context, message, robot) {
  try {
    const result = await messageProcessingService.processMessage(
      context,
      {
        messageId: uuidv4(),
        content: message.content,
        userId: message.userId,
        receivedName: message.fromName,
        timestamp: new Date().toISOString(),
        atMe: true // 模拟@机器人
      },
      robot
    );

    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 运行单个测试场景
 */
async function runScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试场景: ${scenario.name}`);
  console.log(`描述: ${scenario.description}`);
  console.log(`消息数量: ${scenario.messages.length}`);
  console.log(`${'='.repeat(60)}\n`);

  const scenarioResults = {
    scenarioName: scenario.name,
    messages: [],
    startTime: Date.now(),
    endTime: null,
    successCount: 0,
    failCount: 0
  };

  for (let i = 0; i < scenario.messages.length; i++) {
    const message = scenario.messages[i];
    const messageIndex = i + 1;

    console.log(`[${messageIndex}/${scenario.messages.length}] 发送消息: "${message.content}"`);
    console.log(`    发送者: ${message.fromName} (ID: ${message.userId})`);

    // 创建或获取会话
    const context = {
      sessionId: `test-scenario-${scenario.name}-${message.userId}`,
      userId: message.userId,
      userName: message.fromName,
      groupId: message.groupId || `test-group-${scenario.name}`,
      groupName: `测试群组-${scenario.name}`,
      roomType: '1',
      atMe: true
    };

    // 发送消息
    const result = await simulateMessage(context, message, testRobot);

    const messageResult = {
      index: messageIndex,
      content: message.content,
      sender: message.fromName,
      success: result.success,
      result: result.success ? result.result : null,
      error: result.success ? null : result.error
    };

    scenarioResults.messages.push(messageResult);

    if (result.success) {
      scenarioResults.successCount++;
      console.log(`    ✅ 处理成功`);
      console.log(`    响应类型: ${result.result.type || 'unknown'}`);

      if (result.result.reply) {
        console.log(`    AI回复: ${result.result.reply.substring(0, 50)}...`);
      }

      if (result.result.shouldTriggerAI === false) {
        console.log(`    触发AI: 否 (${result.result.type || '未知原因'})`);
      } else {
        console.log(`    触发AI: 是`);
      }
    } else {
      scenarioResults.failCount++;
      console.log(`    ❌ 处理失败: ${result.error}`);
    }

    console.log('');
  }

  scenarioResults.endTime = Date.now();
  scenarioResults.duration = scenarioResults.endTime - scenarioResults.startTime;

  // 判断场景是否通过
  const passed = scenarioResults.successCount === scenario.messages.length;
  const message = passed
    ? `所有消息处理成功 (${scenarioResults.successCount}/${scenario.messages.length})`
    : `部分消息处理失败 (${scenarioResults.successCount}/${scenario.messages.length} 成功)`;

  recordTestResult(
    scenario.name,
    passed,
    message,
    scenarioResults
  );

  console.log(`\n场景总结:`);
  console.log(`  总耗时: ${scenarioResults.duration}ms`);
  console.log(`  成功: ${scenarioResults.successCount}`);
  console.log(`  失败: ${scenarioResults.failCount}`);
  console.log(`  结果: ${passed ? '✅ 通过' : '❌ 失败'}`);

  return scenarioResults;
}

/**
 * 运行所有测试场景
 */
async function runAllScenarios() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           WorkTool AI 系统功能测试                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`测试场景数: ${testScenarios.length}`);
  console.log(`预计测试消息数: ${testScenarios.reduce((sum, s) => sum + s.messages.length, 0)}`);

  const allResults = [];

  for (const scenario of testScenarios) {
    try {
      const result = await runScenario(scenario);
      allResults.push(result);
    } catch (error) {
      console.error(`\n❌ 场景执行出错: ${scenario.name}`);
      console.error(`错误: ${error.message}`);

      recordTestResult(
        scenario.name,
        false,
        `场景执行异常: ${error.message}`,
        { error: error.message, stack: error.stack }
      );
    }

    // 场景间延迟，避免过载
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allResults;
}

/**
 * 生成测试报告
 */
function generateTestReport(allResults) {
  const endTime = Date.now();
  const reportDuration = testResults.tests[0]?.timestamp ? endTime - new Date(testResults.tests[0].timestamp).getTime() : 0;

  console.log('\n\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    测试报告                               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // 总体统计
  console.log('【总体统计】');
  console.log(`  测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`  总测试数: ${testResults.total}`);
  console.log(`  通过: ${testResults.passed} (${((testResults.passed / testResults.total) * 100).toFixed(2)}%)`);
  console.log(`  失败: ${testResults.failed} (${((testResults.failed / testResults.total) * 100).toFixed(2)}%)`);
  console.log(`  跳过: ${testResults.skipped}`);
  console.log(`  成功率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  console.log('');

  // 失败测试详情
  if (testResults.failed > 0) {
    console.log('【失败测试详情】');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ❌ ${t.testName}`);
        console.log(`     原因: ${t.message}`);
        if (t.details.error) {
          console.log(`     错误: ${t.details.error}`);
        }
      });
    console.log('');
  }

  // 各场景详细结果
  console.log('【场景测试详情】');
  allResults.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.scenarioName}`);
    console.log(`   描述: ${testScenarios[index].description}`);
    console.log(`   耗时: ${result.duration}ms`);
    console.log(`   成功: ${result.successCount}`);
    console.log(`   失败: ${result.failCount}`);
    console.log(`   状态: ${result.successCount === result.messages.length ? '✅ 通过' : '❌ 失败'}`);

    // 显示消息详情
    result.messages.forEach(msg => {
      const icon = msg.success ? '✅' : '❌';
      console.log(`   ${icon} [${msg.index}] ${msg.sender}: "${msg.content}"`);
      if (!msg.success) {
        console.log(`      错误: ${msg.error}`);
      }
    });
  });

  // 性能分析
  const totalMessages = allResults.reduce((sum, r) => sum + r.messages.length, 0);
  const totalScenarioDuration = allResults.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalMessages > 0 ? totalScenarioDuration / totalMessages : 0;

  console.log('\n【性能分析】');
  console.log(`  总消息数: ${totalMessages}`);
  console.log(`  总耗时: ${totalScenarioDuration}ms`);
  console.log(`  平均响应时间: ${avgDuration.toFixed(2)}ms`);

  // 统计不同类型的消息
  const messageTypeStats = {};
  allResults.forEach(result => {
    result.messages.forEach(msg => {
      if (msg.success && msg.result) {
        const type = msg.result.type || 'unknown';
        messageTypeStats[type] = (messageTypeStats[type] || 0) + 1;
      }
    });
  });

  console.log('\n【消息类型统计】');
  Object.entries(messageTypeStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                   测试完成                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // 返回测试报告对象
  return {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%'
    },
    performance: {
      totalMessages,
      totalDuration: totalScenarioDuration,
      avgDuration: avgDuration.toFixed(2) + 'ms'
    },
    messageTypeStats,
    details: testResults.tests
  };
}

/**
 * 主函数
 */
async function main() {
  try {
    // 初始化数据库连接
    const db = await getDb();
    console.log('✅ 数据库连接成功\n');

    // 运行所有测试场景
    const allResults = await runAllScenarios();

    // 生成测试报告
    const report = generateTestReport(allResults);

    // 保存测试报告到文件
    const fs = require('fs');
    const reportPath = '/tmp/test-report-' + Date.now() + '.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n测试报告已保存到: ${reportPath}`);

    // 返回退出码
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  });
}

module.exports = { runAllScenarios, generateTestReport };
