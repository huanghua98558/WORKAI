/**
 * 数据模拟脚本
 * 在数据库中模拟各类测试数据，用于监控面板显示验证
 */

require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const {
  robots,
  sessions,
  sessionMessages,
  callbackHistory,
  alertHistory,
  ai_io_logs,
  aiModelUsage,
  staffActivities,
  execution_tracking,
  systemLogs,
  users,
  flowDefinitions,
  flowInstances
} = require('../database/schema');
const { eq } = require('drizzle-orm');

// 模拟数据配置
const config = {
  // 机器人数量
  robotCount: 5,
  // 会话数量
  sessionCount: 20,
  // 每个会话的消息数量范围
  messagePerSession: { min: 3, max: 15 },
  // 回调历史数量
  callbackCount: 50,
  // 告警历史数量
  alertCount: 30,
  // AI日志数量
  aiLogCount: 40,
  // 工作人员活动数量
  staffActivityCount: 15,
  // 执行追踪数量
  executionCount: 20,
  // 系统日志数量
  systemLogCount: 25,
  // 流程定义数量
  flowDefinitionCount: 3
};

// 随机数生成器
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 模拟数据生成器
const dataGenerators = {
  // 机器人数据
  robots: () => {
    const types = ['通用', '客服', '营销', '技术支持', '角色'];
    const groups = ['客服', '营销', '技术支持', '管理', '运营'];
    const statuses = ['active', 'inactive', 'paused'];

    const result = [];
    for (let i = 1; i <= config.robotCount; i++) {
      const robotId = `robot-${uuidv4()}`;
      result.push({
        robotId,
        name: `测试机器人${i}`,
        nickname: `Robot${i}`,
        description: `这是一个用于测试的机器人${i}`,
        robotType: randomChoice(types),
        robotGroup: randomChoice(groups),
        status: randomChoice(statuses),
        isActive: Math.random() > 0.2,
        createdAt: randomDate(new Date('2024-01-01'), new Date()),
        updatedAt: new Date()
      });
    }
    return result;
  },

  // 会话数据
  sessions: (robotIds) => {
    const statuses = ['auto', 'human', 'pending'];
    const groupNames = ['测试群1', '测试群2', '客服群', '营销群', '技术支持群'];

    const result = [];
    for (let i = 1; i <= config.sessionCount; i++) {
      const sessionId = `session-${uuidv4()}`;
      result.push({
        id: sessionId,
        sessionId: sessionId,
        userId: `user-${randomInt(1000, 9999)}`,
        userName: `用户${randomInt(1, 100)}`,
        groupId: `group-${randomInt(1, 10)}`,
        groupName: randomChoice(groupNames),
        roomType: randomInt(1, 4),
        robotId: randomChoice(robotIds),
        robotName: `测试机器人${randomInt(1, 5)}`,
        status: randomChoice(statuses),
        messageCount: randomInt(config.messagePerSession.min, config.messagePerSession.max),
        lastIntent: randomChoice(['service', 'help', 'chat', 'welcome', 'risk']),
        lastActiveTime: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        createdAt: randomDate(new Date('2024-01-01'), new Date()),
        updatedAt: new Date()
      });
    }
    return result;
  },

  // 会话消息数据
  sessionMessages: (sessions) => {
    const messageTypes = ['text', 'image', 'voice', 'system'];
    const fromTypes = ['user', 'robot', 'system'];
    const intents = ['service', 'help', 'chat', 'welcome', 'risk', 'spam', 'admin'];

    const result = [];
    sessions.forEach(session => {
      const messageCount = session.messageCount || randomInt(1, 10);
      for (let i = 0; i < messageCount; i++) {
        result.push({
          id: uuidv4(),
          sessionId: session.sessionId,
          userId: session.userId,
          userName: session.userName,
          content: `测试消息内容 ${i + 1}`,
          messageType: randomChoice(messageTypes),
          fromType: randomChoice(fromTypes),
          intent: randomChoice(intents),
          timestamp: randomDate(
            new Date(session.createdAt),
            new Date(session.lastActiveTime)
          ),
          createdAt: randomDate(
            new Date(session.createdAt),
            new Date(session.lastActiveTime)
          )
        });
      }
    });
    return result;
  },

  // 回调历史数据
  callbackHistory: (robotIds) => {
    const callbackTypes = [11, 0, 1, 5, 6]; // 11=消息, 0=群二维码, 1=指令结果, 5=上线, 6=下线
    const errorCodes = [0, 0, 0, 0, 0, 0, 404, 500, 503, 403];

    const result = [];
    for (let i = 1; i <= config.callbackCount; i++) {
      const errorCode = randomChoice(errorCodes);
      result.push({
        robotId: randomChoice(robotIds),
        messageId: uuidv4(),
        callbackType: randomChoice(callbackTypes),
        errorCode,
        errorReason: errorCode === 0 ? '成功' : `错误${errorCode}`,
        runTime: Math.floor(Date.now() / 1000),
        timeCost: randomInt(10, 500),
        commandType: randomInt(0, 10),
        rawMsg: `原始消息内容 ${i}`,
        extraData: JSON.stringify({ test: true, index: i }),
        createdAt: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date())
      });
    }
    return result;
  },

  // 告警历史数据
  alertHistory: () => {
    const levels = ['critical', 'warning', 'info', 'info', 'info', 'warning'];
    const intents = ['service', 'help', 'risk', 'spam', 'admin'];
    const statuses = ['pending', 'pending', 'handled', 'handled', 'ignored', 'sent', 'escalated'];

    const result = [];
    for (let i = 1; i <= config.alertCount; i++) {
      result.push({
        id: uuidv4(),
        sessionId: `session-${uuidv4()}`,
        alertRuleId: `rule-${uuidv4()}`,
        intentType: randomChoice(intents),
        alertLevel: randomChoice(levels),
        groupId: `group-${randomInt(1, 10)}`,
        groupName: `测试群${randomInt(1, 10)}`,
        userId: `user-${randomInt(1000, 9999)}`,
        userName: `用户${randomInt(1, 100)}`,
        message: `触发告警的消息内容 ${i}`,
        status: randomChoice(statuses),
        escalationLevel: randomInt(0, 3),
        responseTime: randomInt(1, 60),
        handledAt: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
        createdAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
      });
    }
    return result;
  },

  // AI日志数据
  ai_io_logs: () => {
    const operationTypes = ['intent_recognition', 'service_reply', 'chat', 'test_chat'];
    const statuses = ['success', 'success', 'success', 'error'];

    const result = [];
    for (let i = 1; i <= config.aiLogCount; i++) {
      const isSuccess = randomChoice([true, true, true, false]);
      result.push({
        id: uuidv4(),
        sessionId: `session-${uuidv4()}`,
        userId: `user-${randomInt(1000, 9999)}`,
        operationType: randomChoice(operationTypes),
        modelId: `model-${randomInt(1, 5)}`,
        personaId: `persona-${randomInt(1, 3)}`,
        input: JSON.stringify({ messages: [{ role: 'user', content: `测试输入 ${i}` }] }),
        output: isSuccess ? JSON.stringify({ content: `测试回复 ${i}`, role: 'assistant' }) : null,
        status: isSuccess ? 'success' : 'error',
        errorMessage: isSuccess ? null : 'AI服务调用失败',
        inputTokens: randomInt(10, 100),
        outputTokens: randomInt(20, 200),
        totalTokens: randomInt(30, 300),
        responseTime: randomInt(100, 3000),
        createdAt: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date())
      });
    }
    return result;
  },

  // AI模型使用统计
  aiModelUsage: () => {
    const models = ['gpt-3.5-turbo', 'gpt-4', 'claude-3', 'gemini-pro'];
    const providers = ['openai', 'anthropic', 'google'];
    const operationTypes = ['intent_recognition', 'service_reply', 'chat', 'test_chat'];

    const result = [];
    for (let i = 1; i <= config.aiLogCount; i++) {
      const isSuccess = randomChoice([true, true, true, false]);
      const modelIndex = randomInt(0, models.length - 1);
      result.push({
        organizationId: 'default',
        modelId: `model-${modelIndex + 1}`,
        providerId: `provider-${modelIndex + 1}`,
        sessionId: `session-${uuidv4()}`,
        operationType: randomChoice(operationTypes),
        inputTokens: randomInt(10, 100),
        outputTokens: isSuccess ? randomInt(20, 200) : 0,
        totalTokens: isSuccess ? randomInt(30, 300) : randomInt(10, 100),
        inputCost: (randomInt(10, 100) * 0.0001).toFixed(6),
        outputCost: isSuccess ? (randomInt(20, 200) * 0.0002).toFixed(6) : 0,
        totalCost: isSuccess ? (randomInt(30, 300) * 0.00015).toFixed(6) : (randomInt(10, 100) * 0.0001).toFixed(6),
        responseTime: randomInt(100, 3000),
        status: isSuccess ? 'success' : 'error',
        errorMessage: isSuccess ? null : 'AI服务调用失败',
        metadata: JSON.stringify({ model: models[modelIndex] }),
        createdAt: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date())
      });
    }
    return result;
  },

  // 工作人员活动数据
  staffActivities: () => {
    const actions = ['message', 'join_session', 'leave_session', 'takeover'];
    const statuses = ['active', 'inactive'];

    const result = [];
    for (let i = 1; i <= config.staffActivityCount; i++) {
      result.push({
        id: uuidv4(),
        sessionId: `session-${uuidv4()}`,
        staffUserId: `staff-${randomInt(1, 10)}`,
        staffUserName: `客服${randomInt(1, 10)}`,
        action: randomChoice(actions),
        metadata: JSON.stringify({ test: true }),
        status: randomChoice(statuses),
        activityTime: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
        createdAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
      });
    }
    return result;
  },

  // 执行追踪数据
  execution_tracking: () => {
    const statuses = ['completed', 'completed', 'completed', 'processing', 'failed'];
    const decisions = [
      { action: 'auto_reply' },
      { action: 'none' },
      { action: 'human_takeover' },
      { action: 'ai_reply' }
    ];

    const result = [];
    for (let i = 1; i <= config.executionCount; i++) {
      const status = randomChoice(statuses);
      result.push({
        id: uuidv4(),
        sessionId: `session-${uuidv4()}`,
        userId: `user-${randomInt(1000, 9999)}`,
        userName: `用户${randomInt(1, 100)}`,
        messageId: uuidv4(),
        content: `执行追踪消息 ${i}`,
        status,
        steps: JSON.stringify({ step1: 'completed', step2: status === 'completed' ? 'completed' : 'pending' }),
        decision: JSON.stringify(randomChoice(decisions)),
        processingTime: randomInt(100, 5000),
        error: status === 'failed' ? '处理失败' : null,
        errorStack: status === 'failed' ? 'Error: 处理失败' : null,
        startTime: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
        completedAt: status === 'completed' ? new Date() : null,
        createdAt: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date())
      });
    }
    return result;
  },

  // 系统日志数据
  systemLogs: () => {
    const levels = ['info', 'info', 'info', 'warning', 'error', 'debug'];
    const modules = ['api', 'ai', 'flow', 'monitor', 'staff', 'callback'];
    const messages = [
      '消息处理成功',
      'AI调用成功',
      '流程执行完成',
      '工作人员识别成功',
      '回调处理成功',
      '数据库查询成功',
      '缓存更新成功',
      '服务启动成功',
      '连接已建立',
      '会话创建成功'
    ];

    const result = [];
    for (let i = 1; i <= config.systemLogCount; i++) {
      const level = randomChoice(levels);
      result.push({
        id: uuidv4(),
        level,
        module: randomChoice(modules),
        message: level === 'error' ? `错误: ${randomInt(1, 999)}` : randomChoice(messages),
        metadata: JSON.stringify({ index: i, test: true }),
        timestamp: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
        createdAt: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date())
      });
    }
    return result;
  },

  // 流程定义数据
  flowDefinitions: () => {
    const result = [];
    const flowNames = ['客户服务流程', '风险处理流程', '营销转化流程'];

    for (let i = 0; i < flowNames.length; i++) {
      result.push({
        id: uuidv4(),
        name: flowNames[i],
        description: `这是${flowNames[i]}的完整定义`,
        triggerType: randomChoice(['message', 'event', 'schedule']),
        isActive: Math.random() > 0.2,
        nodes: JSON.stringify([
          { id: 'node1', type: 'start', name: '开始' },
          { id: 'node2', type: 'ai_process', name: 'AI处理' },
          { id: 'node3', type: 'decision', name: '决策' },
          { id: 'node4', type: 'end', name: '结束' }
        ]),
        edges: JSON.stringify([
          { from: 'node1', to: 'node2' },
          { from: 'node2', to: 'node3' },
          { from: 'node3', to: 'node4' }
        ]),
        variables: JSON.stringify({}),
        timeout: 30000,
        retryConfig: JSON.stringify({ maxRetries: 3, retryInterval: 1000 }),
        version: `1.0.${i + 1}`,
        createdBy: 'admin',
        createdAt: randomDate(new Date('2024-01-01'), new Date()),
        updatedAt: new Date()
      });
    }
    return result;
  }
};

