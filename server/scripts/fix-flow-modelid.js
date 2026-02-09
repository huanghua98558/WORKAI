/**
 * 修复流程定义中的 AI 回复节点 modelId 配置
 * 将模型名称（如 doubao-pro-4k-intent）转换为模型 UUID
 */

const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions, aiModels } = require('../database/schema');
const { eq } = require('drizzle-orm');

// 模型名称到 UUID 的映射
const modelNameToIdMap = {
  'doubao-pro-4k-intent': 'fca0b587-3e1f-447f-b9f9-8d8ca7c2314b',
  'doubao-pro-32k-reply': '1c90fa36-8ee0-42d8-8316-42bdd2ffde84',
  'doubao-pro-32k-general': '1ddd764b-33f3-44c4-afe7-a4da981cfe0a',
  'deepseek-r1-tech': '19b435d9-cd5e-45c2-a38a-96f88c911f86',
  'kimi-k2-report': 'a7b13997-12a1-4bdc-b703-83e667dd8c81',
  'deepseek-v3-conversion': '26d40853-4c10-4d98-824a-6f85b34ca6cc',
};

async function updateFlowDefinitions() {
  try {
    const db = await getDb();

    // 1. 查询所有流程定义
    const flows = await db.select().from(flowDefinitions);

    console.log(`找到 ${flows.length} 个流程定义`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const flow of flows) {
      const { id, name, nodes } = flow;

      // 检查是否有需要更新的节点
      let hasChanges = false;
      const updatedNodes = nodes.map(node => {
        if (node.data && node.data.config && node.data.config.modelId) {
          const modelId = node.data.config.modelId;
          const resolvedModelId = modelNameToIdMap[modelId];

          if (resolvedModelId && modelId !== resolvedModelId) {
            console.log(`\n流程: ${name}`);
            console.log(`  节点: ${node.data.name || node.type}`);
            console.log(`  更新 modelId: ${modelId} -> ${resolvedModelId}`);
            hasChanges = true;
            return {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  modelId: resolvedModelId,
                }
              }
            };
          }
        }
        return node;
      });

      // 如果有变化，更新数据库
      if (hasChanges) {
        await db.update(flowDefinitions)
          .set({ nodes: updatedNodes, updatedAt: new Date() })
          .where(eq(flowDefinitions.id, id));

        console.log(`✓ 已更新流程: ${name}`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n========== 更新完成 ==========`);
    console.log(`总计流程: ${flows.length}`);
    console.log(`已更新: ${updatedCount}`);
    console.log(`跳过: ${skippedCount}`);

  } catch (error) {
    console.error('更新流程定义失败:', error);
    process.exit(1);
  }
}

// 运行更新脚本
updateFlowDefinitions()
  .then(() => {
    console.log('\n✓ 所有流程定义更新完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
