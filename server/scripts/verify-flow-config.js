/**
 * 验证流程定义中的节点配置
 */

const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');

async function verifyFlowDefinition() {
  try {
    const db = await getDb();

    // 查询流程定义
    const flows = await db
      .select()
      .from(flowDefinitions)
      .where(eq(flowDefinitions.name, '智能客服流程（全功能优化版）'))
      .limit(1);

    if (flows.length === 0) {
      console.error('未找到流程定义');
      return;
    }

    const flow = flows[0];
    console.log('流程信息:', {
      id: flow.id,
      name: flow.name,
      nodeCount: flow.nodes.length
    });

    // 查找 AI 回复节点
    const aiReplyNode = flow.nodes.find(n => n.type === 'ai_reply');
    if (!aiReplyNode) {
      console.error('未找到 AI 回复节点');
      return;
    }

    console.log('\nAI 回复节点信息:');
    console.log('  节点 ID:', aiReplyNode.id);
    console.log('  节点类型:', aiReplyNode.type);
    console.log('  data 字段 keys:', Object.keys(aiReplyData = aiReplyNode.data || {}));
    console.log('  config 字段 keys:', Object.keys(aiReplyNode.data?.config || {}));

    if (aiReplyNode.data?.config) {
      console.log('\n  配置详情:');
      console.log('    modelId:', aiReplyNode.data.config.modelId);
      console.log('    temperature:', aiReplyNode.data.config.temperature);
      console.log('    maxTokens:', aiReplyNode.data.config.maxTokens);
      console.log('    responseStyle:', aiReplyNode.data.config.responseStyle);
    } else {
      console.log('\n  ⚠️  警告: config 字段不存在');
    }

  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

verifyFlowDefinition()
  .then(() => {
    console.log('\n✓ 验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 验证执行失败:', error);
    process.exit(1);
  });
