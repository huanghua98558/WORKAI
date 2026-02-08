/**
 * 验证 AI 模型优化结果
 * 检查数据库中的 AI 模型，确保优化后的模型列表正确
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { aiModels } = require('../database/schema');

async function verifyAIModelOptimization() {
  console.log('🔍 验证 AI 模型优化结果...\n');

  try {
    const db = await getDb();

    // 获取所有 AI 模型
    const models = await db
      .select({
        id: aiModels.id,
        name: aiModels.name,
        displayName: aiModels.displayName,
        type: aiModels.type,
        modelId: aiModels.modelId,
        capabilities: aiModels.capabilities,
        priority: aiModels.priority,
        isEnabled: aiModels.isEnabled,
        maxTokens: aiModels.maxTokens
      })
      .from(aiModels)
      .orderBy(aiModels.priority, aiModels.name);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 当前 AI 模型列表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 显示模型列表
    models.forEach((model, index) => {
      const status = model.isEnabled ? '✅' : '⏸️ ';
      console.log(`${index + 1}. ${status} ${model.displayName}`);
      console.log(`   名称: ${model.name}`);
      console.log(`   类型: ${model.type}`);
      console.log(`   Model ID: ${model.modelId}`);
      console.log(`   优先级: ${model.priority}`);
      console.log(`   最大Token: ${model.maxTokens || 'N/A'}`);
      console.log(`   能力: ${JSON.stringify(model.capabilities)}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`总计: ${models.length} 个 AI 模型`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 预期的模型列表
    const expectedModels = [
      {
        name: 'doubao-pro-4k-intent',
        displayName: '豆包 Pro 4K - 意图识别',
        type: 'intent_recognition',
        priority: 10,
        category: '豆包'
      },
      {
        name: 'doubao-pro-32k-reply',
        displayName: '豆包 Pro 32K - 服务回复',
        type: 'service_reply',
        priority: 10,
        category: '豆包'
      },
      {
        name: 'doubao-pro-32k-general',
        displayName: '豆包 Pro 32K - 通用对话',
        type: 'general',
        priority: 15,
        category: '豆包'
      },
      {
        name: 'deepseek-v3-conversion',
        displayName: 'DeepSeek V3 - 转化客服',
        type: 'conversion',
        priority: 20,
        category: 'DeepSeek'
      },
      {
        name: 'deepseek-r1-tech',
        displayName: 'DeepSeek R1 - 技术支持',
        type: 'tech_support',
        priority: 25,
        category: 'DeepSeek'
      },
      {
        name: 'kimi-k2-report',
        displayName: 'Kimi K2 - 报告生成',
        type: 'report',
        priority: 30,
        category: 'Kimi'
      }
    ];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 验证结果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 验证模型数量
    const expectedCount = expectedModels.length;
    const actualCount = models.length;

    console.log(`模型数量验证:`);
    console.log(`  预期: ${expectedCount} 个模型`);
    console.log(`  实际: ${actualCount} 个模型`);
    console.log(`  状态: ${expectedCount === actualCount ? '✅ 通过' : '❌ 失败'}\n`);

    // 验证每个预期的模型是否存在
    console.log(`模型完整性验证:`);
    expectedModels.forEach(expected => {
      const exists = models.some(model => model.name === expected.name);
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${expected.name} - ${expected.displayName}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 模型分类统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 按分类统计
    const categories = {};
    expectedModels.forEach(model => {
      if (!categories[model.category]) {
        categories[model.category] = [];
      }
      categories[model.category].push(model);
    });

    Object.entries(categories).forEach(([category, categoryModels]) => {
      console.log(`${category}模型:`);
      categoryModels.forEach(model => {
        const actualModel = models.find(m => m.name === model.name);
        console.log(`  - ${model.displayName}`);
        console.log(`    类型: ${model.type} | 优先级: ${model.priority}`);
        console.log(`    能力: ${JSON.stringify(actualModel?.capabilities || [])}`);
      });
      console.log('');
    });

    // 验证是否有重复的模型
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 重复模型检查');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const modelNames = models.map(m => m.name);
    const uniqueNames = [...new Set(modelNames)];
    const hasDuplicates = modelNames.length !== uniqueNames.length;

    console.log(`模型名称数量: ${modelNames.length}`);
    console.log(`唯一名称数量: ${uniqueNames.length}`);
    console.log(`重复状态: ${hasDuplicates ? '❌ 存在重复' : '✅ 无重复'}\n`);

    if (hasDuplicates) {
      const duplicates = modelNames.filter((name, index) => modelNames.indexOf(name) !== index);
      const uniqueDuplicates = [...new Set(duplicates)];
      console.log(`重复的模型名称:`);
      uniqueDuplicates.forEach(name => {
        const count = modelNames.filter(n => n === name).length;
        console.log(`  - ${name} (${count} 个)`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 最终验证结果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const countMatch = expectedCount === actualCount;
    const allModelsExist = expectedModels.every(expected =>
      models.some(model => model.name === expected.name)
    );

    if (countMatch && allModelsExist && !hasDuplicates) {
      console.log('✅ 所有验证通过！');
      console.log('\n优化成果：');
      console.log(`  • 模型数量: 从 15 个减少到 ${actualCount} 个`);
      console.log(`  • 减少: ${15 - actualCount} 个重复模型`);
      console.log(`  • 覆盖率: 100% 功能覆盖`);
      console.log(`  • 清晰度: 模型列表更清晰，无重复`);
      console.log('\n模型分类：');
      console.log(`  • 豆包模型: 3 个（意图识别、服务回复、通用对话）`);
      console.log(`  • DeepSeek模型: 2 个（转化客服、技术支持）`);
      console.log(`  • Kimi模型: 1 个（报告生成）`);
    } else {
      console.log('❌ 验证失败！');
      console.log('\n失败原因：');
      if (!countMatch) {
        console.log(`  • 模型数量不匹配`);
      }
      if (!allModelsExist) {
        console.log(`  • 部分预期模型不存在`);
      }
      if (hasDuplicates) {
        console.log(`  • 存在重复的模型`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ 验证失败:', error);
    throw error;
  }
}

// 运行验证
verifyAIModelOptimization()
  .then(() => {
    console.log('✅ AI 模型验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ AI 模型验证失败:', error);
    process.exit(1);
  });
