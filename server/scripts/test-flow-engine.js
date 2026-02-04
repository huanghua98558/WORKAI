/**
 * 流程引擎功能测试脚本
 * 测试流程定义的创建、执行、日志查询等功能
 */

require('dotenv').config();

const { flowEngine, NodeType, FlowStatus, TriggerType } = require('../services/flow-engine.service');
const { getLogger } = require('../lib/logger');

const logger = getLogger('FLOW_ENGINE_TEST');

// 测试数据：创建一个简单的流程定义
const testFlowDefinition = {
  name: '测试流程-Webhook处理',
  description: '测试流程引擎的基础功能',
  version: '1.0',
  isActive: true,
  triggerType: TriggerType.WEBHOOK,
  triggerConfig: {
    robotId: 'test-robot-001'
  },
  nodes: [
    {
      id: 'node-start',
      type: NodeType.START,
      name: '开始节点',
      data: {}
    },
    {
      id: 'node-intent',
      type: NodeType.INTENT,
      name: '意图识别',
      data: {
        supportedIntents: ['service', 'help', 'chat']
      }
    },
    {
      id: 'node-condition',
      type: NodeType.CONDITION,
      name: '条件分支',
      data: {
        condition: 'intent == "service"'
      }
    },
    {
      id: 'node-ai-chat',
      type: NodeType.AI_CHAT,
      name: 'AI对话',
      data: {
        prompt: '请根据用户意图生成回复',
        model: 'mock-model',
        temperature: 0.7
      }
    },
    {
      id: 'node-end',
      type: NodeType.END,
      name: '结束节点',
      data: {}
    }
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-start',
      target: 'node-intent',
      sourceNode: { id: 'node-start', type: NodeType.START },
      targetNode: { id: 'node-intent', type: NodeType.INTENT }
    },
    {
      id: 'edge-2',
      source: 'node-intent',
      target: 'node-condition',
      sourceNode: { id: 'node-intent', type: NodeType.INTENT },
      targetNode: { id: 'node-condition', type: NodeType.CONDITION }
    },
    {
      id: 'edge-3',
      source: 'node-condition',
      target: 'node-ai-chat',
      condition: 'service',
      sourceNode: { id: 'node-condition', type: NodeType.CONDITION },
      targetNode: { id: 'node-ai-chat', type: NodeType.AI_CHAT }
    },
    {
      id: 'edge-4',
      source: 'node-ai-chat',
      target: 'node-end',
      sourceNode: { id: 'node-ai-chat', type: NodeType.AI_CHAT },
      targetNode: { id: 'node-end', type: NodeType.END }
    }
  ],
  variables: {
    defaultIntent: 'chat'
  },
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    retryInterval: 1000
  }
};

// 测试触发数据
const testTriggerData = {
  message: {
    messageId: 'test-message-001',
    spoken: '您好，我需要服务支持',
    fromName: '测试用户',
    groupName: '测试群'
  },
  robot: {
    robotId: 'test-robot-001',
    name: '测试机器人'
  },
  intent: 'service' // 手动设置意图，确保匹配到service分支
};

