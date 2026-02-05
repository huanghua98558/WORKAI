/**
 * 测试标准客服流程执行
 * 验证新实现的节点处理器
 */

require('dotenv').config();

const { flowEngine, NodeType } = require('../services/flow-engine.service');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('TEST_STANDARD_FLOW');

// 测试触发数据
const testTriggerData = {
  message: {
    messageId: 'test-message-' + Date.now(),
    spoken: '您好，我想咨询一下产品价格',
    fromName: '测试用户',
    senderType: 'user',
    messageType: 'text'
  },
  robot: {
    robotId: 'test-robot-001',
    name: '测试机器人'
  },
  user: {
    userId: 'test-user-001',
    userName: '测试用户',
    email: 'test@example.com'
  },
  context: {
    intent: '咨询',
    needReply: true,
    riskLevel: 1
  }
};

async function runTest() {
  console.log('========================================');
  console.log('标准客服流程测试开始');
  console.log('========================================\n');

  try {
    // 步骤1：获取标准客服流程定义
    console.log('步骤1：获取标准客服流程定义...');
    const db = await getDb();

    const flowDefs = await db
      .select()
      .from(flowDefinitions)
      .where(eq(flowDefinitions.id, 'flow_standard_customer_service'))
      .limit(1);

    if (flowDefs.length === 0) {
      throw new Error('标准客服流程定义不存在');
    }

    const flowDef = flowDefs[0];
    console.log('✅ 流程定义获取成功');
    console.log('   ID:', flowDef.id);
    console.log('   名称:', flowDef.name);
    console.log('   描述:', flowDef.description);
    console.log('   节点数量:', flowDef.nodes.length);
    console.log('   边数量:', flowDef.edges.length);

    // 打印节点列表
    console.log('\n   节点列表:');
    flowDef.nodes.forEach((node, index) => {
      console.log(`     [${index + 1}] ${node.id}: ${node.type} - ${node.data.name}`);
    });
    console.log('');

    // 步骤2：创建流程实例
    console.log('步骤2：创建流程实例...');
    const instance = await flowEngine.createFlowInstance(
      flowDef.id,
      testTriggerData,
      {
        test: true,
        testRun: true
      }
    );
    console.log('✅ 流程实例创建成功');
    console.log('   实例ID:', instance.id);
    console.log('   状态:', instance.status);
    console.log('   触发类型:', instance.triggerType);
    console.log('');

    // 步骤3：执行流程实例
    console.log('步骤3：执行流程实例...');
    console.log('   开始执行流程...');

    const startTime = Date.now();
    await flowEngine.executeFlow(instance.id);
    const executionTime = Date.now() - startTime;

    console.log(`   流程执行完成 (耗时: ${executionTime}ms)`);
    console.log('');

    // 等待一下确保所有日志写入
    await new Promise(resolve => setTimeout(resolve, 500));

    // 步骤4：查询流程实例结果
    console.log('步骤4：查询流程实例结果...');
    const executedInstance = await flowEngine.getFlowInstance(instance.id);
    console.log('✅ 流程实例查询成功');
    console.log('   最终状态:', executedInstance.status);
    console.log('   当前节点:', executedInstance.currentNodeId);
    console.log('   执行路径:', executedInstance.executionPath ? executedInstance.executionPath.join(' -> ') : 'N/A');
    console.log('   执行时间:', executedInstance.processingTime, 'ms');

    if (executedInstance.errorMessage) {
      console.log('\n   ❌ 错误消息:');
      console.log('      ', executedInstance.errorMessage);
      if (executedInstance.errorStack) {
        console.log('   错误堆栈:');
        console.log('      ', executedInstance.errorStack.split('\n').join('\n      '));
      }
    } else {
      console.log('   ✅ 流程执行成功，无错误');
    }

    console.log('');

    // 步骤5：查询流程执行日志
    console.log('步骤5：查询流程执行日志...');
    const logs = await flowEngine.getFlowExecutionLogs({ flowInstanceId: instance.id });
    console.log('✅ 流程执行日志查询成功');
    console.log('   日志数量:', logs.length);

    logs.forEach((log, index) => {
      const statusIcon = log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '⏳';
      console.log(`\n   [${index + 1}] ${statusIcon} ${log.nodeName} (${log.nodeType})`);
      console.log(`       节点ID: ${log.nodeId}`);
      console.log(`       状态: ${log.status}`);
      console.log(`       执行时间: ${log.processingTime}ms`);
      console.log(`       开始时间: ${log.startedAt}`);
      console.log(`       完成时间: ${log.completedAt || '未完成'}`);

      if (log.errorMessage) {
        console.log(`       ❌ 错误: ${log.errorMessage}`);
      }

      // 打印输入数据（前200字符）
      if (log.inputData) {
        const inputDataStr = JSON.stringify(log.inputData);
        console.log(`       输入数据: ${inputDataStr.length > 200 ? inputDataStr.substring(0, 200) + '...' : inputDataStr}`);
      }

      // 打印输出数据（前200字符）
      if (log.outputData) {
        const outputDataStr = JSON.stringify(log.outputData);
        console.log(`       输出数据: ${outputDataStr.length > 200 ? outputDataStr.substring(0, 200) + '...' : outputDataStr}`);
      }
    });

    console.log('\n');

    // 步骤6：统计结果
    console.log('步骤6：统计结果...');
    const completedLogs = logs.filter(log => log.status === 'completed');
    const failedLogs = logs.filter(log => log.status === 'failed');
    const runningLogs = logs.filter(log => log.status === 'running');

    console.log('   ✅ 成功节点:', completedLogs.length);
    console.log('   ❌ 失败节点:', failedLogs.length);
    console.log('   ⏳ 运行中节点:', runningLogs.length);
    console.log('');

    // 步骤7：验证新节点处理器
    console.log('步骤7：验证新实现的节点处理器...');
    const newNodeTypes = [
      'message_receive',
      'session_create',
      'emotion_analyze',
      'decision',
      'ai_reply',
      'message_dispatch',
      'send_command',
      'staff_intervention',
      'alert_save'
    ];

    const executedNodeTypes = logs.map(log => log.nodeType);

    console.log('   新节点处理器验证:');
    newNodeTypes.forEach(nodeType => {
      const isExecuted = executedNodeTypes.includes(nodeType);
      const icon = isExecuted ? '✅' : '⏭️';
      console.log(`     ${icon} ${nodeType}: ${isExecuted ? '已执行' : '未执行（流程未使用此节点）'}`);
    });

    console.log('\n');

    // 最终结论
    console.log('========================================');
    if (executedInstance.status === 'completed' && failedLogs.length === 0) {
      console.log('✅ 测试通过：流程执行成功');
      console.log('========================================');
      process.exit(0);
    } else if (executedInstance.status === 'failed') {
      console.log('❌ 测试失败：流程执行失败');
      console.log('========================================');
      process.exit(1);
    } else {
      console.log('⚠️  测试警告：流程状态异常');
      console.log('========================================');
      process.exit(2);
    }
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ 测试异常');
    console.error('========================================');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行测试
runTest();
