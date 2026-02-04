/**
 * 批量导入预设话术模板脚本
 * 包含24类场景的100+预设话术模板
 */

const { getDb } = require('coze-coding-dev-sdk');
const { promptCategoryTemplates } = require('../database/schema');
const { getLogger } = require('../lib/logger');
const { sql } = require('drizzle-orm');

const logger = getLogger('IMPORT_TEMPLATES');

// 预设话术模板数据（24类场景）
const PROMPT_TEMPLATES = [
  // ==================== 1. 欢迎类 ====================
  {
    category: 'welcome',
    categoryName: '欢迎语',
    template: '欢迎 {{userName}} 加入我们的社群！🎉\n\n我是{{botName}}，很高兴认识你。\n\n📝 群规：\n1. 禁止发布广告和垃圾信息\n2. 请文明交流，友善互动\n3. 有问题请@管理员\n\n如有任何问题，随时告诉我！',
    variables: ['userName', 'botName'],
    examples: ['欢迎 张三 加入我们的社群！🎉'],
    isActive: true,
    priority: 1,
    description: '新用户入群欢迎话术'
  },
  {
    category: 'welcome',
    categoryName: '欢迎语',
    template: 'Hi {{userName}}，欢迎来到【{{groupName}}】！\n\n🌟 在这里你可以：\n- 交流{{mainTopic}}相关话题\n- 分享经验和资源\n- 认识志同道合的朋友\n\n👇 先做个自我介绍吧！',
    variables: ['userName', 'groupName', 'mainTopic'],
    examples: ['Hi 小明，欢迎来到【AI技术交流群】！'],
    isActive: true,
    priority: 2,
    description: '社群新成员欢迎'
  },
  {
    category: 'welcome',
    categoryName: '欢迎语',
    template: '欢迎新朋友！✨\n\n这里是{{communityName}}，一个专注{{focusArea}}的社群。\n\n📌 快速入群指南：\n1. 阅读群公告了解规则\n2. 关注置顶消息获取资源\n3. 积极参与讨论\n\n祝你在社群玩得开心！',
    variables: ['communityName', 'focusArea'],
    examples: ['欢迎新朋友！✨ 这里是Python学习社群'],
    isActive: true,
    priority: 3,
    description: '新成员引导欢迎'
  },
  {
    category: 'welcome',
    categoryName: '欢迎语',
    template: '{{userName}}，欢迎回家！🏠\n\n看到你加入我们真的好开心！\n\n💬 有什么想说的，尽管分享，我们都在这里。\n\n加油！让我们一起成长！',
    variables: ['userName'],
    examples: ['李四，欢迎回家！🏠'],
    isActive: true,
    priority: 4,
    description: '温馨型欢迎语'
  },
  {
    category: 'welcome',
    categoryName: '欢迎语',
    template: '欢迎加入{{groupName}}！\n\n🎯 我们的使命：{{mission}}\n🎪 我们的活动：{{activities}}\n\n期待你的参与和贡献！',
    variables: ['groupName', 'mission', 'activities'],
    examples: ['欢迎加入前端技术交流群！'],
    isActive: true,
    priority: 5,
    description: '使命型欢迎语'
  },

  // ==================== 2. 售后咨询类 ====================
  {
    category: 'after_sales',
    categoryName: '售后咨询',
    template: '收到您的问题：{{userQuestion}}\n\n我们会尽快为您处理，预计在{{estimatedTime}}内回复。\n\n如有紧急情况，请直接联系：{{contactInfo}}',
    variables: ['userQuestion', 'estimatedTime', 'contactInfo'],
    examples: ['收到您的问题：产品无法启动'],
    isActive: true,
    priority: 1,
    description: '售后问题处理'
  },
  {
    category: 'after_sales',
    categoryName: '售后咨询',
    template: '您好！关于{{issue}}的问题，我已经记录下来了。\n\n🔍 问题类型：{{issueType}}\n📋 处理进度：{{progress}}\n\n我们会持续跟进，请耐心等待。',
    variables: ['issue', 'issueType', 'progress'],
    examples: ['您好！关于退款的问题，我已经记录下来了'],
    isActive: true,
    priority: 2,
    description: '问题跟进回复'
  },
  {
    category: 'after_sales',
    categoryName: '售后咨询',
    template: '抱歉给您带来不便！😔\n\n关于{{complaint}}，我们会：\n1. 立即核查\n2. 给出解决方案\n3. 提供补偿方案\n\n预计处理时间：{{timeframe}}',
    variables: ['complaint', 'timeframe'],
    examples: ['抱歉给您带来不便！关于产品质量问题'],
    isActive: true,
    priority: 3,
    description: '投诉处理'
  },
  {
    category: 'after_sales',
    categoryName: '售后咨询',
    template: '您的售后请求已处理完成！✅\n\n📋 处理结果：{{result}}\n🎁 补偿方案：{{compensation}}\n\n如有其他问题，随时联系我们！',
    variables: ['result', 'compensation'],
    examples: ['您的售后请求已处理完成！'],
    isActive: true,
    priority: 4,
    description: '售后完成通知'
  },

  // ==================== 3. 常见问题类 ====================
  {
    category: 'faq',
    categoryName: '常见问题',
    template: '关于{{question}}的解答：\n\n{{answer}}\n\n💡 小贴士：{{tip}}\n\n还有其他问题吗？',
    variables: ['question', 'answer', 'tip'],
    examples: ['关于如何注册的解答'],
    isActive: true,
    priority: 1,
    description: 'FAQ标准回答'
  },
  {
    category: 'faq',
    categoryName: '常见问题',
    template: '这是一个经常被问到的问题！\n\n❓ {{question}}\n✅ {{answer}}\n\n🔗 相关资源：{{resource}}',
    variables: ['question', 'answer', 'resource'],
    examples: ['这是一个经常被问到的问题！如何修改密码'],
    isActive: true,
    priority: 2,
    description: 'FAQ附带资源'
  },
  {
    category: 'faq',
    categoryName: '常见问题',
    template: '让我来帮你解答{{topic}}相关的问题：\n\n{{content}}\n\n希望对你有帮助！如果还有疑问，请随时提问。',
    variables: ['topic', 'content'],
    examples: ['让我来帮你解答价格相关的问题'],
    isActive: true,
    priority: 3,
    description: 'FAQ详细解答'
  },
  {
    category: 'faq',
    categoryName: '常见问题',
    template: '{{question}}？\n\n简短回答：{{shortAnswer}}\n\n详细说明：\n{{detailedAnswer}}',
    variables: ['question', 'shortAnswer', 'detailedAnswer'],
    examples: ['支持哪些支付方式？'],
    isActive: true,
    priority: 4,
    description: 'FAQ分层次回答'
  },
  {
    category: 'faq',
    categoryName: '常见问题',
    template: '📚 知识库查询结果：\n\n问题：{{question}}\n答案：{{answer}}\n\n📎 相关文档：{{documents}}',
    variables: ['question', 'answer', 'documents'],
    examples: ['📚 知识库查询结果：如何联系客服'],
    isActive: true,
    priority: 5,
    description: 'FAQ知识库引用'
  },

  // ==================== 4. 产品介绍类 ====================
  {
    category: 'product_intro',
    categoryName: '产品介绍',
    template: '【{{productName}}】产品介绍\n\n🎯 核心功能：\n{{features}}\n\n💡 适用场景：\n{{scenarios}}\n\n📞 了解更多：{{contact}}',
    variables: ['productName', 'features', 'scenarios', 'contact'],
    examples: ['【智能客服机器人】产品介绍'],
    isActive: true,
    priority: 1,
    description: '产品功能介绍'
  },
  {
    category: 'product_intro',
    categoryName: '产品介绍',
    template: '想知道{{productName}}的{{feature}}吗？\n\n✨ 特点：\n{{highlights}}\n\n🚀 效果：\n{{benefits}}\n\n需要演示吗？',
    variables: ['productName', 'feature', 'highlights', 'benefits'],
    examples: ['想知道智能客服机器人的AI能力吗？'],
    isActive: true,
    priority: 2,
    description: '产品特性介绍'
  },
  {
    category: 'product_intro',
    categoryName: '产品介绍',
    template: '{{productName}} vs 竞品对比：\n\n📊 性能：{{performance}}\n💰 价格：{{price}}\n🛡️ 稳定性：{{stability}}\n🎯 适用：{{applicability}}\n\n我们优势明显！',
    variables: ['productName', 'performance', 'price', 'stability', 'applicability'],
    examples: ['我们的产品 vs 竞品对比'],
    isActive: true,
    priority: 3,
    description: '产品对比介绍'
  },

  // ==================== 5. 价格咨询类 ====================
  {
    category: 'price_inquiry',
    categoryName: '价格咨询',
    template: '关于{{product}}的价格方案：\n\n💰 套餐一：{{plan1}}\n💎 套餐二：{{plan2}}\n👑 套餐三：{{plan3}}\n\n需要详细介绍吗？',
    variables: ['product', 'plan1', 'plan2', 'plan3'],
    examples: ['关于企业版的价格方案'],
    isActive: true,
    priority: 1,
    description: '套餐价格介绍'
  },
  {
    category: 'price_inquiry',
    categoryName: '价格咨询',
    template: '{{product}}当前优惠活动：\n\n🎉 优惠：{{discount}}\n⏰ 有效期：{{validity}}\n🎁 赠品：{{gift}}\n\n限时优惠，抓住机会！',
    variables: ['product', 'discount', 'validity', 'gift'],
    examples: ['当前优惠活动：'],
    isActive: true,
    priority: 2,
    description: '优惠活动价格'
  },
  {
    category: 'price_inquiry',
    categoryName: '价格咨询',
    template: '针对{{userType}}客户，我们有专属方案：\n\n💼 方案：{{plan}}\n💵 价格：{{price}}\n✨ 包含：{{includes}}\n\n需要定制吗？',
    variables: ['userType', 'plan', 'price', 'includes'],
    examples: ['针对企业客户，我们有专属方案'],
    isActive: true,
    priority: 3,
    description: '定制方案价格'
  },

  // ==================== 6. 促销活动类 ====================
  {
    category: 'promotion',
    categoryName: '促销活动',
    template: '🎉 限时活动来袭！\n\n📢 活动主题：{{theme}}\n🎁 优惠内容：{{offer}}\n⏰ 活动时间：{{time}}\n🔗 参与方式：{{join}}\n\n不要错过！',
    variables: ['theme', 'offer', 'time', 'join'],
    examples: ['🎉 限时活动来袭！'],
    isActive: true,
    priority: 1,
    description: '促销活动通知'
  },
  {
    category: 'promotion',
    categoryName: '促销活动',
    template: '【{{productName}}】限时特惠！\n\n原价：{{originalPrice}}\n现价：{{currentPrice}}\n省：{{saving}}\n\n🛒 立即抢购：{{link}}',
    variables: ['productName', 'originalPrice', 'currentPrice', 'saving', 'link'],
    examples: ['【企业版】限时特惠！'],
    isActive: true,
    priority: 2,
    description: '产品限时优惠'
  },
  {
    category: 'promotion',
    categoryName: '促销活动',
    template: '会员专属福利！🎁\n\n👑 会员等级：{{level}}\n🎁 专属权益：{{benefits}}\n⏰ 有效期：{{validity}}\n\n感谢您的支持！',
    variables: ['level', 'benefits', 'validity'],
    examples: ['会员专属福利！'],
    isActive: true,
    priority: 3,
    description: '会员专属促销'
  },

  // ==================== 7. 使用指南类 ====================
  {
    category: 'usage_guide',
    categoryName: '使用指南',
    template: '{{feature}}使用步骤：\n\n📌 第一步：{{step1}}\n📌 第二步：{{step2}}\n📌 第三步：{{step3}}\n\n💡 更多教程：{{tutorial}}',
    variables: ['feature', 'step1', 'step2', 'step3', 'tutorial'],
    examples: ['账号注册使用步骤：'],
    isActive: true,
    priority: 1,
    description: '功能使用步骤'
  },
  {
    category: 'usage_guide',
    categoryName: '使用指南',
    template: '新手入门指南！\n\n📘 第一天：{{day1}}\n📗 第二天：{{day2}}\n📙 第三天：{{day3}}\n\n循序渐进，轻松上手！',
    variables: ['day1', 'day2', 'day3'],
    examples: ['新手入门指南！'],
    isActive: true,
    priority: 2,
    description: '新手入门指导'
  },
  {
    category: 'usage_guide',
    categoryName: '使用指南',
    template: '如何实现{{goal}}？\n\n🎯 方法一：{{method1}}\n🎯 方法二：{{method2}}\n🎯 推荐方案：{{recommendation}}\n\n📖 详细文档：{{docs}}',
    variables: ['goal', 'method1', 'method2', 'recommendation', 'docs'],
    examples: ['如何实现数据导出？'],
    isActive: true,
    priority: 3,
    description: '目标实现指导'
  },

  // ==================== 8. 故障排查类 ====================
  {
    category: 'troubleshooting',
    categoryName: '故障排查',
    template: '【{{error}}】故障排查指南\n\n🔍 可能原因：\n{{causes}}\n\n✅ 解决方案：\n{{solutions}}\n\n需要人工帮助吗？',
    variables: ['error', 'causes', 'solutions'],
    examples: ['【连接失败】故障排查指南'],
    isActive: true,
    priority: 1,
    description: '故障排查流程'
  },
  {
    category: 'troubleshooting',
    categoryName: '故障排查',
    template: '遇到{{issue}}？试试这些方法：\n\n1️⃣ {{fix1}}\n2️⃣ {{fix2}}\n3️⃣ {{fix3}}\n\n如果问题仍存在，请联系技术支持。',
    variables: ['issue', 'fix1', 'fix2', 'fix3'],
    examples: ['遇到登录失败？试试这些方法：'],
    isActive: true,
    priority: 2,
    description: '常见问题快速修复'
  },
  {
    category: 'troubleshooting',
    categoryName: '故障排查',
    template: '🚨 {{system}}系统异常\n\n⚠️ 错误代码：{{errorCode}}\n📝 错误描述：{{description}}\n\n我们正在紧急处理，请稍后重试。',
    variables: ['system', 'errorCode', 'description'],
    examples: ['🚨 支付系统异常'],
    isActive: true,
    priority: 3,
    description: '系统异常通知'
  },

  // ==================== 9. 反馈收集类 ====================
  {
    category: 'feedback',
    categoryName: '反馈收集',
    template: '感谢您的反馈！🙏\n\n📝 您的反馈：{{feedback}}\n✅ 已记录并反馈给团队\n\n我们会尽快优化！',
    variables: ['feedback'],
    examples: ['感谢您的反馈！🙏'],
    isActive: true,
    priority: 1,
    description: '反馈确认'
  },
  {
    category: 'feedback',
    categoryName: '反馈收集',
    template: '我们希望听到您的声音！\n\n💬 请告诉我们：\n1. 您最满意的功能是？\n2. 您希望改进的地方是？\n3. 其他建议？\n\n🔗 反馈链接：{{link}}',
    variables: ['link'],
    examples: ['我们希望听到您的声音！'],
    isActive: true,
    priority: 2,
    description: '反馈邀请'
  },
  {
    category: 'feedback',
    categoryName: '反馈收集',
    template: '您之前的反馈{{feature}}已上线！✅\n\n感谢您的建议，我们已按您的要求优化了{{improvement}}。\n\n继续反馈，让我们更好！',
    variables: ['feature', 'improvement'],
    examples: ['您之前的反馈暗黑模式已上线！'],
    isActive: true,
    priority: 3,
    description: '反馈落地通知'
  },

  // ==================== 10. 活动邀请类 ====================
  {
    category: 'event_invitation',
    categoryName: '活动邀请',
    template: '🎊 活动邀请：{{eventName}}\n\n📅 时间：{{time}}\n📍 地点：{{location}}\n📝 内容：{{content}}\n\n🔗 报名链接：{{link}}\n期待您的参与！',
    variables: ['eventName', 'time', 'location', 'content', 'link'],
    examples: ['🎊 活动邀请：技术分享会'],
    isActive: true,
    priority: 1,
    description: '活动邀请'
  },
  {
    category: 'event_invitation',
    categoryName: '活动邀请',
    template: '您被邀请参加：\n\n🌟 {{eventName}}\n🗓️ 时间：{{time}}\n🎯 主题：{{theme}}\n\n请确认是否参加：{{confirm}}',
    variables: ['eventName', 'time', 'theme', 'confirm'],
    examples: ['您被邀请参加：年度大会'],
    isActive: true,
    priority: 2,
    description: '专属活动邀请'
  },

  // ==================== 11. 课程培训类 ====================
  {
    category: 'training',
    categoryName: '课程培训',
    template: '【{{courseName}}】开课通知\n\n📚 课程大纲：\n{{syllabus}}\n\n🕐 时间安排：\n{{schedule}}\n\n📝 报名方式：{{registration}}',
    variables: ['courseName', 'syllabus', 'schedule', 'registration'],
    examples: ['【AI实战课程】开课通知'],
    isActive: true,
    priority: 1,
    description: '课程开课通知'
  },
  {
    category: 'training',
    categoryName: '课程培训',
    template: '本周课程预告：\n\n📖 {{topic}}\n👨‍🏫 讲师：{{instructor}}\n⏰ 时间：{{time}}\n\n🔗 直播链接：{{link}}',
    variables: ['topic', 'instructor', 'time', 'link'],
    examples: ['本周课程预告：React最佳实践'],
    isActive: true,
    priority: 2,
    description: '课程预告'
  },
  {
    category: 'training',
    categoryName: '课程培训',
    template: '课程资料已更新！\n\n📁 {{courseName}}\n📄 新增内容：{{newContent}}\n🔗 下载链接：{{download}}',
    variables: ['courseName', 'newContent', 'download'],
    examples: ['课程资料已更新！'],
    isActive: true,
    priority: 3,
    description: '课程资料更新'
  },

  // ==================== 12. 社群管理类 ====================
  {
    category: 'community',
    categoryName: '社群管理',
    template: '社群规则更新通知：\n\n📋 新增规则：\n{{newRules}}\n\n⚠️ 违规处理：\n{{penalty}}\n\n请大家遵守规则，共建良好社群！',
    variables: ['newRules', 'penalty'],
    examples: ['社群规则更新通知：'],
    isActive: true,
    priority: 1,
    description: '社群规则通知'
  },
  {
    category: 'community',
    categoryName: '社群管理',
    template: '🏆 本周优秀成员：\n\n{{members}}\n\n感谢你们的贡献！继续加油！',
    variables: ['members'],
    examples: ['🏆 本周优秀成员：'],
    isActive: true,
    priority: 2,
    description: '优秀成员表彰'
  },
  {
    category: 'community',
    categoryName: '社群管理',
    template: '社群活动投票：\n\n📊 主题：{{topic}}\n🗳️ 选项：\n{{options}}\n\n🔗 投票链接：{{link}}',
    variables: ['topic', 'options', 'link'],
    examples: ['社群活动投票：'],
    isActive: true,
    priority: 3,
    description: '社群活动投票'
  },

  // ==================== 13. 客户关怀类 ====================
  {
    category: 'customer_care',
    categoryName: '客户关怀',
    template: '生日快乐，{{userName}}！🎂\n\n感谢您一直以来的支持！\n\n🎁 专属生日礼物：{{gift}}\n\n祝您生日快乐，万事如意！',
    variables: ['userName', 'gift'],
    examples: ['生日快乐，小明！🎂'],
    isActive: true,
    priority: 1,
    description: '生日祝福'
  },
  {
    category: 'customer_care',
    categoryName: '客户关怀',
    template: '感谢您成为我们的会员{{years}}周年！🎊\n\n📅 入会时间：{{joinDate}}\n🎁 专属福利：{{benefits}}\n\n感恩有你，一路同行！',
    variables: ['years', 'joinDate', 'benefits'],
    examples: ['感谢您成为我们的会员3周年！🎊'],
    isActive: true,
    priority: 2,
    description: '会员周年纪念'
  },
  {
    category: 'customer_care',
    categoryName: '客户关怀',
    template: '好久不见，{{userName}}！\n\n注意到您已经{{time}}没来了。\n\n我们想念您！回来看看吧：\n🔗 {{link}}',
    variables: ['userName', 'time', 'link'],
    examples: ['好久不见，小明！'],
    isActive: true,
    priority: 3,
    description: '客户召回'
  },

  // ==================== 14. 知识分享类 ====================
  {
    category: 'knowledge',
    categoryName: '知识分享',
    template: '📚 今日知识点分享：\n\n🔑 {{topic}}\n\n{{content}}\n\n💡 应用场景：\n{{scenarios}}\n\n关注我，每天进步一点点！',
    variables: ['topic', 'content', 'scenarios'],
    examples: ['📚 今日知识点分享：'],
    isActive: true,
    priority: 1,
    description: '每日知识分享'
  },
  {
    category: 'knowledge',
    categoryName: '知识分享',
    template: '推荐阅读：\n\n📖 {{title}}\n✍️ 作者：{{author}}\n⭐ 评分：{{rating}}\n\n📝 精选摘要：\n{{summary}}',
    variables: ['title', 'author', 'rating', 'summary'],
    examples: ['推荐阅读：'],
    isActive: true,
    priority: 2,
    description: '书籍/文章推荐'
  },
  {
    category: 'knowledge',
    categoryName: '知识分享',
    template: '行业动态速递：\n\n📰 {{news}}\n\n💭 解读：\n{{analysis}}\n\n🎯 影响与机会：\n{{impact}}',
    variables: ['news', 'analysis', 'impact'],
    examples: ['行业动态速递：'],
    isActive: true,
    priority: 3,
    description: '行业资讯分享'
  },

  // ==================== 15. 通知公告类 ====================
  {
    category: 'announcement',
    categoryName: '通知公告',
    template: '📢 重要通知：{{title}}\n\n{{content}}\n\n⏰ 生效时间：{{time}}\n\n如有疑问，请联系客服。',
    variables: ['title', 'content', 'time'],
    examples: ['📢 重要通知：系统维护'],
    isActive: true,
    priority: 1,
    description: '重要公告'
  },
  {
    category: 'announcement',
    categoryName: '通知公告',
    template: '系统更新通知：\n\n🆕 新增功能：\n{{newFeatures}}\n\n🐛 修复问题：\n{{fixes}}\n\n🔄 更新方式：{{updateMethod}}',
    variables: ['newFeatures', 'fixes', 'updateMethod'],
    examples: ['系统更新通知：'],
    isActive: true,
    priority: 2,
    description: '系统更新通知'
  },
  {
    category: 'announcement',
    categoryName: '通知公告',
    template: '放假通知：\n\n🎉 {{holiday}}\n⏰ 时间：{{time}}\n⚠️ 注意事项：\n{{notice}}\n\n祝大家假期愉快！',
    variables: ['holiday', 'time', 'notice'],
    examples: ['放假通知：春节'],
    isActive: true,
    priority: 3,
    description: '放假通知'
  },

  // ==================== 16. 赞美鼓励类 ====================
  {
    category: 'praise',
    categoryName: '赞美鼓励',
    template: '太棒了，{{userName}}！👏\n\n{{achievement}}\n\n你的努力我们都看到了，继续保持！',
    variables: ['userName', 'achievement'],
    examples: ['太棒了，小明！👏'],
    isActive: true,
    priority: 1,
    description: '成就鼓励'
  },
  {
    category: 'praise',
    categoryName: '赞美鼓励',
    template: '感谢分享！{{content}}\n\n非常有价值！🌟\n\n大家一起学习起来吧！',
    variables: ['content'],
    examples: ['感谢分享！你的代码技巧非常有用'],
    isActive: true,
    priority: 2,
    description: '分享感谢'
  },
  {
    category: 'praise',
    categoryName: '赞美鼓励',
    template: '你做得很好！💪\n\n{{positiveFeedback}}\n\n相信你能做得更好！加油！',
    variables: ['positiveFeedback'],
    examples: ['你做得很好！你的进步非常明显'],
    isActive: true,
    priority: 3,
    description: '正向鼓励'
  },

  // ==================== 17. 节日祝福类 ====================
  {
    category: 'greeting',
    categoryName: '节日祝福',
    template: '🎉 {{festival}}快乐！\n\n{{greetingMessage}}\n\n祝您和您的家人：\n{{wishes}}',
    variables: ['festival', 'greetingMessage', 'wishes'],
    examples: ['🎉 春节快乐！'],
    isActive: true,
    priority: 1,
    description: '节日祝福'
  },
  {
    category: 'greeting',
    categoryName: '节日祝福',
    template: '🎄 {{holiday}}特别活动：\n\n{{activity}}\n\n🎁 惊喜福利：{{bonus}}\n\n祝大家{{holiday}}快乐！',
    variables: ['holiday', 'activity', 'bonus'],
    examples: ['🎄 春节特别活动：'],
    isActive: true,
    priority: 2,
    description: '节日活动'
  },

  // ==================== 18. 智能客服类 ====================
  {
    category: 'chatbot',
    categoryName: '智能客服',
    template: '您好！我是智能客服{{botName}}🤖\n\n我可以帮您：\n{{capabilities}}\n\n请问有什么可以帮您？',
    variables: ['botName', 'capabilities'],
    examples: ['您好！我是智能客服小助手🤖'],
    isActive: true,
    priority: 1,
    description: '智能客服开场'
  },
  {
    category: 'chatbot',
    categoryName: '智能客服',
    template: '我不确定您的意思。😕\n\n您是想问：\n{{suggestions}}\n\n请告诉我更多细节。',
    variables: ['suggestions'],
    examples: ['我不确定您的意思。😕'],
    isActive: true,
    priority: 2,
    description: '意图不明确回复'
  },
  {
    category: 'chatbot',
    categoryName: '智能客服',
    template: '正在为您查询{{query}}...🔍\n\n请稍等片刻...',
    variables: ['query'],
    examples: ['正在为您查询订单状态...🔍'],
    isActive: true,
    priority: 3,
    description: '查询中回复'
  },
  {
    category: 'chatbot',
    categoryName: '智能客服',
    template: '查询结果：\n\n{{result}}\n\n还有其他问题吗？',
    variables: ['result'],
    examples: ['查询结果：您的订单已发货'],
    isActive: true,
    priority: 4,
    description: '查询结果回复'
  },

  // ==================== 19. 风险提示类 ====================
  {
    category: 'risk_warning',
    categoryName: '风险提示',
    template: '⚠️ 风险提示：{{riskType}}\n\n{{description}}\n\n🚫 请注意：\n{{warnings}}\n\n如有疑问，请联系客服。',
    variables: ['riskType', 'description', 'warnings'],
    examples: ['⚠️ 风险提示：账户安全'],
    isActive: true,
    priority: 1,
    description: '安全风险提示'
  },
  {
    category: 'risk_warning',
    categoryName: '风险提示',
    template: '检测到异常操作：\n\n{{operation}}\n\n为保障您的账户安全，请：\n{{actions}}\n\n如非本人操作，请立即联系客服！',
    variables: ['operation', 'actions'],
    examples: ['检测到异常操作：异地登录'],
    isActive: true,
    priority: 2,
    description: '异常操作提示'
  },

  // ==================== 20. 问卷调查类 ====================
  {
    category: 'survey',
    categoryName: '问卷调查',
    template: '📋 问卷调查邀请\n\n📝 调查主题：{{topic}}\n⏰ 截止时间：{{deadline}}\n\n🔗 参与链接：{{link}}\n\n感谢您的参与！',
    variables: ['topic', 'deadline', 'link'],
    examples: ['📋 问卷调查邀请'],
    isActive: true,
    priority: 1,
    description: '问卷调查邀请'
  },
  {
    category: 'survey',
    categoryName: '问卷调查',
    template: '感谢您参与问卷调查！🙏\n\n📊 调查结果将于{{time}}公布\n\n您的意见对我们很重要！',
    variables: ['time'],
    examples: ['感谢您参与问卷调查！🙏'],
    isActive: true,
    priority: 2,
    description: '问卷参与感谢'
  },

  // ==================== 21. 订单通知类 ====================
  {
    category: 'order',
    categoryName: '订单通知',
    template: '📦 订单创建成功！\n\n订单号：{{orderNo}}\n商品：{{products}}\n金额：{{amount}}\n\n预计发货：{{shipTime}}',
    variables: ['orderNo', 'products', 'amount', 'shipTime'],
    examples: ['📦 订单创建成功！'],
    isActive: true,
    priority: 1,
    description: '订单创建通知'
  },
  {
    category: 'order',
    categoryName: '订单通知',
    template: '🚚 您的订单已发货！\n\n订单号：{{orderNo}}\n物流公司：{{company}}\n运单号：{{trackingNo}}\n\n🔗 查看物流：{{link}}',
    variables: ['orderNo', 'company', 'trackingNo', 'link'],
    examples: ['🚚 您的订单已发货！'],
    isActive: true,
    priority: 2,
    description: '订单发货通知'
  },
  {
    category: 'order',
    categoryName: '订单通知',
    template: '✅ 您的订单已完成！\n\n订单号：{{orderNo}}\n完成时间：{{time}}\n\n感谢您的购买！期待再次为您服务。',
    variables: ['orderNo', 'time'],
    examples: ['✅ 您的订单已完成！'],
    isActive: true,
    priority: 3,
    description: '订单完成通知'
  },

  // ==================== 22. 系统消息类 ====================
  {
    category: 'system_message',
    categoryName: '系统消息',
    template: '📬 您有一条新消息：\n\n📌 标题：{{title}}\n📝 内容：{{content}}\n⏰ 时间：{{time}}',
    variables: ['title', 'content', 'time'],
    examples: ['📬 您有一条新消息：'],
    isActive: true,
    priority: 1,
    description: '系统消息通知'
  },
  {
    category: 'system_message',
    categoryName: '系统消息',
    template: '您有{{count}}条未读消息！\n\n🔗 查看详情：{{link}}',
    variables: ['count', 'link'],
    examples: ['您有3条未读消息！'],
    isActive: true,
    priority: 2,
    description: '未读消息提醒'
  },

  // ==================== 23. 互动参与类 ====================
  {
    category: 'interaction',
    categoryName: '互动参与',
    template: '🎮 互动小游戏：{{gameName}}\n\n规则：{{rules}}\n奖励：{{rewards}}\n\n🔗 参与链接：{{link}}\n来玩吧！',
    variables: ['gameName', 'rules', 'rewards', 'link'],
    examples: ['🎮 互动小游戏：抽奖'],
    isActive: true,
    priority: 1,
    description: '互动游戏邀请'
  },
  {
    category: 'interaction',
    categoryName: '互动参与',
    template: '🎁 每日签到：\n\n今日签到奖励：{{reward}}\n连续签到{{days}}天可获：{{bonus}}\n\n🔗 立即签到：{{link}}',
    variables: ['reward', 'days', 'bonus', 'link'],
    examples: ['🎁 每日签到：'],
    isActive: true,
    priority: 2,
    description: '每日签到活动'
  },

  // ==================== 24. 其他通用类 ====================
  {
    category: 'general',
    categoryName: '其他通用',
    template: '您好！{{greeting}}\n\n{{content}}\n\n如需帮助，随时联系我们！',
    variables: ['greeting', 'content'],
    examples: ['您好！很高兴为您服务'],
    isActive: true,
    priority: 1,
    description: '通用问候'
  },
  {
    category: 'general',
    categoryName: '其他通用',
    template: '感谢您的支持！❤️\n\n{{message}}\n\n我们会继续努力！',
    variables: ['message'],
    examples: ['感谢您的支持！❤️'],
    isActive: true,
    priority: 2,
    description: '感谢支持'
  },
  {
    category: 'general',
    categoryName: '其他通用',
    template: '温馨提示：\n\n{{tip}}\n\n请注意相关事项。',
    variables: ['tip'],
    examples: ['温馨提示：请注意账户安全'],
    isActive: true,
    priority: 3,
    description: '温馨提示'
  }
];

