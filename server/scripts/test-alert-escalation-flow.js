/**
 * 测试告警处理流程执行
 * 验证告警规则判断、HTTP请求、任务分配等节点
 */

require('dotenv').config();

const { flowEngine, NodeType } = require('../services/flow-engine.service');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('TEST_ALERT_ESCALATION_FLOW');

// 测试触发数据 - P1级别告警
const p1AlertTriggerData = {
  alert: {
    id: 'alert-' + Date.now(),
    level: 'critical',
    type: 'system',
    message: '服务器CPU使用率超过95%',
    severity: 'P1',
    source: 'monitoring-system',
    timestamp: new Date().toISOString()
  },
  context: {
    alertLevel: 'P1',
    alertMessage: '服务器CPU使用率超过95%，需要立即处理'
  }
};

async function runTest() {
  console.log('========================================');
  console.log('告警处理流程测试开始');
  console.log('========================================\n');

  try {
    // 步骤1：获取告警处理流程定义
    console.log('步骤1：获取告警处理流程定义...');
    const db = await getDb();

    const flowDefs = await db
      .select()
      .from(flowDefinitions)
      .where(eq(flowDefinitions.id, 'flow_alert_escalation'))
      .limit(1);

    if (flowDefs.length === 0) {
      throw new Error('告警处理流程定义不存在');
    }

    const flowDef = flowDefs[0];
    console.log('✅ 流程定义获取成功');
    console.log('   ID:', flowDef.id);
    console.log('   名称:', flowDef.name);
    console.log('   描述:', flowDef.description);
    console.log('   触发类型:', flowDef.triggerType);
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
      p1AlertTriggerData,
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
    console.log('   测试场景: P1级别告警');
    console.log('   告警类型:', p1AlertTriggerData.alert.type);
    console.log('   告警消息:', p1AlertTriggerData.alert.message);
    console.log('   告警级别:', p1AlertTriggerData.context.alertLevel);
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
        if (log.outputData.alertLevel) {
          console.log(`       告警级别: ${log.outputData.alertLevel}`);
        }
        if (log.outputData.response) {
          console.log(`       HTTP响应: ${log.outputData.response.status} ${log.outputData.response.statusText}`);
        }
        if (log.outputData.task) {
          console.log(`       分配任务: ${log.outputData.task.name}`);
          console.log(`       任务ID: ${log.outputData.task.id}`);
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
    const alertRuleLog = logs.find(log => log.nodeType === 'alert_rule');
    const decisionLog = logs.find(log => log.nodeType === 'decision');
    const httpRequestLogs = logs.filter(log => log.nodeType === 'http_request');
    const taskAssignLog = logs.find(log => log.nodeType === 'task_assign');

    if (alertRuleLog) {
      console.log('   告警规则节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     判断结果: ${alertRuleLog.outputData?.shouldAlert ? '需要告警' : '无需告警'}`);
      console.log(`     最高等级: ${alertRuleLog.outputData?.highestLevel || 'N/A'}`);
    }

    if (decisionLog) {
      console.log('   决策节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     决策结果: ${decisionLog.outputData?.conditionResult || 'N/A'}`);
    }

    if (httpRequestLogs.length > 0) {
      console.log('   HTTP请求节点:');
      console.log(`     ✅ 已执行 (${httpRequestLogs.length}次)`);
      httpRequestLogs.forEach(log => {
        console.log(`     - ${log.nodeName}: ${log.outputData?.response?.status} ${log.outputData?.response?.statusText}`);
      });
    }

    if (taskAssignLog) {
      console.log('   任务分配节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     任务名称: ${taskAssignLog.outputData?.task?.name || 'N/A'}`);
      console.log(`     任务ID: ${taskAssignLog.outputData?.task?.id || 'N/A'}`);
    }

    console.log('\n');

    // 最终结论
    console.log('========================================');
    if (executedInstance.status === 'completed' && failedLogs.length === 0) {
      console.log('✅ 测试通过：告警处理流程执行成功');
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
