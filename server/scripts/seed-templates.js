/**
 * 话术模板初始化种子数据
 * 插入预设话术模板数据
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { promptCategoryTemplates } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('SEED_TEMPLATES');

async function seedData() {
  console.log('🌱 开始初始化话术模板数据...\n');

  try {
    const db = await getDb();

    const builtInTemplates = [
      {
        category: 'welcome',
        categoryName: '欢迎语',
        template: '你好！欢迎加入我们的社群，我是社群助手，很高兴为你服务！',
        variables: [],
        examples: [],
        isActive: true,
        priority: 1,
        description: '用户加入社群时的欢迎语'
      },
      {
        category: 'service_inquiry',
        categoryName: '服务咨询',
        template: '您好，关于服务咨询，我们的产品主要包括：1）产品A - 适用于XX场景；2）产品B - 适用于XX场景。请问您对哪方面感兴趣？',
        variables: [],
        examples: [],
        isActive: true,
        priority: 2,
        description: '用户咨询产品或服务时的标准回复'
      },
      {
        category: 'faq',
        categoryName: '常见问题',
        template: '您好，关于您的问题，这里有一些常见解答：\n1）关于价格：...\n2）关于功能：...\n3）关于售后：...\n\n如果以上解答无法满足您的需求，请提供更多详情，我会尽力帮助您。',
        variables: [],
        examples: [],
        isActive: true,
        priority: 3,
        description: '常见问题的标准回复模板'
      },
      {
        category: 'price_inquiry',
        categoryName: '价格咨询',
        template: '您好，关于价格问题，我们的产品有多种套餐选择：\n1）基础版 - ￥XXX/月，适合个人用户\n2）专业版 - ￥XXX/月，适合企业用户\n3）企业版 - ￥XXX/月，包含全部功能\n\n请问您需要了解哪个版本的详细功能？',
        variables: [],
        examples: [],
        isActive: true,
        priority: 4,
        description: '用户询问价格时的标准回复'
      },
      {
        category: 'after_sales',
        categoryName: '售后服务',
        template: '您好，关于售后服务，我们提供：\n1）7天无理由退换货\n2）30天免费技术支持\n3）终身免费升级\n\n如果您有任何售后问题，请随时联系我们，我们会尽快为您解决。',
        variables: [],
        examples: [],
        isActive: true,
        priority: 5,
        description: '售后服务相关问题的标准回复'
      },
      {
        category: 'complaint_handling',
        categoryName: '投诉处理',
        template: '非常抱歉给您带来了不便。我们非常重视您的反馈，请您详细描述遇到的问题，我们会立即为您处理，并在24小时内给您回复。',
        variables: [],
        examples: [],
        isActive: true,
        priority: 6,
        description: '用户投诉时的标准回复'
      },
      {
        category: 'product_introduction',
        categoryName: '产品介绍',
        template: '您好，我们的产品是一款专为XX场景设计的智能解决方案，主要特点包括：\n1）高效便捷：简化操作流程，提升工作效率\n2）智能强大：采用先进的AI技术，自动分析处理\n3）安全可靠：多重安全保障，保护您的数据隐私\n\n您可以先试用免费版本，体验后再决定是否升级。',
        variables: [],
        examples: [],
        isActive: true,
        priority: 7,
        description: '产品介绍的标准回复模板'
      },
      {
        category: 'activity_promotion',
        categoryName: '活动推广',
        template: '🎉 限时活动来啦！\n\n活动时间：{startDate} - {endDate}\n活动内容：{activityContent}\n参与方式：{participationMethod}\n\n机会难得，不容错过！',
        variables: ['startDate', 'endDate', 'activityContent', 'participationMethod'],
        examples: [],
        isActive: true,
        priority: 8,
        description: '活动推广的标准回复模板'
      },
      {
        category: 'technical_support',
        categoryName: '技术支持',
        template: '您好，关于您遇到的技术问题，请提供以下信息以便我们更好地帮助您：\n1）问题现象：请详细描述您遇到的问题\n2）操作步骤：请说明问题出现前的操作\n3）错误信息：如有错误提示，请提供截图或文字\n\n我们的技术支持团队会在1小时内响应您的请求。',
        variables: [],
        examples: [],
        isActive: true,
        priority: 9,
        description: '技术支持问题的标准回复模板'
      },
      {
        category: 'conversion_guidance',
        categoryName: '转化引导',
        template: '您好，感谢您的关注！我们的产品已经帮助超过{userCount}位用户解决了{problemType}问题，获得了{successRate}%的好评率。\n\n现在注册即可享受{discount}优惠，还送{giftValue}的免费试用时长！\n\n点击链接即可开始：{registrationLink}',
        variables: ['userCount', 'problemType', 'successRate', 'discount', 'giftValue', 'registrationLink'],
        examples: [],
        isActive: true,
        priority: 10,
        description: '转化引导的标准回复模板'
      }
    ];

    let insertedTemplates = 0;
    for (const template of builtInTemplates) {
      const existing = await db.select()
        .from(promptCategoryTemplates)
        .where(eq(promptCategoryTemplates.category, template.category))
        .limit(1);

      if (existing.length === 0) {
        console.log(`   ✨ 插入模板: ${template.categoryName}`);
        await db.insert(promptCategoryTemplates).values(template);
        insertedTemplates++;
      } else {
        console.log(`   ℹ️ 模板已存在: ${template.categoryName}`);
      }
    }
    console.log(`   ✅ 模板初始化完成，共插入 ${insertedTemplates} 个模板`);

    console.log('\n🎉 话术模板数据初始化完成！');
    console.log('\n数据统计:');
    console.log(`  - 话术模板: ${builtInTemplates.length}`);
    
  } catch (error) {
    console.error('❌ 数据初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
seedData();
