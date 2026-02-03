/**
 * Prompt 训练服务
 * 管理 Prompt 模板、测试记录和效果评估
 */

const { getDb } = require('coze-coding-dev-sdk');
const { prompt_templates, prompt_tests } = require('../database/schema');
const { eq, and, sql, count, isNull } = require('drizzle-orm');
const { LLMClient, Config } = require('coze-coding-dev-sdk');

class PromptService {
  /**
   * 获取所有 Prompt 模板
   */
  async getAllTemplates(filters = {}) {
    const { type, isActive } = filters;
    const db = await getDb();

    let query = db.select().from(prompt_templates);

    if (type) {
      query = query.where(eq(prompt_templates.type, type));
    }

    if (isActive !== undefined) {
      query = query.where(eq(prompt_templates.isActive, isActive));
    }

    return await query.orderBy(sql`${prompt_templates.createdAt} DESC`);
  }

  /**
   * 根据 ID 获取 Prompt 模板
   */
  async getTemplateById(id) {
    const db = await getDb();
    const templates = await db
      .select()
      .from(prompt_templates)
      .where(eq(prompt_templates.id, id))
      .limit(1);

    return templates[0] || null;
  }

  /**
   * 创建 Prompt 模板
   */
  async createTemplate(data) {
    const db = await getDb();
    const id = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTemplate = {
      id,
      name: data.name,
      type: data.type || 'custom',
      description: data.description || '',
      systemPrompt: data.systemPrompt || '',
      variables: data.variables || [],
      version: data.version || '1.0',
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: data.createdBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(prompt_templates).values(newTemplate);

    return await this.getTemplateById(id);
  }

  /**
   * 更新 Prompt 模板
   */
  async updateTemplate(id, data) {
    const db = await getDb();
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await db
      .update(prompt_templates)
      .set(updateData)
      .where(eq(prompt_templates.id, id));

    return await this.getTemplateById(id);
  }

  /**
   * 删除 Prompt 模板
   */
  async deleteTemplate(id) {
    const db = await getDb();
    await db.delete(prompt_templates).where(eq(prompt_templates.id, id));
    return true;
  }

  /**
   * 激活/停用 Prompt 模板
   */
  async toggleTemplateStatus(id, isActive) {
    const db = await getDb();
    await db
      .update(prompt_templates)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(prompt_templates.id, id));

    return await this.getTemplateById(id);
  }

  /**
   * 运行 Prompt 测试
   * 支持两种模式：
   * 1. 使用现有模板（传递 templateId）
   * 2. 直接使用 prompt 内容（传递 systemPrompt 和 userPrompt）
   */
  async runTest(testData) {
    const startTime = Date.now();
    let template = null;

    // 如果提供了 templateId，从数据库加载模板
    if (testData.templateId) {
      template = await this.getTemplateById(testData.templateId);
      if (!template) {
        throw new Error('Template not found');
      }
    }

    try {
      const sdkConfig = new Config();
      const client = new LLMClient(sdkConfig);

      // 构建消息：使用传递的 prompt 或模板中的 prompt
      const systemPrompt = testData.systemPrompt || (template?.systemPrompt);
      const userPrompt = testData.userPrompt || testData.inputMessage || '';

      if (!systemPrompt) {
        throw new Error('System prompt is required');
      }

      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ];

      // 获取 AI 配置
      const aiConfig = testData.aiConfig || {};
      const modelId = testData.model || aiConfig.modelId || 'doubao-seed-1-8-251228';
      const temperature = testData.temperature !== undefined ? testData.temperature : (aiConfig.temperature || 0.7);
      const maxTokens = testData.maxTokens || aiConfig.maxTokens || 2000;

      // 调用 AI
      const response = await client.invoke(messages, {
        model: modelId,
        temperature: temperature,
        maxTokens: maxTokens,
      });

      const duration = Date.now() - startTime;
      const aiOutput = response.content;

      // 如果有模板且是意图识别场景，解析结果
      let actualIntent = null;
      let isCorrect = null;

      if (template && template.type === 'intentRecognition' && testData.expectedIntent) {
        try {
          const cleanContent = aiOutput.replace(/```json\n?|\n?```/g, '').trim();
          const result = JSON.parse(cleanContent);
          actualIntent = result.intent || result.intentType;
          isCorrect = actualIntent === testData.expectedIntent;
        } catch (e) {
          console.warn('无法解析意图识别结果:', e.message);
        }
      }

      // 只在有 templateId 时保存测试记录
      let testRecord = null;
      if (testData.templateId) {
        const db = await getDb();
        testRecord = {
          templateId: testData.templateId,
          testName: testData.testName,
          inputMessage: userPrompt,
          variables: testData.variables || {},
          aiOutput,
          expectedOutput: testData.expectedOutput,
          expectedIntent: testData.expectedIntent,
          actualIntent,
          isCorrect,
          modelId,
          temperature,
          requestDuration: duration,
          status: 'success',
          createdBy: testData.createdBy || 'system',
          createdAt: new Date(),
        };

        await db.insert(prompt_tests).values(testRecord);
      }

      // 返回结果
      return {
        response: aiOutput,
        latency: duration,
        modelId,
        temperature,
        actualIntent,
        isCorrect,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // 只在有 templateId 时保存失败记录
      if (testData.templateId) {
        const db = await getDb();
        const testRecord = {
          templateId: testData.templateId,
          testName: testData.testName,
          inputMessage: testData.userPrompt || testData.inputMessage,
          variables: testData.variables || {},
          status: 'error',
          errorMessage: error.message,
          requestDuration: duration,
          createdBy: testData.createdBy || 'system',
          createdAt: new Date(),
        };

        await db.insert(prompt_tests).values(testRecord);
      }

      throw error;
    }
  }

