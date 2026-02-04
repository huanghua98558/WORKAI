const { readFileSync } = require('fs');
const { join } = require('path');
const fs = require('fs').promises;
const { getDb } = require('coze-coding-dev-sdk');
const { getLogger } = require('../lib/logger');
const { intentConfigs } = require('../database/schema');

const logger = getLogger('INTENT_CONFIG_API');

const intentConfigApiRoutes = async function (fastify, options) {
  console.log('[intent-config.api.js] 意图配置 API 路由已加载');

  // 默认提示词配置文件路径
  const DEFAULT_PROMPTS_PATH = join(__dirname, '../config/default-prompts.js');

  // 读取默认提示词
  async function getDefaultPrompts() {
    try {
      const content = await fs.readFile(DEFAULT_PROMPTS_PATH, 'utf-8');
      // 解析文件内容（这是 JS 模块，需要提取）
      const match = content.match(/module\.exports\s*=\s*(\{[\s\S]*\})/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      throw new Error('无法解析默认提示词配置');
    } catch (error) {
      console.error('读取默认提示词失败:', error);
      return null;
    }
  }

  // 获取所有意图配置
  fastify.get('/', async (request, reply) => {
    try {
      const db = await getDb();
      const intents = await db
        .select()
        .from(intentConfigs)
        .orderBy(intentConfigs.createdAt);

      // 如果没有配置，从默认配置创建
      if (intents.length === 0) {
        const defaultPrompts = await getDefaultPrompts();
        if (defaultPrompts) {
          const configs = Object.keys(defaultPrompts).map(type => ({
            intentType: type,
            intentName: defaultPrompts[type].intentName,
            intentDescription: defaultPrompts[type].description,
            systemPrompt: defaultPrompts[type].prompt,
            isEnabled: true,
          }));

          await db.insert('intent_configs').values(configs);
          return reply.send({
            code: 0,
            message: 'success',
            data: configs.map(c => ({
              id: c.id,
              intentType: c.intentType,
              intentName: c.intentName,
              intentDescription: c.intentDescription,
              systemPrompt: c.systemPrompt,
              isEnabled: c.isEnabled,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            })),
          });
        }
      }

      reply.send({
        code: 0,
        message: 'success',
        data: intents.map(i => ({
          id: i.id,
          intentType: i.intentType,
          intentName: i.intentName,
          intentDescription: i.intentDescription,
          systemPrompt: i.systemPrompt,
          isEnabled: i.isEnabled,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        })),
      });
    } catch (error) {
      console.error('获取意图配置失败:', error);
      reply.status(500).send({
        code: -1,
        message: error.message,
      });
    }
  });

  // 获取单个意图配置
  fastify.get('/:intentType', async (request, reply) => {
    try {
      const { intentType } = request.params;
      const db = await getDb();
      const intent = await db
        .select()
        .from(intentConfigs)
        .where(intentConfigs.intentType, intentType)
        .first();

      if (!intent) {
        return reply.status(404).send({
          code: -1,
          message: '意图配置不存在',
        });
      }

      reply.send({
        code: 0,
        message: 'success',
        data: {
          id: intent.id,
          intentType: intent.intent_type,
          intentName: intent.intent_name,
          intentDescription: intent.intent_description,
          systemPrompt: intent.system_prompt,
          isEnabled: intent.is_enabled,
          createdAt: intent.created_at,
          updatedAt: intent.updated_at,
        },
      });
    } catch (error) {
      console.error('获取意图配置失败:', error);
      reply.status(500).send({
        code: -1,
        message: error.message,
      });
    }
  });

  // 创建或更新意图配置
  fastify.post('/:intentType', async (request, reply) => {
    try {
      const { intentType } = request.params;
      const { intentName, intentDescription, systemPrompt, isEnabled } = request.body;
      const db = await getDb();

      // 检查是否已存在
      const existing = await db
        .select()
        .from(intentConfigs)
        .where(intentConfigs.intentType, intentType)
        .first();

      if (existing) {
        // 更新
        await db
          .update(intentConfigs)
          .set({
            intentName: intentName,
            intentDescription: intentDescription,
            systemPrompt: systemPrompt,
            isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled,
            updatedAt: new Date(),
          })
          .where(intentConfigs.intentType, intentType);
      } else {
        // 创建
        await db.insert(intentConfigs).values({
          intentType: intentType,
          intentName: intentName,
          intentDescription: intentDescription,
          systemPrompt: systemPrompt,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
        });
      }

      // 重新查询
      const updated = await db
        .select()
        .from(intentConfigs)
        .where(intentConfigs.intentType, intentType)
        .first();

      reply.send({
        code: 0,
        message: '保存成功',
        data: {
          id: updated.id,
          intentType: updated.intentType,
          intentName: updated.intentName,
          intentDescription: updated.intentDescription,
          systemPrompt: updated.systemPrompt,
          isEnabled: updated.isEnabled,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      console.error('保存意图配置失败:', error);
      reply.status(500).send({
        code: -1,
        message: error.message,
      });
    }
  });

  // 重置为默认配置
  fastify.post('/:intentType/reset', async (request, reply) => {
    try {
      const { intentType } = request.params;
      const db = await getDb();

      const defaultPrompts = await getDefaultPrompts();
      if (!defaultPrompts || !defaultPrompts[intentType]) {
        return reply.status(404).send({
          code: -1,
          message: '默认配置不存在',
        });
      }

      const defaultPrompt = defaultPrompts[intentType];

      // 检查是否已存在
      const existing = await db
        .select()
        .from(intentConfigs)
        .where(intentConfigs.intentType, intentType)
        .first();

      if (existing) {
        // 更新为默认
        await db
          .update(intentConfigs)
          .set({
            intentName: defaultPrompt.intentName,
            intentDescription: defaultPrompt.description,
            systemPrompt: defaultPrompt.prompt,
            updatedAt: new Date(),
          })
          .where(intentConfigs.intentType, intentType);
      } else {
        // 创建
        await db.insert(intentConfigs).values({
          intentType: intentType,
          intentName: defaultPrompt.intentName,
          intentDescription: defaultPrompt.description,
          systemPrompt: defaultPrompt.prompt,
          isEnabled: true,
        });
      }

      // 重新查询
      const updated = await db
        .select()
        .from(intentConfigs)
        .where(intentConfigs.intentType, intentType)
        .first();

      reply.send({
        code: 0,
        message: '重置成功',
        data: {
          id: updated.id,
          intentType: updated.intentType,
          intentName: updated.intentName,
          intentDescription: updated.intentDescription,
          systemPrompt: updated.systemPrompt,
          isEnabled: updated.isEnabled,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      console.error('重置意图配置失败:', error);
      reply.status(500).send({
        code: -1,
        message: error.message,
      });
    }
  });

  // 切换启用状态
  fastify.post('/:intentType/toggle', async (request, reply) => {
    try {
      const { intentType } = request.params;
      const db = await getDb();

      const intent = await db
        .select()
        .from(intentConfigs)
        .where(intentConfigs.intentType, intentType)
        .first();

      if (!intent) {
        return reply.status(404).send({
          code: -1,
          message: '意图配置不存在',
        });
      }

      await db
        .update(intentConfigs)
        .set({
          isEnabled: !intent.isEnabled,
          updatedAt: new Date(),
        })
        .where(intentConfigs.intentType, intentType);

      reply.send({
        code: 0,
        message: '状态切换成功',
        data: {
          intentType: intentType,
          isEnabled: !intent.isEnabled,
        },
      });
    } catch (error) {
      console.error('切换意图状态失败:', error);
      reply.status(500).send({
        code: -1,
        message: error.message,
      });
    }
  });
};

module.exports = intentConfigApiRoutes;
