/**
 * 测试群组协作流程执行
 * 验证多机器人协同、消息分发等节点
 */

require('dotenv').config();

const { flowEngine } = require('../services/flow-engine.service');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('TEST_GROUP_COLLABORATION_FLOW');

// 测试触发数据 - VIP群消息
const vipGroupTriggerData = {
  message: {
    messageId: 'test-vip-' + Date.now(),
    content: 'VIP客户咨询产品问题',
    senderType: 'user',
    messageType: 'text',
    fromName: 'VIP客户'
  },
  group: {
    groupId: 'group_vip_001',
    groupName: 'VIP客户群',
    groupType: 'vip'
  },
  context: {
    groupType: 'vip'
  }
};

async function runTest() {
  console.log('========================================');
  console.log('群组协作流程测试开始');
  console.log('========================================\n');

  try {
    // 步骤1：获取群组协作流程定义
    console.log('步骤1：获取群组协作流程定义...');
    const db = await getDb();

    const flowDefs = await db
      .select()
      .from(flowDefinitions)
      .where(eq(flowDefinitions.id, 'flow_group_collaboration'))
      .limit(1);

    if (flowDefs.length === 0) {
      throw new Error('群组协作流程定义不存在');
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
      vipGroupTriggerData,
      {
        test: true,
        testRun: true
      }
    );
    console.log('✅ 流程实例创建成功');
    console.log('   实例ID:', instance.id);
    console.log('   状态:', instance.status);
    console.log('');

    // 步骤3：执行流程实例
    console.log('步骤3：执行流程实例...');
    console.log('   测试场景: VIP群消息处理');
    console.log('   群组类型:', vipGroupTriggerData.group.groupType);
    console.log('   消息内容:', vipGroupTriggerData.message.content);
    console.log('   开始执行流程...\n');

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

      if (log.errorMessage) {
        console.log(`       ❌ 错误: ${log.errorMessage}`);
      }

      // 打印关键输出数据
      if (log.outputData) {
        if (log.outputData.dispatch) {
          console.log(`       分配机器人: ${log.outputData.dispatch.robotId}`);
        }
        if (log.outputData.sync) {
          console.log(`       汇总消息数: ${log.outputData.sync.totalMessages}`);
        }
        if (log.outputData.transform) {
          console.log(`       转换规则数: ${log.outputData.transform.rulesApplied}`);
        }
      }
    });

    console.log('\n');

    // 步骤6：统计结果
    console.log('步骤6：统计结果...');
    const completedLogs = logs.filter(log => log.status === 'completed');
    const failedLogs = logs.filter(log => log.status === 'failed');

    console.log('   ✅ 成功节点:', completedLogs.length);
    console.log('   ❌ 失败节点:', failedLogs.length);
    console.log('');

    // 步骤7：验证关键节点
    console.log('步骤7：验证关键功能点...');
    const messageReceiveLog = logs.find(log => log.nodeType === 'message_receive');
    const decisionLog = logs.find(log => log.nodeType === 'decision');
    const robotDispatchLog = logs.find(log => log.nodeType === 'robot_dispatch');
    const intentLog = logs.find(log => log.nodeType === 'intent');
    const aiReplyLog = logs.find(log => log.nodeType === 'ai_reply');
    const messageSyncLog = logs.find(log => log.nodeType === 'message_sync');
    const dataTransformLog = logs.find(log => log.nodeType === 'data_transform');

    if (messageReceiveLog) {
      console.log('   消息接收节点:');
      console.log(`     ✅ 已执行`);
    }

    if (decisionLog) {
      console.log('   决策节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     决策结果: ${decisionLog.outputData?.conditionResult || 'N/A'}`);
    }

    if (robotDispatchLog) {
      console.log('   机器人分发节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     分配机器人: ${robotDispatchLog.outputData?.dispatch?.robotId || 'N/A'}`);
    }

    if (intentLog) {
      console.log('   意图识别节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     意图: ${intentLog.outputData?.intent || 'N/A'}`);
    }

    if (aiReplyLog) {
      console.log('   AI回复节点:');
      console.log(`     ✅ 已执行`);
    }

    if (messageSyncLog) {
      console.log('   消息汇总节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     消息数: ${messageSyncLog.outputData?.sync?.totalMessages || 0}`);
    }

    if (dataTransformLog) {
      console.log('   数据转换节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     转换规则数: ${dataTransformLog.outputData?.transform?.rulesApplied || 0}`);
    }

    console.log('\n');

    // 最终结论
    console.log('========================================');
    if (executedInstance.status === 'completed' && failedLogs.length === 0) {
      console.log('✅ 测试通过：群组协作流程执行成功');
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