async function runTest() {
  console.log('========================================');
  console.log('流程引擎功能测试开始');
  console.log('========================================\n');

  try {
    // 步骤1：创建流程定义
    console.log('步骤1：创建流程定义...');
    const flowDef = await flowEngine.createFlowDefinition(testFlowDefinition);
    console.log('✅ 流程定义创建成功');
    console.log('   ID:', flowDef.id);
    console.log('   名称:', flowDef.name);
    console.log('   节点数量:', flowDef.nodes.length);
    console.log('   边数量:', flowDef.edges.length);
    console.log('');

    // 步骤2：查询流程定义
    console.log('步骤2：查询流程定义...');
    const retrievedFlowDef = await flowEngine.getFlowDefinition(flowDef.id);
    console.log('✅ 流程定义查询成功');
    console.log('   名称:', retrievedFlowDef.name);
    console.log('');

    // 步骤3：查询流程定义列表
    console.log('步骤3：查询流程定义列表...');
    const flowDefs = await flowEngine.listFlowDefinitions({ isActive: true });
    console.log('✅ 流程定义列表查询成功');
    console.log('   数量:', flowDefs.length);
    console.log('');

    // 步骤4：创建流程实例
    console.log('步骤4：创建流程实例...');
    const instance = await flowEngine.createFlowInstance(
      flowDef.id,
      testTriggerData,
      {
        test: true
      }
    );
    console.log('✅ 流程实例创建成功');
    console.log('   实例ID:', instance.id);
    console.log('   状态:', instance.status);
    console.log('   触发类型:', instance.triggerType);
    console.log('');

    // 步骤5：执行流程实例
    console.log('步骤5：执行流程实例...');
    console.log('   开始执行流程...');
    await flowEngine.executeFlow(instance.id);
    console.log('   流程执行完成');

    // 等待一下确保执行完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('');

    // 步骤6：查询流程实例
    console.log('步骤6：查询流程实例...');
    const executedInstance = await flowEngine.getFlowInstance(instance.id);
    console.log('✅ 流程实例查询成功');
    console.log('   状态:', executedInstance.status);
    console.log('   当前节点:', executedInstance.currentNodeId);
    console.log('   执行路径:', executedInstance.executionPath);
    console.log('   执行时间:', executedInstance.processingTime, 'ms');
    console.log('   结果:', JSON.stringify(executedInstance.result, null, 2));
    if (executedInstance.errorMessage) {
      console.log('   错误消息:', executedInstance.errorMessage);
    }
    if (executedInstance.errorStack) {
      console.log('   错误堆栈:', executedInstance.errorStack);
    }
    console.log('');

    // 步骤7：查询流程执行日志
    console.log('步骤7：查询流程执行日志...');
    const logs = await flowEngine.getFlowExecutionLogs({ flowInstanceId: instance.id });
    console.log('✅ 流程执行日志查询成功');
    console.log('   日志数量:', logs.length);
    logs.forEach((log, index) => {
      console.log(`   [${index + 1}] 节点: ${log.nodeName} (${log.nodeType})`);
      console.log(`       状态: ${log.status}`);
      console.log(`       执行时间: ${log.processingTime}ms`);
      if (log.status === 'failed') {
        console.log(`       错误: ${log.errorMessage}`);
      }
    });
    console.log('');

    // 步骤8：查询流程实例列表
    console.log('步骤8：查询流程实例列表...');
    const instances = await flowEngine.listFlowInstances({ flowDefinitionId: flowDef.id });
    console.log('✅ 流程实例列表查询成功');
    console.log('   数量:', instances.length);
    console.log('');

    // 测试结果
    console.log('========================================');
    console.log('流程引擎功能测试完成');
    console.log('========================================');
    console.log('');
    console.log('测试结果:');
    console.log('  ✅ 流程定义创建: 成功');
    console.log('  ✅ 流程定义查询: 成功');
    console.log('  ✅ 流程定义列表查询: 成功');
    console.log('  ✅ 流程实例创建: 成功');
    console.log('  ✅ 流程实例执行: ' + (executedInstance.status === FlowStatus.COMPLETED ? '成功' : '失败'));
    console.log('  ✅ 流程实例查询: 成功');
    console.log('  ✅ 流程执行日志查询: 成功');
    console.log('  ✅ 流程实例列表查询: 成功');
    console.log('');

    // 测试节点类型
    console.log('节点类型:');
    Object.entries(NodeType).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    console.log('');

    // 测试流程状态
    console.log('流程状态:');
    Object.entries(FlowStatus).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    console.log('');

    // 测试触发类型
    console.log('触发类型:');
    Object.entries(TriggerType).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    console.log('');

    console.log('========================================');
    console.log('所有测试完成！');
    console.log('========================================');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error.stack);
    process.exit(1);
  }
}

// 运行测试
runTest();
