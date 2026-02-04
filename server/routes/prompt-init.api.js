/**
 * Prompt 默认模板初始化 API
 */

const { getDb } = require('coze-coding-dev-sdk');
const { prompt_templates } = require('../database/schema');
const { eq, sql } = require('drizzle-orm');

// 默认模板定义
const DEFAULT_TEMPLATES = [
  {
    id: 'default-intent-recognition',
    name: '默认意图识别模板',
    type: 'intentRecognition',
    description: '企业微信群消息意图识别默认模板',
    systemPrompt: `你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- chat: 闲聊、问候、日常对话
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}`,
    variables: [],
    version: '1.0',
    isActive: true,
    createdBy: 'system'
  },
  {
    id: 'default-service-reply',
    name: '默认客服回复模板',
    type: 'serviceReply',
    description: '企业微信群客服回复默认模板',
    systemPrompt: `你是一个企业微信群客服助手。请根据用户问题和意图，生成专业、友好、自然的回复。

回复要求：
1. 根据意图类型调整回复风格：
   - service/help/welcome: 专业、详细、有耐心
   - chat: 轻松、友好、简短
   - 其他意图: 礼貌、得体
2. 语言简洁明了，控制在 200 字以内（闲聊可以更短）
3. 语气亲切友好，适度使用表情符号增加亲和力
4. 避免敏感词汇和不当内容
5. 闲聊时可以更随意、更活泼
6. 如果需要人工介入，明确提示`,
    variables: [],
    version: '1.0',
    isActive: true,
    createdBy: 'system'
  },
  {
    id: 'default-report',
    name: '默认报告生成模板',
    type: 'report',
    description: '日终报告生成默认模板',
    systemPrompt: `你是一个数据分析师。请根据以下数据生成日终总结报告。

报告要求：
1. 包含关键指标统计（消息数、回复数、人工介入数等）
2. 识别问题和风险
3. 提出改进建议
4. 语言简洁专业`,
    variables: [],
    version: '1.0',
    isActive: true,
    createdBy: 'system'
  },
  {
    id: 'default-conversion',
    name: '默认转化客服模板',
    type: 'conversion',
    description: '用户转化客服默认模板',
    systemPrompt: `你是一个专业的转化客服。请根据用户需求和兴趣，引导用户完成转化。

回复要求：
1. 深入了解用户需求和痛点
2. 提供有针对性的解决方案
3. 突出产品/服务的核心价值
4. 适时引导用户采取下一步行动
5. 保持专业但不失亲和力`,
    variables: [],
    version: '1.0',
    isActive: true,
    createdBy: 'system'
  }
];

const promptInitApiRoutes = async function (fastify, options) {
  console.log('[prompt-init.api.js] Prompt 默认模板初始化 API 路由已加载');

  // 检查默认模板是否存在
  fastify.get('/prompt-templates/check-default', async (request, reply) => {
    try {
      const db = await getDb();
      const defaultIds = DEFAULT_TEMPLATES.map(t => t.id);

      // 查询现有模板
      const existingTemplates = await db
        .select()
        .from(prompt_templates)
        .where(sql`${prompt_templates.id} = ANY(${defaultIds})`);

      const existingIds = existingTemplates.map(t => t.id);
      const missingTemplates = DEFAULT_TEMPLATES.filter(t => !existingIds.includes(t.id));

      return reply.send({
        code: 0,
        message: 'success',
        data: {
          total: DEFAULT_TEMPLATES.length,
          existing: existingTemplates.length,
          missing: missingTemplates.length,
          existingIds,
          missingIds: missingTemplates.map(t => t.id)
        }
      });
    } catch (error) {
      console.error('检查默认模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '检查默认模板失败',
        error: error.message
      });
    }
  });

  // 重新初始化默认模板
  fastify.post('/prompt-templates/init-default', async (request, reply) => {
    try {
      const { force = false } = request.body;
      const db = await getDb();
      const { sql } = require('drizzle-orm');

      let created = 0;
      let skipped = 0;
      const results = [];

      for (const template of DEFAULT_TEMPLATES) {
        try {
          // 检查模板是否已存在
          const existing = await db
            .select()
            .from(prompt_templates)
            .where(eq(prompt_templates.id, template.id))
            .limit(1);

          if (existing.length > 0) {
            // 如果存在且不是强制模式，跳过
            if (!force) {
              skipped++;
              results.push({
                id: template.id,
                name: template.name,
                status: 'skipped',
                reason: '已存在'
              });
              continue;
            }

            // 强制模式：更新现有模板
            await db
              .update(prompt_templates)
              .set({
                name: template.name,
                type: template.type,
                description: template.description,
                systemPrompt: template.systemPrompt,
                variables: template.variables,
                version: template.version,
                isActive: template.isActive,
                updatedAt: new Date()
              })
              .where(eq(prompt_templates.id, template.id));

            created++;
            results.push({
              id: template.id,
              name: template.name,
              status: 'updated',
              reason: '强制更新'
            });
          } else {
            // 不存在，插入新模板
            await db.insert(prompt_templates).values({
              ...template,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            created++;
            results.push({
              id: template.id,
              name: template.name,
              status: 'created',
              reason: '新建'
            });
          }
        } catch (error) {
          console.error(`初始化模板 ${template.id} 失败:`, error);
          results.push({
            id: template.id,
            name: template.name,
            status: 'error',
            reason: error.message
          });
        }
      }

      return reply.send({
        code: 0,
        message: '默认模板初始化完成',
        data: {
          total: DEFAULT_TEMPLATES.length,
          created,
          skipped,
          results
        }
      });
    } catch (error) {
      console.error('初始化默认模板失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '初始化默认模板失败',
        error: error.message
      });
    }
  });
};

module.exports = promptInitApiRoutes;
