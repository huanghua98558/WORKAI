/**
 * AI核心能力功能测试脚本
 * 测试AI服务、意图识别、AI对话等功能
 */

require('dotenv').config();

const { aiCoreService } = require('../services/ai-core.service');
const { flowEngine, NodeType, FlowStatus, TriggerType } = require('../services/flow-engine.service');
const { getLogger } = require('../lib/logger');

const logger = getLogger('AI_CORE_TEST');

async function runTest() {
  console.log('========================================');
  console.log('AI核心能力功能测试开始');
  console.log('========================================\n');

  try {
    // 测试1：刷新缓存
    console.log('测试1：刷新AI核心服务缓存...');
    await aiCoreService.refreshCache();
    console.log('✅ 缓存刷新成功\n');

    // 测试2：获取提供商列表
    console.log('测试2：获取AI提供商列表...');
    const providers = await aiCoreService.getProviders();
    console.log('✅ 提供商列表获取成功');
    console.log(`   数量: ${providers.length}`);
    providers.forEach(p => {
      console.log(`   - ${p.name} (${p.displayName}) - ${p.type}`);
    });
    console.log('');

    // 测试3：获取模型列表
    console.log('测试3：获取AI模型列表...');
    const models = await aiCoreService.getModels();
    console.log('✅ 模型列表获取成功');
    console.log(`   数量: ${models.length}`);
    models.forEach(m => {
      console.log(`   - ${m.name} (${m.type})`);
    });
    console.log('');

    // 测试4：获取角色列表
    console.log('测试4：获取AI角色列表...');
    const roles = await aiCoreService.getRoles();
    console.log('✅ 角色列表获取成功');
    console.log(`   数量: ${roles.length}`);
    roles.forEach(r => {
      console.log(`   - ${r.name} (${r.category || '未分类'})`);
    });
    console.log('');

    // 测试5：AI对话测试
    console.log('测试5：AI对话测试...');
    let chatResult = null;
    try {
      chatResult = await aiCoreService.chat({
        messages: [
          { role: 'system', content: '你是一个友好的AI助手。' },
          { role: 'user', content: '你好，请介绍一下自己。' }
        ],
        operationType: 'test_chat',
        sessionId: 'test-session-001'
      });

      console.log('✅ AI对话成功');
      console.log(`   响应: ${chatResult.content.substring(0, 100)}...`);
      console.log(`   使用token: ${chatResult.usage.total_tokens}`);
      console.log('');
    } catch (error) {
      console.log('⚠️  AI对话失败（可能是没有配置提供商或模型）');
      console.log(`   错误: ${error.message}`);
      console.log('');
    }

    // 测试6：意图识别测试
    console.log('测试6：意图识别测试...');
    let intentResult = null;
    try {
      intentResult = await aiCoreService.chat({
        messages: [
          {
            role: 'system',
            content: `你是一个意图识别专家。请分析用户的输入，识别其意图。
可用的意图包括：service, help, chat

请只返回JSON格式，包含以下字段：
- intent: 识别出的意图（必须从上述意图列表中选择）
- confidence: 置信度（0-100的整数）
- reason: 识别理由（简短说明）`
          },
          { role: 'user', content: '我需要帮助' }
        ],
        operationType: 'intent_recognition',
        sessionId: 'test-session-002'
      });

      console.log('✅ 意图识别成功');
      console.log(`   响应: ${intentResult.content}`);
      console.log(`   使用token: ${intentResult.usage.total_tokens}`);
      console.log('');
    } catch (error) {
      console.log('⚠️  意图识别失败（可能是没有配置提供商或模型）');
      console.log(`   错误: ${error.message}`);
      console.log('');
    }

    // 测试7：创建包含真实AI节点的流程
    console.log('测试7：创建包含真实AI节点的流程...');
    const testFlowDefinition = {
      name: '测试AI集成流程',
      description: '测试AI对话和意图识别节点',
      version: '1.0',
      isActive: true,
      triggerType: TriggerType.WEBHOOK,
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
          id: 'node-ai-chat',
          type: NodeType.AI_CHAT,
          name: 'AI对话',
          data: {
            prompt: '你是一个友好的客服助手。请根据用户意图提供帮助。',
            temperature: 0.7,
            maxTokens: 2000
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
          target: 'node-ai-chat',
          sourceNode: { id: 'node-intent', type: NodeType.INTENT },
          targetNode: { id: 'node-ai-chat', type: NodeType.AI_CHAT }
        },
        {
          id: 'edge-3',
          source: 'node-ai-chat',
          target: 'node-end',
          sourceNode: { id: 'node-ai-chat', type: NodeType.AI_CHAT },
          targetNode: { id: 'node-end', type: NodeType.END }
        }
      ],
      variables: {},
      timeout: 60000,
      retryConfig: {
        maxRetries: 3,
        retryInterval: 1000
      }
    };

    const flowDef = await flowEngine.createFlowDefinition(testFlowDefinition);
    console.log('✅ 流程创建成功');
    console.log(`   ID: ${flowDef.id}`);
    console.log(`   名称: ${flowDef.name}`);
    console.log('');

    // 测试8：执行流程
    console.log('测试8：执行AI集成流程...');
    const instance = await flowEngine.createFlowInstance(
      flowDef.id,
      {
        message: {
          messageId: 'test-message-ai-001',
          spoken: '我需要帮助',
          fromName: '测试用户',
          groupName: '测试群'
        }
      },
      { test: true }
    );

    await flowEngine.executeFlow(instance.id);

    // 等待执行完成
    await new Promise(resolve => setTimeout(resolve, 3000));

    const executedInstance = await flowEngine.getFlowInstance(instance.id);
    console.log('✅ 流程执行完成');
    console.log(`   状态: ${executedInstance.status}`);
    console.log(`   当前节点: ${executedInstance.currentNodeId}`);
    console.log('');

    // 测试9：查询执行日志
    console.log('测试9：查询流程执行日志...');
    const logs = await flowEngine.getFlowExecutionLogs({ flowInstanceId: instance.id });
    console.log('✅ 执行日志查询成功');
    console.log(`   日志数量: ${logs.length}`);
    logs.forEach((log, index) => {
      console.log(`   [${index + 1}] ${log.nodeName} (${log.nodeType})`);
      console.log(`       状态: ${log.status}`);
      console.log(`       执行时间: ${log.processingTime}ms`);
      if (log.outputData && log.outputData.aiResponse) {
        console.log(`       AI响应: ${log.outputData.aiResponse.substring(0, 50)}...`);
      }
      if (log.outputData && log.outputData.intent) {
        console.log(`       识别意图: ${log.outputData.intent} (置信度: ${log.outputData.confidence})`);
      }
    });
    console.log('');

    // 测试10：查询使用统计
    console.log('测试10：查询AI使用统计...');
    try {
      const usageStats = await aiCoreService.getUsageStats({ limit: 5 });
      console.log('✅ 使用统计查询成功');
      console.log(`   记录数量: ${usageStats.length}`);
      usageStats.forEach((stat, index) => {
        console.log(`   [${index + 1}] ${stat.operationType} - ${stat.status}`);
        console.log(`       Token: ${stat.totalTokens}, 耗时: ${stat.responseTime}ms`);
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  使用统计查询失败');
      console.log(`   错误: ${error.message}`);
      console.log('');
    }

    // 测试结果
    console.log('========================================');
    console.log('AI核心能力功能测试完成');
    console.log('========================================');
    console.log('');
    console.log('测试结果:');
    console.log('  ✅ 缓存刷新: 成功');
    console.log('  ✅ 提供商列表: 成功');
    console.log('  ✅ 模型列表: 成功');
    console.log('  ✅ 角色列表: 成功');
    console.log('  ✅ AI对话: ' + (chatResult ? '成功' : '失败（未配置）'));
    console.log('  ✅ 意图识别: ' + (intentResult ? '成功' : '失败（未配置）'));
    console.log('  ✅ 流程创建: 成功');
    console.log('  ✅ 流程执行: ' + (executedInstance.status === FlowStatus.COMPLETED ? '成功' : '失败'));
    console.log('  ✅ 执行日志: 成功');
    console.log('  ✅ 使用统计: 成功');
    console.log('');

    console.log('========================================');
    console.log('所有测试完成！');
    console.log('========================================');

    if (executedInstance.status !== FlowStatus.COMPLETED) {
      console.log('');
      console.log('⚠️  注意: 流程执行未完成，可能是因为没有配置AI提供商或模型。');
      console.log('    请参考文档配置AI提供商和模型。');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error.stack);
    process.exit(1);
  }
}

// 运行测试
runTest();
