/**
 * 简化版流程测试脚本 - 测试所有节点处理器
 */

require('dotenv').config();

const { flowEngine } = require('../services/flow-engine.service');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');

const TEST_FLOWS = [
  'flow_group_collaboration',
  'flow_data_sync',
  'flow_satisfaction_survey'
];

async function testFlow(flowId) {
  console.log(`\n测试流程: ${flowId}`);
  console.log('='.repeat(50));

  try {
    const db = await getDb();
    const flowDefs = await db
      .select()
      .from(flowDefinitions)
      .where(eq(flowDefinitions.id, flowId))
      .limit(1);

    if (flowDefs.length === 0) {
      console.log(`❌ 流程不存在`);
      return { success: false, error: '流程不存在' };
    }

    const flowDef = flowDefs[0];
    console.log(`✅ 流程存在: ${flowDef.name}`);
    console.log(`   节点数: ${flowDef.nodes.length}`);
    console.log(`   边数: ${flowDef.edges.length}`);

    // 打印节点类型
    const nodeTypes = [...new Set(flowDef.nodes.map(n => n.type))];
    console.log(`   节点类型: ${nodeTypes.join(', ')}`);

    // 创建实例
    const instance = await flowEngine.createFlowInstance(flowDef.id, {
      message: { content: '测试消息' },
      test: true
    });

    console.log(`✅ 实例创建: ${instance.id}`);

    // 执行流程
    await flowEngine.executeFlow(instance.id);

    // 查询结果
    const executedInstance = await flowEngine.getFlowInstance(instance.id);

    console.log(`✅ 执行状态: ${executedInstance.status}`);

    // 查询日志
    const logs = await flowEngine.getFlowExecutionLogs({
      flowInstanceId: instance.id
    });

    const completed = logs.filter(l => l.status === 'completed').length;
    const failed = logs.filter(l => l.status === 'failed').length;

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
  console.log('批量测试剩余流程');
  console.log('========================================');

  const results = [];

  for (const flowId of TEST_FLOWS) {
    const result = await testFlow(flowId);
    results.push({ flowId, ...result });

    // 等待一下再测试下一个
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 汇总结果
  console.log('\n\n========================================');
  console.log('测试汇总');
  console.log('========================================\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.flowId}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });

  console.log(`\n总计: ${results.length}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