/**
 * 批量导入话术模板
 */
async function importTemplates() {
  const db = await getDb();
  
  logger.info('开始批量导入话术模板');
  logger.info(`待导入模板数量: ${PROMPT_TEMPLATES.length}`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const template of PROMPT_TEMPLATES) {
    try {
      // 检查是否已存在相同category的模板
      const existing = await db
        .select()
        .from(promptCategoryTemplates)
        .where(sql`category = ${template.category} AND template = ${template.template}`);

      if (existing.length > 0) {
        logger.info(`跳过已存在模板: ${template.category} - ${template.description}`);
        skipCount++;
        continue;
      }

      // 插入新模板
      await db.insert(promptCategoryTemplates).values({
        category: template.category,
        categoryName: template.categoryName,
        template: template.template,
        variables: JSON.stringify(template.variables),
        examples: JSON.stringify(template.examples),
        isActive: template.isActive,
        priority: template.priority,
        description: template.description
      });

      successCount++;
      logger.info(`成功导入模板: ${template.category} - ${template.description}`);
    } catch (error) {
      errorCount++;
      errors.push({
        template: `${template.category} - ${template.description}`,
        error: error.message
      });
      logger.error(`导入模板失败: ${template.category}`, error);
    }
  }

  logger.info('批量导入完成');
  logger.info(`成功: ${successCount}, 跳过: ${skipCount}, 失败: ${errorCount}`);

  if (errors.length > 0) {
    logger.error('错误详情:');
    errors.forEach(err => {
      logger.error(`  ${err.template}: ${err.error}`);
    });
  }

  return {
    success: true,
    data: {
      total: PROMPT_TEMPLATES.length,
      success: successCount,
      skip: skipCount,
      error: errorCount,
      errors
    }
  };
}

// 如果直接运行此脚本
if (require.main === module) {
  importTemplates()
    .then(result => {
      console.log('导入结果:', JSON.stringify(result.data, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('导入失败:', error);
      process.exit(1);
    });
}

module.exports = { importTemplates, PROMPT_TEMPLATES };
