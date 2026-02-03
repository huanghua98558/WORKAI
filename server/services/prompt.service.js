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
      type: data.type,
      description: data.description || '',
      systemPrompt: data.systemPrompt,
      variables: data.variables || [],
      version: data.version || '1.0',
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: data.createdBy || 'system',
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
   */
  async runTest(testData) {
    const startTime = Date.now();
    const template = await this.getTemplateById(testData.templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    try {
      const sdkConfig = new Config();
      const client = new LLMClient(sdkConfig);

      // 构建消息
      const messages = [
        {
          role: 'system',
          content: template.systemPrompt,
        },
        {
          role: 'user',
          content: testData.inputMessage,
        },
      ];

      // 获取 AI 配置
      const aiConfig = testData.aiConfig || {};
      const modelId = aiConfig.modelId || 'doubao-seed-1-8-251228';
      const temperature = aiConfig.temperature || 0.7;

      // 调用 AI
      const response = await client.invoke(messages, {
        model: modelId,
        temperature: temperature,
      });

      const duration = Date.now() - startTime;
      const aiOutput = response.content;

      // 如果是意图识别场景，解析结果
      let actualIntent = null;
      let isCorrect = null;

      if (template.type === 'intentRecognition' && testData.expectedIntent) {
        try {
          const cleanContent = aiOutput.replace(/```json\n?|\n?```/g, '').trim();
          const result = JSON.parse(cleanContent);
          actualIntent = result.intent || result.intentType;
          isCorrect = actualIntent === testData.expectedIntent;
        } catch (e) {
          console.warn('无法解析意图识别结果:', e.message);
        }
      }

      // 保存测试记录
      const db = await getDb();
      const testRecord = {
        templateId: testData.templateId,
        testName: testData.testName,
        inputMessage: testData.inputMessage,
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
      };

      await db.insert(prompt_tests).values(testRecord);
      
      // 返回插入的记录
      return testRecord;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 保存失败记录
      const db = await getDb();
      const testRecord = {
        templateId: testData.templateId,
        testName: testData.testName,
        inputMessage: testData.inputMessage,
        variables: testData.variables || {},
        status: 'error',
        errorMessage: error.message,
        requestDuration: duration,
        createdBy: testData.createdBy || 'system',
      };

      await db.insert(prompt_tests).values(testRecord);
      return testRecord;
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
   * 获取测试记录详情
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
      rating: data.rating,
      feedback: data.feedback,
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
    let query = db.select().from(prompt_tests);

    if (templateId) {
      query = query.where(eq(prompt_tests.templateId, templateId));
    }

    const tests = await query;

    const stats = {
      total: tests.length,
      success: 0,
      error: 0,
      correct: 0,
      incorrect: 0,
      avgRating: 0,
      avgDuration: 0,
      byType: {
        intentRecognition: { total: 0, correct: 0 },
        serviceReply: { total: 0 },
        report: { total: 0 },
      },
    };

    let totalRating = 0;
    let ratingCount = 0;
    let totalDuration = 0;

    for (const test of tests) {
      if (test.status === 'success') {
        stats.success++;
      } else {
        stats.error++;
      }

      if (test.isCorrect !== null) {
        if (test.isCorrect) {
          stats.correct++;
        } else {
          stats.incorrect++;
        }
      }

      if (test.rating) {
        totalRating += test.rating;
        ratingCount++;
      }

      if (test.requestDuration) {
        totalDuration += test.requestDuration;
      }

      // 按类型统计
      const template = test.templateId ? await this.getTemplateById(test.templateId) : null;
      if (template) {
        if (stats.byType[template.type]) {
          stats.byType[template.type].total++;
          if (template.type === 'intentRecognition' && test.isCorrect) {
            stats.byType[template.type].correct++;
          }
        }
      }
    }

    if (ratingCount > 0) {
      stats.avgRating = (totalRating / ratingCount).toFixed(2);
    }

    if (tests.length > 0) {
      stats.avgDuration = Math.round(totalDuration / tests.length);
    }

    return stats;
  }

  /**
   * 批量测试
   */
  async batchTest(templateId, testCases, aiConfig) {
    const results = [];

    for (const testCase of testCases) {
      try {
        const result = await this.runTest({
          templateId,
          testName: testCase.testName,
          inputMessage: testCase.inputMessage,
          expectedOutput: testCase.expectedOutput,
          expectedIntent: testCase.expectedIntent,
          variables: testCase.variables || {},
          aiConfig,
          createdBy: testCase.createdBy || 'system',
        });
        results.push(result);
      } catch (error) {
        console.error('Batch test failed for case:', testCase.testName, error.message);
        results.push({
          testName: testCase.testName,
          status: 'error',
          errorMessage: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = new PromptService();