  /**
   * 获取测试记录列表
   */
  async getTests(filters = {}) {
    const db = await getDb();
    const { templateId, status, limit = 50, offset = 0 } = filters;

    let query = db.select().from(prompt_tests);

    if (templateId) {
      query = query.where(eq(prompt_tests.templateId, templateId));
    }

    if (status) {
      query = query.where(eq(prompt_tests.status, status));
    }

    return await query
      .orderBy(sql`${prompt_tests.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  }

  /**
   * 根据 ID 获取测试记录
   */
  async getTestById(id) {
    const db = await getDb();
    const tests = await db
      .select()
      .from(prompt_tests)
      .where(eq(prompt_tests.id, id))
      .limit(1);

    return tests[0] || null;
  }

  /**
   * 更新测试记录（评分、反馈）
   */
  async updateTest(id, data) {
    const db = await getDb();
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await db
      .update(prompt_tests)
      .set(updateData)
      .where(eq(prompt_tests.id, id));

    return await this.getTestById(id);
  }

  /**
   * 删除测试记录
   */
  async deleteTest(id) {
    const db = await getDb();
    await db.delete(prompt_tests).where(eq(prompt_tests.id, id));
    return true;
  }

  /**
   * 获取测试统计
   */
  async getTestStatistics(templateId) {
    const db = await getDb();

    const query = db
      .select({
        total: count(),
        success: count(sql`CASE WHEN ${prompt_tests.status} = 'success' THEN 1 END`),
        error: count(sql`CASE WHEN ${prompt_tests.status} = 'error' THEN 1 END`),
        correct: count(sql`CASE WHEN ${prompt_tests.isCorrect} = true THEN 1 END`),
        avgDuration: sql`AVG(${prompt_tests.requestDuration})`,
      })
      .from(prompt_tests);

    if (templateId) {
      query.where(eq(prompt_tests.templateId, templateId));
    }

    const result = await query.limit(1);
    return result[0] || {};
  }

  /**
   * 批量测试
   */
  async batchTest(templateId, testCases, aiConfig) {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const results = [];
    for (const testCase of testCases) {
      try {
        const result = await this.runTest({
          templateId,
          ...testCase,
          aiConfig,
        });
        results.push({
          testCase,
          result,
          status: 'success',
        });
      } catch (error) {
        results.push({
          testCase,
          result: null,
          status: 'error',
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = new PromptService();
