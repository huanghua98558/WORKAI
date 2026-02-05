/**
 * WorkTool AI 2.1 - 协同功能测试脚本
 * 测试第二阶段（协同功能）
 *
 * 测试内容：
 * 1. 工作人员识别测试
 * 2. 工作人员消息处理测试
 * 3. 工作人员指令测试
 * 4. 协同决策测试
 * 5. 消息处理集成测试
 */

require('dotenv').config();
const staffIdentifierService = require('./services/staff/staff-identifier.service');
const staffTrackerService = require('./services/staff/staff-tracker.service');
const staffCommandService = require('./services/staff/staff-command.service');
const collabDecisionService = require('./services/collab/collab-decision.service');
const messageProcessingService = require('./services/message-processing.service');

// 测试配置
const testRobot = {
  robotId: 'test-robot-001',
  robotName: '测试机器人',
  enableCollaboration: true,
  collaborationConfig: {
    mode: 'adaptive',
    staffPriority: 0.7,
    aiPriority: 0.3,
    staffJoinBuffer: 30
  },
  staffConfig: {
    userIds: ['staff001', 'staff002', 'staff003'],
    nicknames: ['张三', '李四', '王五'],
    userRemarks: ['客服组长', '客服专员', '客服主管']
  }
};

const testSessionId = 'test-session-' + Date.now();

