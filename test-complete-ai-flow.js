/**
 * 完整 AI 流程测试脚本
 * 
 * 测试内容：
 * 1. UnifiedAnalysisService 统一分析
 * 2. RobotAIService 真实 LLM 调用
 * 3. 告警触发逻辑
 * 4. 任务创建逻辑
 */

const unifiedAnalysisService = require('./server/services/unified-analysis.service');

async function testCompleteAIAnalysis() {
  console.log('='.repeat(80));
  console.log('🚀 开始完整 AI 流程测试');
  console.log('='.repeat(80));

  // 测试用例
  const testCases = [
    {
      name: '测试用例 1: 用户投诉',
      sessionId: 'test-session-complaint-001',
      message: {
        messageId: 'msg-001',
        receivedName: '张三',
        groupName: '客户服务群',
        content: '你们的产品太差了，我用了三天就坏了，我要投诉！',
        textType: 1,
        roomType: 2,
        senderId: 'user_complaint_001',
        groupId: 'group_001',
      },
      robot: {
        robotId: 'test-robot-001',
        name: '测试机器人 001',
      },
      expected: {
        intent: 'complaint',
        sentiment: 'negative',
        shouldTriggerAlert: true,
        shouldCreateTask: true,
      }
    },
    {
      name: '测试用例 2: 技术支持请求',
      sessionId: 'test-session-technical-002',
      message: {
        messageId: 'msg-002',
        receivedName: '李四',
        groupName: '技术支持群',
        content: '我的账户登录不了，提示密码错误，但我确认密码是对的',
        textType: 1,
        roomType: 2,
        senderId: 'user_technical_001',
        groupId: 'group_002',
      },
      robot: {
        robotId: 'test-robot-001',
        name: '测试机器人 001',
      },
      expected: {
        intent: 'technical',
        sentiment: 'negative',
        shouldTriggerAlert: false,
        shouldCreateTask: true,
      }
    },
    {
      name: '测试用例 3: 价格咨询',
      sessionId: 'test-session-inquiry-003',
      message: {
        messageId: 'msg-003',
        receivedName: '王五',
        groupName: '产品咨询群',
        content: '请问你们的企业版价格是多少？',
        textType: 1,
        roomType: 2,
        senderId: 'user_inquiry_001',
        groupId: 'group_003',
      },
      robot: {
        robotId: 'test-robot-001',
        name: '测试机器人 001',
      },
      expected: {
        intent: 'inquiry',
        sentiment: 'neutral',
        shouldTriggerAlert: false,
        shouldCreateTask: false,
      }
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    console.log('\n' + '='.repeat(80));
    console.log(`📋 ${testCase.name}`);
    console.log('='.repeat(80));

    try {
      console.log('📤 输入:');
      console.log('  Session ID:', testCase.sessionId);
      console.log('  Message:', testCase.message.content);
      console.log('  Robot:', testCase.robot.name);

      const startTime = Date.now();

      // 执行统一分析
      console.log('\n🔄 执行统一分析...');
      const result = await unifiedAnalysisService.analyze(
        testCase.sessionId,
        testCase.message,
        testCase.robot,
        {
          enableIntent: true,
          enableSentiment: true,
          enableContext: true,
        }
      );

      const duration = Date.now() - startTime;

      console.log('\n✅ 分析结果:');
      console.log(`  ⏱️  耗时: ${duration}ms`);
      console.log(`  🧠 意图: ${result.intent?.intent || 'N/A'} (置信度: ${Math.round((result.intent?.confidence || 0) * 100)}%)`);
      console.log(`  ❤️  情感: ${result.sentiment?.sentiment || 'N/A'} (强度: ${result.sentiment?.emotional_intensity || 'N/A'})`);
      console.log(`  🚨 触发告警: ${result.alert_trigger?.should_trigger ? '是' : '否'}`);
      if (result.alert_trigger?.should_trigger) {
        console.log(`  📊 告警级别: ${result.alert_trigger?.alert_level}`);
        console.log(`  📝 触发条件:`, result.alert_trigger?.trigger_conditions);
      }
      console.log(`  ✨ 行动建议: ${result.action_suggestions?.length || 0} 条`);
      if (result.action_suggestions?.length > 0) {
        result.action_suggestions.forEach((s, i) => {
          console.log(`     ${i + 1}. ${s.action} (${s.priority})`);
        });
      }
      console.log(`  📋 任务创建: ${result.task_created ? '是' : '否'}`);
      if (result.task_created) {
        console.log(`  🆔 任务 ID: ${result.task_id}`);
      }

      // 验证结果
      console.log('\n🔍 验证结果:');
      const validations = [];

      // 验证意图
      const intentMatch = result.intent?.intent === testCase.expected.intent;
      validations.push({
        field: '意图',
        expected: testCase.expected.intent,
        actual: result.intent?.intent,
        passed: intentMatch,
      });

      // 验证情感
      const sentimentMatch = result.sentiment?.sentiment === testCase.expected.sentiment;
      validations.push({
        field: '情感',
        expected: testCase.expected.sentiment,
        actual: result.sentiment?.sentiment,
        passed: sentimentMatch,
      });

      // 验证告警触发
      const alertMatch = result.alert_trigger?.should_trigger === testCase.expected.shouldTriggerAlert;
      validations.push({
        field: '告警触发',
        expected: testCase.expected.shouldTriggerAlert,
        actual: result.alert_trigger?.should_trigger,
        passed: alertMatch,
      });

      // 验证任务创建
      const taskMatch = result.task_created === testCase.expected.shouldCreateTask;
      validations.push({
        field: '任务创建',
        expected: testCase.expected.shouldCreateTask,
        actual: result.task_created,
        passed: taskMatch,
      });

      let testPassed = true;
      validations.forEach(v => {
        const status = v.passed ? '✅' : '❌';
        console.log(`  ${status} ${v.field}: 期望 ${v.expected}, 实际 ${v.actual}`);
        if (!v.passed) {
          testPassed = false;
        }
      });

      if (testPassed) {
        console.log(`\n✅ 测试通过: ${testCase.name}`);
        passedTests++;
      } else {
        console.log(`\n❌ 测试失败: ${testCase.name}`);
        failedTests++;
      }

    } catch (error) {
      console.error(`\n❌ 测试执行失败: ${testCase.name}`);
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      failedTests++;
    }
  }

  // 汇总
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试汇总');
  console.log('='.repeat(80));
  console.log(`✅ 通过: ${passedTests}/${testCases.length}`);
  console.log(`❌ 失败: ${failedTests}/${testCases.length}`);
  console.log(`📈 成功率: ${Math.round((passedTests / testCases.length) * 100)}%`);

  if (passedTests === testCases.length) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查日志');
    process.exit(1);
  }
}

// 运行测试
testCompleteAIAnalysis()
  .then(() => {
    console.log('\n✨ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 测试崩溃:', error);
    process.exit(1);
  });
