/**
 * AI模块初始化种子数据
 * 插入内置AI模型、提供商和角色数据
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { aiProviders, aiModels, aiRoles } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('SEED_AI_DATA');

async function seedData() {
  console.log('🌱 开始初始化AI模块数据...\n');

  try {
    const db = await getDb();

    // 1. 检查并插入AI提供商
    console.log('1️⃣ 检查AI提供商...');
    
    // 检查豆包提供商是否存在
    let doubaoProvider = await db.select()
      .from(aiProviders)
      .where(eq(aiProviders.name, 'doubao'))
      .limit(1);

    let doubaoProviderId;
    if (doubaoProvider.length === 0) {
      console.log('   ✨ 插入豆包提供商...');
      const result = await db.insert(aiProviders).values({
        name: 'doubao',
        displayName: '豆包',
        type: 'builtin',
        apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
        description: '火山引擎豆包大模型',
        isEnabled: true,
        priority: 1,
        rateLimit: 60
      }).returning();
      doubaoProviderId = result[0].id;
      console.log('   ✅ 豆包提供商插入成功');
    } else {
      doubaoProviderId = doubaoProvider[0].id;
      console.log('   ℹ️ 豆包提供商已存在');
    }

    // 检查DeepSeek提供商是否存在
    let deepseekProvider = await db.select()
      .from(aiProviders)
      .where(eq(aiProviders.name, 'deepseek'))
      .limit(1);

    let deepseekProviderId;
    if (deepseekProvider.length === 0) {
      console.log('   ✨ 插入DeepSeek提供商...');
      const result = await db.insert(aiProviders).values({
        name: 'deepseek',
        displayName: 'DeepSeek',
        type: 'builtin',
        apiEndpoint: 'https://api.deepseek.com/v1',
        description: 'DeepSeek大模型',
        isEnabled: true,
        priority: 2,
        rateLimit: 60
      }).returning();
      deepseekProviderId = result[0].id;
      console.log('   ✅ DeepSeek提供商插入成功');
    } else {
      deepseekProviderId = deepseekProvider[0].id;
      console.log('   ℹ️ DeepSeek提供商已存在');
    }

    // 检查Kimi提供商是否存在
    let kimiProvider = await db.select()
      .from(aiProviders)
      .where(eq(aiProviders.name, 'kimi'))
      .limit(1);

    let kimiProviderId;
    if (kimiProvider.length === 0) {
      console.log('   ✨ 插入Kimi提供商...');
      const result = await db.insert(aiProviders).values({
        name: 'kimi',
        displayName: 'Kimi',
        type: 'builtin',
        apiEndpoint: 'https://api.moonshot.cn/v1',
        description: 'Moonshot AI KIMI大模型',
        isEnabled: true,
        priority: 3,
        rateLimit: 60
      }).returning();
      kimiProviderId = result[0].id;
      console.log('   ✅ Kimi提供商插入成功');
    } else {
      kimiProviderId = kimiProvider[0].id;
      console.log('   ℹ️ Kimi提供商已存在');
    }

    // 2. 检查并插入内置AI模型
    console.log('\n2️⃣ 检查内置AI模型...');
    
    const builtInModels = [
      {
        providerId: doubaoProviderId,
        name: 'doubao-pro-4k-intent',
        displayName: '豆包Pro 4K（意图识别）',
        modelId: 'ep-20241201163431-5bwhr',
        type: 'intent',
        capabilities: ['intent_recognition', 'text_generation'],
        maxTokens: 2000,
        priority: 1,
        description: '轻量快速，专门用于用户意图识别',
        isEnabled: true
      },
      {
        providerId: doubaoProviderId,
        name: 'doubao-pro-32k-service',
        displayName: '豆包Pro 32K（服务回复）',
        modelId: 'ep-20250110120711-kn9p6',
        type: 'chat',
        capabilities: ['text_generation', 'conversation'],
        maxTokens: 32000,
        priority: 2,
        description: '大上下文，用于智能回复生成',
        isEnabled: true
      },
      {
        providerId: deepseekProviderId,
        name: 'deepseek-v3-conversion',
        displayName: 'DeepSeek V3（转化客服）',
        modelId: 'deepseek-v3',
        type: 'chat',
        capabilities: ['text_generation', 'reasoning', 'conversation'],
        maxTokens: 64000,
        priority: 3,
        description: '强推理能力，用于转化客服场景',
        isEnabled: true
      },
      {
        providerId: kimiProviderId,
        name: 'kimi-k2-report',
        displayName: 'Kimi K2（报告生成）',
        modelId: 'moonshot-v1-128k',
        type: 'chat',
        capabilities: ['text_generation', 'long_context', 'document_analysis'],
        maxTokens: 128000,
        priority: 4,
        description: '长文本能力，用于报告生成',
        isEnabled: true
      },
      {
        providerId: doubaoProviderId,
        name: 'doubao-pro-32k-general',
        displayName: '豆包Pro 32K（通用对话）',
        modelId: 'ep-20250110120711-kn9p6',
        type: 'chat',
        capabilities: ['text_generation', 'conversation'],
        maxTokens: 32000,
        priority: 5,
        description: '通用对话场景',
        isEnabled: true
      },
      {
        providerId: deepseekProviderId,
        name: 'deepseek-r1-tech',
        displayName: 'DeepSeek R1（技术支持）',
        modelId: 'deepseek-r1',
        type: 'chat',
        capabilities: ['text_generation', 'reasoning', 'code_generation'],
        maxTokens: 64000,
        priority: 6,
        description: '强推理和代码能力，用于技术支持',
        isEnabled: true
      }
    ];

    let insertedModels = 0;
    for (const model of builtInModels) {
      const existing = await db.select()
        .from(aiModels)
        .where(eq(aiModels.modelId, model.modelId))
        .limit(1);

      if (existing.length === 0) {
        console.log(`   ✨ 插入模型: ${model.displayName}`);
        await db.insert(aiModels).values(model);
        insertedModels++;
      } else {
        console.log(`   ℹ️ 模型已存在: ${model.displayName}`);
      }
    }
    console.log(`   ✅ 模型初始化完成，共插入 ${insertedModels} 个模型`);

    // 3. 检查并插入预设AI角色
    console.log('\n3️⃣ 检查预设AI角色...');
    
    // 先获取模型ID
    const allModels = await db.select({ id: aiModels.id, name: aiModels.name }).from(aiModels);
    const modelMap = {};
    allModels.forEach(m => modelMap[m.name] = m.id);

    const builtInPersonas = [
      {
        name: '社群运营',
        type: 'preset',
        category: 'operation',
        description: '负责社群日常运营、用户引导和活跃度提升',
        systemPrompt: '你是一位专业的社群运营专员，负责维护社群氛围、引导用户参与活动、解答基础问题。你的语气应该亲切、专业，具有服务意识。',
        temperature: 0.7,
        maxTokens: 2000,
        modelId: modelMap['doubao-pro-32k-general'],
        isActive: true,
        isDefault: false
      },
      {
        name: '售后处理',
        type: 'preset',
        category: 'service',
        description: '负责处理用户售后问题、投诉和反馈',
        systemPrompt: '你是一位专业的售后客服，负责处理用户的售后问题、投诉和反馈。你应该耐心倾听用户诉求，提供专业解决方案，保持礼貌和同理心。',
        temperature: 0.7,
        maxTokens: 2000,
        modelId: modelMap['doubao-pro-32k-service'],
        isActive: true,
        isDefault: false
      },
      {
        name: '转化客服',
        type: 'preset',
        category: 'sales',
        description: '负责产品介绍、价值传递和转化引导',
        systemPrompt: '你是一位专业的销售顾问，负责向用户介绍产品价值、解答购买疑问，引导用户完成转化。你应该具备产品知识、销售技巧和用户洞察能力。',
        temperature: 0.8,
        maxTokens: 3000,
        modelId: modelMap['deepseek-v3-conversion'],
        isActive: true,
        isDefault: false
      },
      {
        name: '技术支持',
        type: 'preset',
        category: 'support',
        description: '负责技术问题解答、故障排查和解决方案提供',
        systemPrompt: '你是一位资深的技术支持工程师，负责解答用户的技术问题、排查故障并提供解决方案。你应该具备扎实的技术知识、问题分析能力和清晰的沟通表达。',
        temperature: 0.5,
        maxTokens: 4000,
        modelId: modelMap['deepseek-r1-tech'],
        isActive: true,
        isDefault: false
      },
      {
        name: '产品咨询',
        type: 'preset',
        category: 'consulting',
        description: '负责产品功能介绍、使用指导和最佳实践分享',
        systemPrompt: '你是一位产品顾问，负责向用户介绍产品功能、提供使用指导、分享最佳实践。你应该对产品有深入理解，能够用简洁明了的语言解释复杂概念。',
        temperature: 0.7,
        maxTokens: 2000,
        modelId: modelMap['doubao-pro-32k-service'],
        isActive: true,
        isDefault: false
      },
      {
        name: '客户关系',
        type: 'preset',
        category: 'service',
        description: '负责客户关系维护、满意度调查和关怀提醒',
        systemPrompt: '你是一位客户关系专员，负责维护客户关系、进行满意度调查、发送关怀提醒。你应该具备良好的沟通能力和客户服务意识。',
        temperature: 0.7,
        maxTokens: 2000,
        modelId: modelMap['doubao-pro-32k-general'],
        isActive: true,
        isDefault: false
      },
      {
        name: '智能助手',
        type: 'preset',
        category: 'general',
        description: '通用智能助手，支持多种场景的对话和问答',
        systemPrompt: '你是一个智能助手，能够帮助用户解答问题、提供建议和执行任务。你应该友善、专业、高效。',
        temperature: 0.7,
        maxTokens: 2000,
        modelId: modelMap['doubao-pro-32k-general'],
        isActive: true,
        isDefault: true
      }
    ];

    let insertedPersonas = 0;
    for (const persona of builtInPersonas) {
      const existing = await db.select()
        .from(aiRoles)
        .where(eq(aiRoles.name, persona.name))
        .limit(1);

      if (existing.length === 0) {
        console.log(`   ✨ 插入角色: ${persona.name}`);
        await db.insert(aiRoles).values(persona);
        insertedPersonas++;
      } else {
        console.log(`   ℹ️ 角色已存在: ${persona.name}`);
      }
    }
    console.log(`   ✅ 角色初始化完成，共插入 ${insertedPersonas} 个角色`);

    console.log('\n🎉 AI模块数据初始化完成！');
    console.log('\n数据统计:');
    console.log(`  - AI提供商: 3 (豆包、DeepSeek、Kimi)`);
    console.log(`  - AI模型: ${builtInModels.length}`);
    console.log(`  - AI角色: ${builtInPersonas.length}`);
    
    return {
      providers: 3,
      models: builtInModels.length,
      personas: builtInPersonas.length
    };
  } catch (error) {
    console.error('❌ 数据初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本，执行初始化
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('✅ AI模块数据初始化成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ AI模块数据初始化失败:', error);
      process.exit(1);
    });
}

// 导出函数供其他模块使用
module.exports = { seedData };
