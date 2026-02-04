/**
 * AI模块API路由
 * 提供AI模型、AI角色、话术模板的管理接口
 */

console.log('[ai-module.api.js] AI模块API路由文件已加载');

const { getDb } = require('coze-coding-dev-sdk');
const {
  aiModels,
  aiProviders,
  aiRoles,
  promptCategoryTemplates,
  aiModelUsage,
  aiBudgetSettings
} = require('../database/schema');
const { eq, asc, desc, and, sql } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');
const AIUsageTracker = require('../services/ai/AIUsageTracker');
const retryRateLimiter = require('../services/ai/AIRetryRateLimiter');
const AIBudgetManager = require('../services/ai/AIBudgetManager');

const logger = getLogger('AI_MODULE_API');

/**
 * GET /api/ai/models - 获取所有AI模型
 */
async function getAIModels(request, reply) {
  try {
    const db = await getDb();

    const result = await db
      .select({
        id: aiModels.id,
        name: aiModels.name,
        displayName: aiModels.displayName,
        modelId: aiModels.modelId,
        type: aiModels.type,
        capabilities: aiModels.capabilities,
        maxTokens: aiModels.maxTokens,
        isEnabled: aiModels.isEnabled,
        priority: aiModels.priority,
        description: aiModels.description,
        providerName: aiProviders.name,
        providerDisplayName: aiProviders.displayName,
        createdAt: aiModels.createdAt,
        updatedAt: aiModels.updatedAt
      })
      .from(aiModels)
      .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
      .orderBy(asc(aiModels.priority), asc(aiModels.createdAt));

    return reply.send({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    logger.error('获取AI模型失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/models - 创建AI模型
 */
async function createAIModel(request, reply) {
  const {
    providerId,
    provider_id,
    name,
    displayName,
    modelId,
    type,
    capabilities,
    maxTokens,
    isEnabled,
    priority,
    description
  } = request.body;

  try {
    const db = await getDb();

    const result = await db.insert(aiModels).values({
      providerId: providerId || provider_id,
      name,
      displayName,
      modelId,
      type,
      capabilities: capabilities || [],
      maxTokens: maxTokens || 2000,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      priority: priority || 10,
      description
    }).returning();

    return reply.send({
      success: true,
      data: result[0],
      message: 'AI模型创建成功'
    });
  } catch (error) {
    logger.error('创建AI模型失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * PUT /api/ai/models/:id - 更新AI模型
 */
async function updateAIModel(request, reply) {
  const { id } = request.params;
  const {
    name,
    displayName,
    isEnabled,
    priority,
    description,
    config
  } = request.body;

  try {
    const db = await getDb();

    // 构建更新对象
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (priority !== undefined) updateData.priority = priority;
    if (description !== undefined) updateData.description = description;
    if (config !== undefined) updateData.config = config;
    updateData.updatedAt = new Date();

    const result = await db.update(aiModels)
      .set(updateData)
      .where(eq(aiModels.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'AI模型不存在'
      });
    }

    return reply.send({
      success: true,
      data: result[0],
      message: 'AI模型更新成功'
    });
  } catch (error) {
    logger.error('更新AI模型失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * DELETE /api/ai/models/:id - 删除AI模型
 */
async function deleteAIModel(request, reply) {
  const { id } = request.params;

  try {
    const db = await getDb();

    const result = await db.delete(aiModels)
      .where(eq(aiModels.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'AI模型不存在'
      });
    }

    return reply.send({
      success: true,
      message: 'AI模型删除成功'
    });
  } catch (error) {
    logger.error('删除AI模型失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/models/:id/health-check - 健康检查
 */
async function healthCheckAIModel(request, reply) {
  const { id } = request.params;

  try {
    const db = await getDb();

    // 获取模型信息
    const modelResult = await db
      .select()
      .from(aiModels)
      .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
      .where(eq(aiModels.id, id))
      .limit(1);

    if (modelResult.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'AI模型不存在'
      });
    }

    const model = modelResult[0];

    // 调用AI服务进行健康检查
    const AIServiceFactory = require('../services/ai/AIServiceFactory');
    const aiService = AIServiceFactory.createService({
      provider: model.ai_providers?.name,
      modelId: model.ai_models?.modelId,
      modelIdStr: model.ai_models?.id, // 数据库中的ID
      providerId: model.ai_providers?.id, // 数据库中的提供商ID
      apiKey: model.ai_providers?.apiKey,
      apiEndpoint: model.ai_providers?.apiEndpoint
    });

    const startTime = Date.now();
    const healthResult = await aiService.healthCheck();
    const responseTime = Date.now() - startTime;

    return reply.send({
      success: true,
      data: {
        modelId: id,
        modelName: model.ai_models?.displayName,
        providerName: model.ai_providers?.displayName,
        healthy: healthResult.healthy,
        responseTime: responseTime,
        error: healthResult.error,
        timestamp: new Date().toISOString()
      },
      message: healthResult.healthy ? '健康检查通过' : '健康检查失败'
    });
  } catch (error) {
    logger.error('健康检查失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/personas - 获取所有AI角色
 */
async function getAIPersonas(request, reply) {
  try {
    const db = await getDb();

    const result = await db
      .select({
        id: aiRoles.id,
        name: aiRoles.name,
        type: aiRoles.type,
        category: aiRoles.category,
        description: aiRoles.description,
        systemPrompt: aiRoles.systemPrompt,
        temperature: aiRoles.temperature,
        maxTokens: aiRoles.maxTokens,
        modelId: aiRoles.modelId,
        modelName: aiModels.displayName,
        isActive: aiRoles.isActive,
        isDefault: aiRoles.isDefault,
        createdAt: aiRoles.createdAt,
        updatedAt: aiRoles.updatedAt
      })
      .from(aiRoles)
      .leftJoin(aiModels, eq(aiRoles.modelId, aiModels.id))
      .orderBy(desc(aiRoles.isDefault), asc(aiRoles.createdAt));

    return reply.send({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    logger.error('获取AI角色失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/personas - 创建AI角色
 */
async function createAIPersona(request, reply) {
  const {
    name,
    type,
    category,
    description,
    systemPrompt,
    temperature,
    maxTokens,
    modelId,
    isActive,
    isDefault
  } = request.body;

  try {
    const db = await getDb();

    const result = await db.insert(aiRoles).values({
      name,
      type,
      category,
      description,
      systemPrompt,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 2000,
      modelId,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault || false
    }).returning();

    return reply.send({
      success: true,
      data: result[0],
      message: 'AI角色创建成功'
    });
  } catch (error) {
    logger.error('创建AI角色失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * PUT /api/ai/personas/:id - 更新AI角色
 */
async function updateAIPersona(request, reply) {
  const { id } = request.params;
  const {
    name,
    type,
    category,
    description,
    systemPrompt,
    temperature,
    maxTokens,
    modelId,
    isActive
  } = request.body;

  try {
    const db = await getDb();

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (modelId !== undefined) updateData.modelId = modelId;
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.updatedAt = new Date();

    const result = await db.update(aiRoles)
      .set(updateData)
      .where(eq(aiRoles.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'AI角色不存在'
      });
    }

    return reply.send({
      success: true,
      data: result[0],
      message: 'AI角色更新成功'
    });
  } catch (error) {
    logger.error('更新AI角色失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * DELETE /api/ai/personas/:id - 删除AI角色
 */
async function deleteAIPersona(request, reply) {
  const { id } = request.params;

  try {
    const db = await getDb();

    // 检查是否是默认角色
    const checkResult = await db
      .select({ isDefault: aiRoles.isDefault })
      .from(aiRoles)
      .where(eq(aiRoles.id, id))
      .limit(1);

    if (checkResult.length > 0 && checkResult[0].isDefault) {
      return reply.code(400).send({
        success: false,
        error: '默认角色不能删除'
      });
    }

    const result = await db.delete(aiRoles)
      .where(eq(aiRoles.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'AI角色不存在'
      });
    }

    return reply.send({
      success: true,
      message: 'AI角色删除成功'
    });
  } catch (error) {
    logger.error('删除AI角色失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/templates - 获取所有话术模板
 */
async function getMessageTemplates(request, reply) {
  const { category, is_active } = request.query;

  try {
    const db = await getDb();

    const conditions = [];
    
    if (category) {
      conditions.push(eq(promptCategoryTemplates.category, category));
    }

    if (is_active !== undefined) {
      conditions.push(eq(promptCategoryTemplates.isActive, is_active === 'true'));
    }

    let query = db
      .select()
      .from(promptCategoryTemplates)
      .orderBy(asc(promptCategoryTemplates.priority), asc(promptCategoryTemplates.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;

    return reply.send({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    logger.error('获取话术模板失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/templates - 创建话术模板
 */
async function createMessageTemplate(request, reply) {
  const {
    category,
    categoryName,
    template,
    variables,
    examples,
    isActive,
    priority,
    description
  } = request.body;

  try {
    const db = await getDb();

    const result = await db.insert(promptCategoryTemplates).values({
      category,
      categoryName,
      template,
      variables: variables || [],
      examples: examples || [],
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 5,
      description
    }).returning();

    return reply.send({
      success: true,
      data: result[0],
      message: '话术模板创建成功'
    });
  } catch (error) {
    logger.error('创建话术模板失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * PUT /api/ai/templates/:id - 更新话术模板
 */
async function updateMessageTemplate(request, reply) {
  const { id } = request.params;
  const {
    category,
    categoryName,
    template,
    variables,
    examples,
    isActive,
    priority,
    description
  } = request.body;

  try {
    const db = await getDb();

    const updateData = {};
    if (category !== undefined) updateData.category = category;
    if (categoryName !== undefined) updateData.categoryName = categoryName;
    if (template !== undefined) updateData.template = template;
    if (variables !== undefined) updateData.variables = variables;
    if (examples !== undefined) updateData.examples = examples;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = priority;
    if (description !== undefined) updateData.description = description;
    updateData.updatedAt = new Date();

    const result = await db.update(promptCategoryTemplates)
      .set(updateData)
      .where(eq(promptCategoryTemplates.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        success: false,
        error: '话术模板不存在'
      });
    }

    return reply.send({
      success: true,
      data: result[0],
      message: '话术模板更新成功'
    });
  } catch (error) {
    logger.error('更新话术模板失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * DELETE /api/ai/templates/:id - 删除话术模板
 */
async function deleteMessageTemplate(request, reply) {
  const { id } = request.params;

  try {
    const db = await getDb();

    const result = await db.delete(promptCategoryTemplates)
      .where(eq(promptCategoryTemplates.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        success: false,
        error: '话术模板不存在'
      });
    }

    return reply.send({
      success: true,
      message: '话术模板删除成功'
    });
  } catch (error) {
    logger.error('删除话术模板失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/test - AI调试接口
 */
async function testAI(request, reply) {
  const { input, modelId, model_id, type = 'intent' } = request.body;

  if (!input || (!modelId && !model_id)) {
    return reply.code(400).send({
      success: false,
      error: '缺少必要参数: input 和 modelId'
    });
  }

  try {
    const db = await getDb();

    // 获取模型信息
    const modelResult = await db
      .select()
      .from(aiModels)
      .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
      .where(eq(aiModels.id, modelId || model_id))
      .limit(1);

    if (modelResult.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'AI模型不存在'
      });
    }

    const model = modelResult[0];
    
    // 调用AI服务
    const AIServiceFactory = require('../services/ai/AIServiceFactory');
    const aiService = AIServiceFactory.createService({
      provider: model.ai_providers?.name,
      modelId: model.ai_models?.modelId,
      apiKey: model.ai_providers?.apiKey,
      apiEndpoint: model.ai_providers?.apiEndpoint,
      temperature: 0.7,
      maxTokens: model.ai_models?.maxTokens
    });

    let result;
    const startTime = Date.now();

    if (type === 'intent') {
      // 意图识别
      result = await aiService.recognizeIntent(input, {
        robotId: 'test',
        sessionId: 'test-session'
      });
    } else if (type === 'reply') {
      // 生成回复
      result = await aiService.generateReply([
        { role: 'user', content: input }
      ], {});
    } else {
      return reply.code(400).send({
        success: false,
        error: '不支持的测试类型'
      });
    }

    const latency = Date.now() - startTime;

    return reply.send({
      success: true,
      data: {
        type,
        input,
        model: model.ai_models?.displayName,
        result,
        latency,
        timestamp: new Date().toISOString()
      },
      message: 'AI测试成功'
    });
  } catch (error) {
    logger.error('AI测试失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/usage/stats - 获取AI使用统计
 */
async function getUsageStats(request, reply) {
  try {
    const { startDate, endDate, modelId, providerId, operationType } = request.query;

    const result = await AIUsageTracker.getUsageStats({
      startDate,
      endDate,
      modelId,
      providerId,
      operationType
    });

    if (!result.success) {
      return reply.code(500).send({
        success: false,
        error: result.error
      });
    }

    return reply.send(result);
  } catch (error) {
    logger.error('获取使用统计失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/usage/ranking - 获取模型使用排名
 */
async function getModelRanking(request, reply) {
  try {
    const { startDate, endDate } = request.query;

    const result = await AIUsageTracker.getModelRanking(startDate, endDate);

    if (!result.success) {
      return reply.code(500).send({
        success: false,
        error: result.error
      });
    }

    return reply.send(result);
  } catch (error) {
    logger.error('获取模型排名失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/protection/stats - 获取限流和熔断器统计
 */
async function getProtectionStats(request, reply) {
  try {
    const stats = retryRateLimiter.getStats();

    return reply.send({
      success: true,
      data: {
        rateLimit: stats.rateLimit,
        circuitBreaker: stats.circuitBreaker,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('获取保护统计失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/providers - 获取所有提供商
 */
async function getProviders(request, reply) {
  try {
    const db = await getDb();

    const result = await db
      .select()
      .from(aiProviders)
      .orderBy(asc(aiProviders.priority));

    return reply.send({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取提供商失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * PUT /api/ai/providers/:id - 更新提供商配置
 */
async function updateProvider(request, reply) {
  const { id } = request.params;
  const { apiKey, apiEndpoint } = request.body;

  try {
    const db = await getDb();

    const updateData = {};
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (apiEndpoint !== undefined) updateData.apiEndpoint = apiEndpoint;
    updateData.updatedAt = new Date();

    const result = await db
      .update(aiProviders)
      .set(updateData)
      .where(eq(aiProviders.id, id))
      .returning();

    return reply.send({
      success: true,
      data: result[0],
      message: '提供商配置更新成功'
    });
  } catch (error) {
    logger.error('更新提供商失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/providers/:id/test - 测试提供商API Key
 */
async function testProvider(request, reply) {
  const { id } = request.params;

  try {
    const db = await getDb();

    const provider = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.id, id))
      .limit(1);

    if (provider.length === 0) {
      return reply.code(404).send({
        success: false,
        error: '提供商不存在'
      });
    }

    const providerData = provider[0];

    if (!providerData.apiKey) {
      return reply.code(400).send({
        success: false,
        error: 'API Key未配置'
      });
    }

    // 简单测试：使用AI服务工厂创建一个测试调用
    const AIServiceFactory = require('../services/ai/AIServiceFactory');
    const aiService = AIServiceFactory.createService({
      provider: providerData.name,
      modelId: 'test',
      apiKey: providerData.apiKey,
      apiEndpoint: providerData.apiEndpoint
    });

    // 获取该提供商的第一个模型进行测试
    const model = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.providerId, id))
      .limit(1);

    if (model.length > 0) {
      // 使用真实模型进行测试
      const testService = AIServiceFactory.createService({
        provider: providerData.name,
        modelId: model[0].modelId,
        apiKey: providerData.apiKey,
        apiEndpoint: providerData.apiEndpoint
      });

      const healthResult = await testService.healthCheck();

      if (healthResult.healthy) {
        return reply.send({
          success: true,
          data: {
            healthy: true,
            responseTime: healthResult.responseTime
          },
          message: 'API Key测试成功'
        });
      } else {
        return reply.code(400).send({
          success: false,
          error: healthResult.error || 'API Key测试失败'
        });
      }
    }

    // 如果没有模型，仅验证API Key格式
    if (providerData.apiKey.length < 10) {
      return reply.code(400).send({
        success: false,
        error: 'API Key格式不正确'
      });
    }

    return reply.send({
      success: true,
      message: 'API Key格式验证通过'
    });
  } catch (error) {
    logger.error('测试提供商失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/budget/settings - 获取预算设置
 */
async function getBudgetSettings(request, reply) {
  try {
    const organizationId = request.headers['x-organization-id'] || 'default';
    const settings = await AIBudgetManager.getBudgetSettings(organizationId);

    return reply.send({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('获取预算设置失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * PUT /api/ai/budget/settings - 更新预算设置
 */
async function updateBudgetSettings(request, reply) {
  try {
    const organizationId = request.headers['x-organization-id'] || 'default';
    const updates = request.body;

    const settings = await AIBudgetManager.updateBudgetSettings(organizationId, updates);

    return reply.send({
      success: true,
      data: settings,
      message: '预算设置更新成功'
    });
  } catch (error) {
    logger.error('更新预算设置失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/budget/status - 获取预算状态
 */
async function getBudgetStatus(request, reply) {
  try {
    const organizationId = request.headers['x-organization-id'] || 'default';
    const status = await AIBudgetManager.checkBudgetStatus(organizationId);

    return reply.send({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('获取预算状态失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/budget/trend - 获取预算使用趋势
 */
async function getBudgetTrend(request, reply) {
  try {
    const organizationId = request.headers['x-organization-id'] || 'default';
    const days = parseInt(request.query.days) || 7;
    const trend = await AIBudgetManager.getBudgetTrend(organizationId, days);

    return reply.send({
      success: true,
      data: trend
    });
  } catch (error) {
    logger.error('获取预算趋势失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}

module.exports = async function (fastify, options) {
  // AI模型管理
  fastify.get('/models', getAIModels);
  fastify.post('/models', createAIModel);
  fastify.put('/models/:id', updateAIModel);
  fastify.delete('/models/:id', deleteAIModel);
  fastify.post('/models/:id/health-check', healthCheckAIModel);

  // AI角色管理
  fastify.get('/personas', getAIPersonas);
  fastify.post('/personas', createAIPersona);
  fastify.put('/personas/:id', updateAIPersona);
  fastify.delete('/personas/:id', deleteAIPersona);

  // 话术模板管理
  fastify.get('/templates', getMessageTemplates);
  fastify.post('/templates', createMessageTemplate);
  fastify.put('/templates/:id', updateMessageTemplate);
  fastify.delete('/templates/:id', deleteMessageTemplate);

  // AI调试
  fastify.post('/test', testAI);

  // AI使用统计
  fastify.get('/usage/stats', getUsageStats);
  fastify.get('/usage/ranking', getModelRanking);

  // 限流和熔断统计
  fastify.get('/protection/stats', getProtectionStats);

  // 提供商管理
  fastify.get('/providers', getProviders);
  fastify.put('/providers/:id', updateProvider);
  fastify.post('/providers/:id/test', testProvider);

  // 预算管理
  fastify.get('/budget/settings', getBudgetSettings);
  fastify.put('/budget/settings', updateBudgetSettings);
  fastify.get('/budget/status', getBudgetStatus);
  fastify.get('/budget/trend', getBudgetTrend);
};