/**
 * 清空测试数据
 */
async function clearTestData(db) {
  console.log('\n🗑️  清空测试数据...');

  const tables = [
    { table: systemLogs, name: '系统日志' },
    { table: execution_tracking, name: '执行追踪' },
    { table: staffActivities, name: '工作人员活动' },
    { table: aiModelUsage, name: 'AI模型使用' },
    { table: ai_io_logs, name: 'AI日志' },
    { table: alertHistory, name: '告警历史' },
    { table: callbackHistory, name: '回调历史' },
    { table: sessionMessages, name: '会话消息' },
    { table: sessions, name: '会话' },
    { table: flowInstances, name: '流程实例' },
    { table: flowDefinitions, name: '流程定义' }
  ];

  for (const { table, name } of tables) {
    try {
      await db.delete(table);
      console.log(`  ✅ 已清空 ${name}`);
    } catch (error) {
      console.log(`  ⚠️  清空 ${name} 失败: ${error.message}`);
    }
  }

  // 保留机器人数据，只更新测试数据
  console.log('  ℹ️  保留现有机器人数据');
}

/**
 * 插入测试数据
 */
async function insertTestData(db) {
  console.log('\n📊 插入测试数据...');

  let robotIds = [];
  try {
    // 获取或创建机器人
    const existingRobots = await db.select().from(robots).limit(10);
    if (existingRobots.length > 0) {
      robotIds = existingRobots.map(r => r.robotId);
      console.log(`  📦 使用现有机器人: ${robotIds.length}个`);
    } else {
      // 创建机器人数据
      const robotData = dataGenerators.robots();
      await db.insert(robots).values(robotData);
      robotIds = robotData.map(r => r.robotId);
      console.log(`  ✅ 机器人: ${robotData.length}个`);
    }
  } catch (error) {
    console.log(`  ⚠️  机器人数据处理失败: ${error.message}`);
  }

  // 插入流程定义
  try {
    const flowData = dataGenerators.flowDefinitions();
    await db.insert(flowDefinitions).values(flowData);
    console.log(`  ✅ 流程定义: ${flowData.length}个`);
  } catch (error) {
    console.log(`  ⚠️  流程定义插入失败: ${error.message}`);
  }

  // 插入会话数据
  let sessionData = [];
  try {
    sessionData = dataGenerators.sessions(robotIds);
    await db.insert(sessions).values(sessionData);
    console.log(`  ✅ 会话: ${sessionData.length}个`);
  } catch (error) {
    console.log(`  ⚠️  会话插入失败: ${error.message}`);
  }

  // 插入会话消息
  try {
    const messageData = dataGenerators.sessionMessages(sessionData);
    await db.insert(sessionMessages).values(messageData);
    console.log(`  ✅ 会话消息: ${messageData.length}条`);
  } catch (error) {
    console.log(`  ⚠️  会话消息插入失败: ${error.message}`);
  }

  // 插入回调历史
  try {
    const callbackData = dataGenerators.callbackHistory(robotIds);
    await db.insert(callbackHistory).values(callbackData);
    console.log(`  ✅ 回调历史: ${callbackData.length}条`);
  } catch (error) {
    console.log(`  ⚠️  回调历史插入失败: ${error.message}`);
  }

  // 插入告警历史
  try {
    const alertData = dataGenerators.alertHistory();
    await db.insert(alertHistory).values(alertData);
    console.log(`  ✅ 告警历史: ${alertData.length}条`);
  } catch (error) {
    console.log(`  ⚠️  告警历史插入失败: ${error.message}`);
  }

  // 插入AI日志
  try {
    const aiLogData = dataGenerators.ai_io_logs();
    await db.insert(ai_io_logs).values(aiLogData);
    console.log(`  ✅ AI日志: ${aiLogData.length}条`);
  } catch (error) {
    console.log(`  ⚠️  AI日志插入失败: ${error.message}`);
  }

  // 插入AI模型使用统计
  try {
    const modelUsageData = dataGenerators.aiModelUsage();
    await db.insert(aiModelUsage).values(modelUsageData);
    console.log(`  ✅ AI模型使用: ${modelUsageData.length}条`);
  } catch (error) {
    console.log(`  ⚠️  AI模型使用插入失败: ${error.message}`);
  }

  // 插入工作人员活动
  try {
    const staffData = dataGenerators.staffActivities();
    await db.insert(staffActivities).values(staffData);
    console.log(`  ✅ 工作人员活动: ${staffData.length}条`);
  } catch (error) {
    console.log(`  ⚠️  工作人员活动插入失败: ${error.message}`);
  }

  // 插入执行追踪
  try {
    const executionData = dataGenerators.execution_tracking();
    await db.insert(execution_tracking).values(executionData);
    console.log(`  ✅ 执行追踪: ${executionData.length}条`);
  } catch (error) {
    console.log(`  ⚠️  执行追踪插入失败: ${error.message}`);
  }

  // 插入系统日志
  try {
    const systemLogData = dataGenerators.systemLogs();
    await db.insert(systemLogs).values(systemLogData);
    console.log(`  ✅ 系统日志: ${systemLogData.length}条`);
  } catch (error) {
    console.log(`  ⚠️  系统日志插入失败: ${error.message}`);
  }
}

