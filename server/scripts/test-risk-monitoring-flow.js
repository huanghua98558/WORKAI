/**
 * 测试风险监控流程执行
 * 验证风险检测、告警通知等节点
 */

require('dotenv').config();

const { flowEngine, NodeType } = require('../services/flow-engine.service');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('TEST_RISK_MONITORING_FLOW');

// 测试触发数据 - 模拟检测到高风险内容
const highRiskTriggerData = {
  message: {
    messageId: 'test-risk-' + Date.now(),
    spoken: '这个产品简直是骗子，我要投诉你们公司，退还我的钱！',
    fromName: '愤怒客户',
    senderType: 'user',
    messageType: 'text'
  },
  monitor: {
    monitorType: 'group',
    timeRange: '5m',
    keywords: ['投诉', '骗子', '差评', '退款', '欺诈'],
    excludeKeywords: ['好的', '谢谢', '满意']
  },
  context: {
    complaintCount: 5, // 高频投诉
    messageFrequency: 12, // 异常高频
    repeatCount: 4 // 重复次数
  }
};

async function runTest() {
  console.log('========================================');
  console.log('风险监控流程测试开始');
  console.log('========================================\n');

  try {
    // 步骤1：获取风险监控流程定义
    console.log('步骤1：获取风险监控流程定义...');
    const db = await getDb();

    const flowDefs = await db
      .select()
      .from(flowDefinitions)
      .where(eq(flowDefinitions.id, 'flow_risk_monitoring'))
      .limit(1);

    if (flowDefs.length === 0) {
      throw new Error('风险监控流程定义不存在');
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
      highRiskTriggerData,
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
    console.log('   测试场景: 高风险内容检测');
    console.log('   消息内容: ' + highRiskTriggerData.message.spoken.substring(0, 30) + '...');
    console.log('   投诉次数:', highRiskTriggerData.context.complaintCount);
    console.log('   消息频率:', highRiskTriggerData.context.messageFrequency);
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
        if (log.outputData.riskLevel !== undefined) {
          console.log(`       风险等级: ${log.outputData.riskLevel}`);
        }
        if (log.outputData.matchedRules) {
          console.log(`       匹配规则: ${log.outputData.matchedRules.map(r => r.ruleName).join(', ')}`);
        }
        if (log.outputData.notifications) {
          console.log(`       通知发送: ${log.outputData.notifications.length}条`);
        }
        if (log.outputData.escalation) {
          console.log(`       升级结果: ${log.outputData.escalation.shouldEscalate ? '需要升级' : '无需升级'}`);
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
    const riskDetectLog = logs.find(log => log.nodeType === 'risk_detect');
    const decisionLog = logs.find(log => log.nodeType === 'decision');
    const alertSaveLog = logs.find(log => log.nodeType === 'alert_save');
    const alertNotifyLog = logs.find(log => log.nodeType === 'alert_notify');

    if (riskDetectLog) {
      console.log('   风险检测节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     检测到的风险等级: ${riskDetectLog.outputData?.riskLevel || 'N/A'}`);
      console.log(`     匹配的规则数: ${riskDetectLog.outputData?.matchedRules?.length || 0}`);
    }

    if (decisionLog) {
      console.log('   决策节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     决策结果: ${decisionLog.outputData?.conditionResult || 'N/A'}`);
    }

    if (alertSaveLog) {
      console.log('   告警入库节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     告警等级: ${alertSaveLog.outputData?.alert?.level || 'N/A'}`);
    }

    if (alertNotifyLog) {
      console.log('   告警通知节点:');
      console.log(`     ✅ 已执行`);
      console.log(`     通知渠道数: ${alertNotifyLog.outputData?.notifications?.length || 0}`);
    }

    console.log('\n');

    // 最终结论
    console.log('========================================');
    if (executedInstance.status === 'completed' && failedLogs.length === 0) {
      console.log('✅ 测试通过：风险监控流程执行成功');
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
