/**
 * 最终汇总测试 - 验证所有6个默认流程
 */

require('dotenv').config();

const { flowEngine } = require('../services/flow-engine.service');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');

const ALL_FLOWS = [
  { id: 'flow_standard_customer_service', name: '标准客服流程' },
  { id: 'flow_risk_monitoring', name: '风险监控流程' },
  { id: 'flow_alert_escalation', name: '告警处理流程' },
  { id: 'flow_group_collaboration', name: '群组协作流程' },
  { id: 'flow_data_sync', name: '数据同步流程' },
  { id: 'flow_satisfaction_survey', name: '满意度调查流程' }
];

async function testFlow(flowInfo) {
  console.log(`\n测试: ${flowInfo.name}`);
  console.log('='.repeat(50));

  try {
    const db = await getDb();
    const flowDefs = await db
      .select()
      .from(flowDefinitions)
      .where(eq(flowDefinitions.id, flowInfo.id))
      .limit(1);

    if (flowDefs.length === 0) {
      console.log(`❌ 流程不存在`);
      return { success: false, error: '流程不存在' };
    }

    const flowDef = flowDefs[0];
    console.log(`✅ 流程存在`);
    console.log(`   节点数: ${flowDef.nodes.length}`);
    console.log(`   边数: ${flowDef.edges.length}`);

    // 创建实例
    const instance = await flowEngine.createFlowInstance(flowDef.id, {
      message: { content: '测试消息' },
      test: true
    });

    console.log(`✅ 实例创建`);

    // 执行流程
    await flowEngine.executeFlow(instance.id);

    // 查询结果
    const executedInstance = await flowEngine.getFlowInstance(instance.id);

    // 查询日志
    const logs = await flowEngine.getFlowExecutionLogs({
      flowInstanceId: instance.id
    });

    const completed = logs.filter(l => l.status === 'completed').length;
    const failed = logs.filter(l => l.status === 'failed').length;

    console.log(`   状态: ${executedInstance.status}`);
    console.log(`   成功节点: ${completed}`);
    console.log(`   失败节点: ${failed}`);

    if (executedInstance.status === 'completed' && failed === 0) {
      console.log(`✅ 测试通过`);
      return { success: true, completed, failed };
    } else {
      console.log(`❌ 测试失败`);
      if (executedInstance.errorMessage) {
        console.log(`   错误: ${executedInstance.errorMessage}`);
      }
      return { success: false, completed, failed, error: executedInstance.errorMessage };
    }
  } catch (error) {
    console.log(`❌ 测试异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('========================================');
  console.log('最终汇总测试 - 所有6个流程');
  console.log('========================================');

  const results = [];

  for (const flow of ALL_FLOWS) {
    const result = await testFlow(flow);
    results.push({ ...flow, ...result });

    // 等待一下再测试下一个
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 汇总结果
  console.log('\n\n========================================');
  console.log('最终测试汇总');
  console.log('========================================\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('流程测试结果:');
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.name} (${result.id})`);
    if (result.success) {
      console.log(`   成功节点: ${result.completed}`);
    } else if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });

  console.log(`\n总体统计:`);
  console.log(`   总流程数: ${results.length}`);
  console.log(`   通过: ${passed} (${(passed / results.length * 100).toFixed(1)}%)`);
  console.log(`   失败: ${failed} (${(failed / results.length * 100).toFixed(1)}%)`);

  console.log('\n========================================');
  if (failed === 0) {
    console.log('🎉 所有流程测试通过！');
  } else {
    console.log(`⚠️  有 ${failed} 个流程测试失败`);
  }
  console.log('========================================');

  process.exit(failed > 0 ? 1 : 0);
}

main();
