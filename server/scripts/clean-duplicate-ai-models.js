/**
 * 清理重复的 AI 模型
 * 去除重复的 AI 模型，保留功能最完整、版本最新的模型
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { aiModels } = require('../database/schema');
const { eq } = require('drizzle-orm');

async function cleanDuplicateAIModels() {
  console.log('🔍 开始分析重复的 AI 模型...\n');

  try {
    const db = await getDb();

    // 获取所有 AI 模型
    const allModels = await db
      .select({
        id: aiModels.id,
        name: aiModels.name,
        displayName: aiModels.displayName,
        type: aiModels.type,
        modelId: aiModels.modelId,
        capabilities: aiModels.capabilities,
        priority: aiModels.priority,
        isEnabled: aiModels.isEnabled,
        providerId: aiModels.providerId,
        maxTokens: aiModels.maxTokens
      })
      .from(aiModels)
      .orderBy(aiModels.name, aiModels.priority);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 当前所有 AI 模型列表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    allModels.forEach((model, index) => {
      const status = model.isEnabled ? '✅' : '⏸️ ';
      console.log(`${index + 1}. ${status} ${model.displayName}`);
      console.log(`   ID: ${model.id}`);
      console.log(`   名称: ${model.name}`);
      console.log(`   类型: ${model.type}`);
      console.log(`   Model ID: ${model.modelId}`);
      console.log(`   优先级: ${model.priority}`);
      console.log('');
    });

    // 按模型名称分组
    const modelsByName = {};
    allModels.forEach(model => {
      if (!modelsByName[model.name]) {
        modelsByName[model.name] = [];
      }
      modelsByName[model.name].push(model);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 重复模型分析');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 找出重复的模型（同一名称有多个记录）
    const duplicateModels = Object.entries(modelsByName)
      .filter(([name, models]) => models.length > 1)
      .sort((a, b) => b[1].length - a[1].length); // 按重复数量降序

    if (duplicateModels.length === 0) {
      console.log('✅ 没有发现重复的模型！');
      return;
    }

    console.log(`发现 ${duplicateModels.length} 组重复模型：\n`);

    // 分析每组重复模型，决定保留哪个
    const modelsToDelete = [];
    const modelsToKeep = [];

    for (const [modelName, models] of duplicateModels) {
      console.log(`🔍 重复组: ${modelName}`);
      console.log(`   重复数量: ${models.length}\n`);

      // 显示每个模型的详细信息
      models.forEach((model, index) => {
        console.log(`   ${index + 1}. ${model.displayName}`);
        console.log(`      ID: ${model.id}`);
        console.log(`      Model ID: ${model.modelId}`);
        console.log(`      类型: ${model.type}`);
        console.log(`      优先级: ${model.priority}`);
        console.log(`      能力: ${JSON.stringify(model.capabilities)}`);
      });

      console.log('');

      // 决定保留哪个模型
      // 策略：保留 type 最具体、capabilities 最丰富、priority 最高的模型
      const sortedModels = [...models].sort((a, b) => {
        // 优先级降序
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        // capabilities 数量降序
        const aCaps = Array.isArray(a.capabilities) ? a.capabilities.length : 0;
        const bCaps = Array.isArray(b.capabilities) ? b.capabilities.length : 0;
        return bCaps - aCaps;
      });

      const keepModel = sortedModels[0];
      const deleteModels = sortedModels.slice(1);

      modelsToKeep.push(keepModel);
      modelsToDelete.push(...deleteModels);

      console.log(`   ✅ 保留: ${keepModel.displayName}`);
      console.log(`      原因: 优先级最高(${keepModel.priority})，能力最丰富`);
      console.log(`   ❌ 删除:`);
      deleteModels.forEach(model => {
        console.log(`      - ${model.displayName} (优先级: ${model.priority})`);
      });

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // 显示总结
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 重复模型清理总结');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`总计发现 ${duplicateModels.length} 组重复模型`);
    console.log(`涉及 ${allModels.length} 个模型记录`);
    console.log(`需要删除 ${modelsToDelete.length} 个重复记录`);
    console.log(`保留 ${modelsToKeep.length} 个核心模型`);

    // 执行删除操作
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️  开始删除重复模型...\n');

    let deletedCount = 0;
    for (const model of modelsToDelete) {
      try {
        const result = await db
          .delete(aiModels)
          .where(eq(aiModels.id, model.id))
          .returning();

        if (result.length > 0) {
          console.log(`   ✅ 已删除: ${model.displayName} (${model.id})`);
          deletedCount++;
        } else {
          console.log(`   ⚠️  未找到: ${model.displayName} (${model.id})`);
        }
      } catch (error) {
        console.error(`   ❌ 删除失败: ${model.displayName}`, error.message);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 模型清理完成！');
    console.log(`   - 删除了 ${deletedCount} 个重复模型`);
    console.log(`   - 保留了 ${modelsToKeep.length} 个核心模型`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 显示最终的模型列表
    console.log('📋 最终 AI 模型列表：\n');
    const remainingModels = await db
      .select({
        id: aiModels.id,
        name: aiModels.name,
        displayName: aiModels.displayName,
        type: aiModels.type,
        modelId: aiModels.modelId,
        priority: aiModels.priority,
        capabilities: aiModels.capabilities,
        isEnabled: aiModels.isEnabled
      })
      .from(aiModels)
      .orderBy(aiModels.priority, aiModels.name);

    remainingModels.forEach((model, index) => {
      const status = model.isEnabled ? '✅' : '⏸️ ';
      console.log(`${index + 1}. ${status} ${model.displayName}`);
      console.log(`   名称: ${model.name}`);
      console.log(`   类型: ${model.type}`);
      console.log(`   Model ID: ${model.modelId}`);
      console.log(`   优先级: ${model.priority}`);
      console.log(`   能力: ${JSON.stringify(model.capabilities)}`);
      console.log('');
    });

    console.log('🎉 AI 模型优化完成！');
    console.log('\n优化说明：');
    console.log('1. 删除了所有重复的 AI 模型');
    console.log('2. 保留了功能最完整、优先级最高的版本');
    console.log('3. 优化后的模型列表更清晰、无重复');
    console.log('4. 所有模型都有明确的功能定位\n');

  } catch (error) {
    console.error('❌ 清理模型失败:', error);
    throw error;
  }
}

// 运行清理
cleanDuplicateAIModels()
  .then(() => {
    console.log('✅ AI 模型清理成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ AI 模型清理失败:', error);
    process.exit(1);
  });