/**
 * 验证数据
 */
async function verifyData(db) {
  console.log('\n🔍 验证数据...');

  const tables = [
    { table: robots, name: '机器人' },
    { table: sessions, name: '会话' },
    { table: sessionMessages, name: '会话消息' },
    { table: callbackHistory, name: '回调历史' },
    { table: alertHistory, name: '告警历史' },
    { table: ai_io_logs, name: 'AI日志' },
    { table: aiModelUsage, name: 'AI模型使用' },
    { table: staffActivities, name: '工作人员活动' },
    { table: execution_tracking, name: '执行追踪' },
    { table: systemLogs, name: '系统日志' },
    { table: flowDefinitions, name: '流程定义' }
  ];

  for (const { table, name } of tables) {
    try {
      const result = await db.select().from(table).limit(1);
      const count = await db.select({ count: table }).from(table);
      console.log(`  ✅ ${name}: ${count.length}条`);
    } catch (error) {
      console.log(`  ❌ ${name}: 验证失败 - ${error.message}`);
    }
  }
}

/**
 * 生成数据统计报告
 */
function generateReport() {
  console.log('\n📈 数据统计报告');
  console.log('='.repeat(60));
  console.log(`机器人: ${config.robotCount}个`);
  console.log(`会话: ${config.sessionCount}个`);
  console.log(`会话消息: ~${config.sessionCount * ((config.messagePerSession.min + config.messagePerSession.max) / 2)}条`);
  console.log(`回调历史: ${config.callbackCount}条`);
  console.log(`告警历史: ${config.alertCount}条`);
  console.log(`AI日志: ${config.aiLogCount}条`);
  console.log(`AI模型使用: 4条`);
  console.log(`工作人员活动: ${config.staffActivityCount}条`);
  console.log(`执行追踪: ${config.executionCount}条`);
  console.log(`系统日志: ${config.systemLogCount}条`);
  console.log(`流程定义: ${config.flowDefinitionCount}个`);
  console.log('='.repeat(60));
  console.log('📋 总计: 约 250+ 条数据');
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║           WorkTool AI 数据模拟工具                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    // 初始化数据库连接
    const db = await getDb();
    console.log('✅ 数据库连接成功\n');

    // 清空测试数据
    await clearTestData(db);

    // 插入测试数据
    await insertTestData(db);

    // 验证数据
    await verifyData(db);

    // 生成报告
    generateReport();

    console.log('\n✅ 数据模拟完成！');
    console.log('💡 现在可以刷新监控面板查看数据了\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 数据模拟失败:', error);
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

module.exports = { dataGenerators, clearTestData, insertTestData };