// 测试数据
const testMessages = {
  userMessage: {
    messageId: 'msg-' + Date.now() + '-001',
    content: '我的订单什么时候能到？',
    userId: 'user001',
    nickname: '用户小明'
  },
  staffMessage: {
    messageId: 'msg-' + Date.now() + '-002',
    content: '您好，我来帮您查询一下。',
    userId: 'staff001',
    nickname: '张三'
  },
  staffCommandMessage: {
    messageId: 'msg-' + Date.now() + '-003',
    content: '好的，我来处理。[暂停回复]',
    userId: 'staff001',
    nickname: '张三'
  }
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(60), colors.cyan);
  log(title, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function testResult(testName, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? colors.green : colors.red;
  log(`${status} - ${testName}`, color);
  if (message) {
    log(`  ${message}`, color);
  }
}

// 测试结果统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 测试函数
async function runTests() {
  log('\n🚀 WorkTool AI 2.1 - 协同功能测试', colors.magenta);
  log('📊 第二阶段（协同功能）验证\n', colors.magenta);

  try {
    // 更新工作人员识别配置
    staffIdentifierService.updateConfig({
      enabled: true,
      userIds: testRobot.staffConfig.userIds,
      nicknames: testRobot.staffConfig.nicknames,
      userRemarks: testRobot.staffConfig.userRemarks
    });

    // === 测试1: 工作人员识别 ===
    section('测试1: 工作人员识别功能');

    // 测试1.1: 识别工作人员（userId匹配）
    const staffInfo1 = await staffIdentifierService.identifyStaff(
      { sessionId: testSessionId },
      { ...testMessages.staffMessage, userId: 'staff001' },
      testRobot
    );
    totalTests++;
    const test1_1 = staffInfo1.isStaff && staffInfo1.confidence > 0.9;
    if (test1_1) passedTests++; else failedTests++;
    testResult(
      '工作人员识别（userId匹配）',
      test1_1,
      `isStaff=${staffInfo1.isStaff}, confidence=${staffInfo1.confidence}`
    );

    // 测试1.2: 识别工作人员（昵称匹配）
    const staffInfo2 = await staffIdentifierService.identifyStaff(
      { sessionId: testSessionId },
      { ...testMessages.userMessage, nickname: '张三', userId: 'user999' },
      testRobot
    );
    totalTests++;
    const test1_2 = staffInfo2.isStaff && staffInfo2.matchMethod === 'nickname';
    if (test1_2) passedTests++; else failedTests++;
    testResult(
      '工作人员识别（昵称匹配）',
      test1_2,
      `isStaff=${staffInfo2.isStaff}, matchMethod=${staffInfo2.matchMethod}`
    );

    // 测试1.3: 识别普通用户
    const userInfo = await staffIdentifierService.identifyStaff(
      { sessionId: testSessionId },
      testMessages.userMessage,
      testRobot
    );
    totalTests++;
    const test1_3 = !userInfo.isStaff;
    if (test1_3) passedTests++; else failedTests++;
    testResult(
      '识别普通用户',
      test1_3,
      `isStaff=${userInfo.isStaff}, confidence=${userInfo.confidence}`
    );

    // === 测试2: 工作人员追踪 ===
    section('测试2: 工作人员追踪功能');

    // 测试2.1: 记录工作人员加入
    await staffTrackerService.recordStaffJoin(testSessionId, 'staff001', '张三');
    const staffInfo = await staffTrackerService.getStaffInfo(testSessionId);
    totalTests++;
    const test2_1 = staffInfo.hasStaff && staffInfo.currentStaff === 'staff001';
    if (test2_1) passedTests++; else failedTests++;
    testResult(
      '记录工作人员加入',
      test2_1,
      `hasStaff=${staffInfo.hasStaff}, currentStaff=${staffInfo.currentStaff}`
    );

    // 测试2.2: 记录工作人员活动
    await staffTrackerService.updateActivity(testSessionId, 'staff001', 'message', {
      content: '测试消息'
    });
    const activityLevel = await staffTrackerService.getActivityLevel(testSessionId);
    totalTests++;
    const test2_2 = activityLevel.count > 0;
    if (test2_2) passedTests++; else failedTests++;
    testResult(
      '记录工作人员活动',
      test2_2,
      `activityCount=${activityLevel.count}`
    );

    // 测试2.3: 获取工作人员消息（先记录一条）
    await messageProcessingService.recordStaffMessage(
      { sessionId: testSessionId },
      { messageId: `test-msg-${Date.now()}-001`, content: '测试工作人员消息' },
      { staffUserId: 'staff001', nickname: '张三', confidence: 1, matchMethod: 'userId' }
    );
    const staffMessages = await staffTrackerService.getStaffMessages(testSessionId, 10);
    totalTests++;
    const test2_3 = staffMessages.length > 0;
    if (test2_3) passedTests++; else failedTests++;
    testResult(
      '获取工作人员消息',
      test2_3,
      `消息数量=${staffMessages.length}`
    );

    // === 测试3: 工作人员指令 ===
    section('测试3: 工作人员指令功能');

    // 测试3.1: 检测工作人员指令
    const commandInfo = await staffCommandService.detectCommand(testMessages.staffCommandMessage);
    totalTests++;
    const test3_1 = commandInfo !== null && commandInfo.action === 'pause_ai';
    if (test3_1) passedTests++; else failedTests++;
    testResult(
      '检测工作人员指令',
      test3_1,
      `command=${commandInfo?.command}, action=${commandInfo?.action}`
    );

    // 测试3.2: 执行工作人员指令
    if (commandInfo) {
      const commandResult = await staffCommandService.executeCommand(
        testSessionId,
        commandInfo,
        'staff001',
        testMessages.staffCommandMessage
      );
      totalTests++;
      const test3_2 = commandResult.success;
      if (test3_2) passedTests++; else failedTests++;
      testResult(
        '执行工作人员指令',
        test3_2,
        `success=${commandResult.success}, message=${commandResult.message}`
      );
    }

    // 测试3.3: 获取所有指令列表
    const commandList = staffCommandService.getCommandList();
    totalTests++;
    const test3_3 = commandList.length > 0;
    if (test3_3) passedTests++; else failedTests++;
    testResult(
      '获取指令列表',
      test3_3,
      `指令数量=${commandList.length}`
    );

    // === 测试4: 协同决策 ===
    section('测试4: 协同决策功能');

    // 测试4.1: 用户消息决策（工作人员在场且已处理过指令，不触发AI）
    const userContext = {
      sessionId: testSessionId,
      messageId: testMessages.userMessage.messageId,
      content: testMessages.userMessage.content
    };
    const userDecision = await collabDecisionService.makeDecision(userContext, testRobot);
    totalTests++;
    const test4_1 = userDecision.shouldAIReply === false; // 工作人员正在处理，不触发AI
    if (test4_1) passedTests++; else failedTests++;
    testResult(
      '用户消息协同决策（工作人员处理中，不触发AI）',
      test4_1,
      `shouldAIReply=${userDecision.shouldAIReply}, reason=${userDecision.reason}`
    );

    // 测试4.2: 工作人员在场时决策
    await staffTrackerService.updateSessionStaffStatus(testSessionId, {
      hasStaff: true,
      isHandlingRisk: true
    });
    const staffDecision = await collabDecisionService.makeDecision(userContext, testRobot);
    totalTests++;
    const test4_2 = staffDecision.shouldAIReply === false;
    if (test4_2) passedTests++; else failedTests++;
    testResult(
      '工作人员处理时决策（不触发AI）',
      test4_2,
      `shouldAIReply=${staffDecision.shouldAIReply}, reason=${staffDecision.reason}`
    );

    // 测试4.3: 决策日志记录
    const decisionLogs = await messageProcessingService.getDecisionLogs(testSessionId, 10);
    totalTests++;
    const test4_3 = decisionLogs.length > 0;
    if (test4_3) passedTests++; else failedTests++;
    testResult(
      '决策日志记录',
      test4_3,
      `日志数量=${decisionLogs.length}`
    );

    // === 测试5: 消息处理集成 ===
    section('测试5: 消息处理集成功能');

    // 测试5.1: 处理用户消息（工作人员处理中，不触发AI）
    const userResult = await messageProcessingService.processMessage(
      { sessionId: testSessionId },
      testMessages.userMessage,
      testRobot
    );
    totalTests++;
    const test5_1 = userResult.success && userResult.shouldTriggerAI === false; // 工作人员处理中，不触发AI
    if (test5_1) passedTests++; else failedTests++;
    testResult(
      '处理用户消息（工作人员处理中，不触发AI）',
      test5_1,
      `success=${userResult.success}, shouldTriggerAI=${userResult.shouldTriggerAI}`
    );

    // 测试5.2: 处理工作人员消息
    await staffTrackerService.updateSessionStaffStatus(testSessionId, {
      hasStaff: false,
      isHandlingRisk: false
    });
    const staffResult = await messageProcessingService.processMessage(
      { sessionId: testSessionId },
      testMessages.staffMessage,
      testRobot
    );
    totalTests++;
    const test5_2 = staffResult.success && staffResult.shouldTriggerAI === false;
    if (test5_2) passedTests++; else failedTests++;
    testResult(
      '处理工作人员消息（不触发AI）',
      test5_2,
      `success=${staffResult.success}, shouldTriggerAI=${staffResult.shouldTriggerAI}, type=${staffResult.type}`
    );

    // 测试5.3: 获取工作人员消息列表
    const staffMsgList = await messageProcessingService.getStaffMessages(testSessionId, 10);
    totalTests++;
    const test5_3 = staffMsgList.length > 0;
    if (test5_3) passedTests++; else failedTests++;
    testResult(
      '获取工作人员消息列表',
      test5_3,
      `消息数量=${staffMsgList.length}`
    );

    // === 测试总结 ===
    section('测试总结');
    log(`总测试数: ${totalTests}`, colors.cyan);
    log(`通过数: ${passedTests}`, colors.green);
    log(`失败数: ${failedTests}`, colors.red);
    log(`通过率: ${((passedTests / totalTests) * 100).toFixed(2)}%`, colors.cyan);

    if (passedTests === totalTests) {
      log('\n🎉 所有测试通过！第二阶段协同功能验证成功！', colors.green);
      process.exit(0);
    } else {
      log('\n⚠️  部分测试失败，请检查错误信息。', colors.yellow);
      process.exit(1);
    }

  } catch (error) {
    log('\n❌ 测试过程中发生错误:', colors.red);
    log(error.message, colors.red);
    log(error.stack, colors.red);
    process.exit(1);
  }
}

// 运行测试
runTests();
