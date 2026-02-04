/**
 * WorkTool AI 2.1 - AI核心能力服务
 * 支持多提供商（阿里云、OpenAI、Claude等）的统一AI调用接口
 */

const { getDb } = require('coze-coding-dev-sdk');
const { aiProviders, aiModels, aiRoles, aiModelUsage } = require('../database/schema');
const { eq, and, asc, desc } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');

const logger = getLogger('AI_CORE');

// ============================================
// AI核心服务类
// ============================================

class AICoreService {
  constructor() {
    this.dbPromise = null;
    this.providerCache = new Map(); // 提供商缓存
    this.modelCache = new Map(); // 模型缓存
    this.roleCache = new Map(); // 角色缓存
    this.cacheTTL = 5 * 60 * 1000; // 缓存5分钟
    this.cacheTimestamp = 0;
  }

  /**
   * 获取数据库连接
   */
  async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = getDb();
    }
    return this.dbPromise;
  }

  /**
   * 刷新缓存
   */
  async refreshCache() {
    try {
      const db = await this.getDb();

      // 查询所有启用的提供商
      const providers = await db.select()
        .from(aiProviders)
        .where(eq(aiProviders.isEnabled, true))
        .orderBy(asc(aiProviders.priority));

      // 查询所有启用的模型
      const models = await db.select()
        .from(aiModels)
        .where(eq(aiModels.isEnabled, true))
        .orderBy(asc(aiModels.priority));

      // 查询所有启用的角色
      const roles = await db.select()
        .from(aiRoles)
        .where(eq(aiRoles.isActive, true));

      // 更新缓存
      this.providerCache.clear();
      this.modelCache.clear();
      this.roleCache.clear();

      providers.forEach(p => this.providerCache.set(p.id, p));
      models.forEach(m => this.modelCache.set(m.id, m));
      roles.forEach(r => this.roleCache.set(r.id, r));

      this.cacheTimestamp = Date.now();

      logger.info('AI核心服务缓存刷新成功', {
        providers: providers.length,
        models: models.length,
        roles: roles.length
      });
    } catch (error) {
      logger.error('刷新AI核心服务缓存失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 确保缓存有效
   */
  async ensureCacheValid() {
    if (Date.now() - this.cacheTimestamp > this.cacheTTL) {
      await this.refreshCache();
    }
  }

  /**
   * AI对话（通用接口）
   */
  async chat(options) {
    await this.ensureCacheValid();

    const {
      messages,
      modelId,
      roleId,
      temperature,
      maxTokens,
      sessionId,
      operationType = 'chat',
      stream = false
    } = options;

    let model;
    let role;

    // 如果指定了角色ID，使用角色配置
    if (roleId) {
      role = this.roleCache.get(roleId);
      if (!role) {
        throw new Error(`角色不存在: ${roleId}`);
      }

      // 使用角色关联的模型
      if (role.modelId) {
        model = this.modelCache.get(role.modelId);
      }
    }

    // 如果没有找到模型，使用指定的模型ID或默认模型
    if (!model && modelId) {
      model = this.modelCache.get(modelId);
    }

    // 如果还是没有模型，使用第一个启用的模型
    if (!model) {
      const firstModel = Array.from(this.modelCache.values())[0];
      if (!firstModel) {
        throw new Error('没有可用的AI模型');
      }
      model = firstModel;
    }

    // 获取提供商
    const provider = this.providerCache.get(model.providerId);
    if (!provider) {
      throw new Error(`AI提供商不存在: ${model.providerId}`);
    }

    // 构建消息列表
    let finalMessages = messages;

    // 如果有角色，添加系统提示词
    if (role && role.systemPrompt) {
      finalMessages = [
        { role: 'system', content: role.systemPrompt },
        ...messages
      ];
    }

    // 合并参数
    const params = {
      temperature: temperature ?? (role?.temperature ?? 0.7),
      maxTokens: maxTokens ?? (role?.maxTokens ?? model?.maxTokens ?? 2000),
      model: model.modelId,
      messages: finalMessages,
      stream
    };

    logger.info('AI对话请求', {
      provider: provider.name,
      model: model.name,
      operationType,
      sessionId,
      messageCount: finalMessages.length
    });

    const startTime = Date.now();
    let result;

    try {
      // 根据提供商类型调用相应的实现
      result = await this.callProvider(provider, model, params);

      const responseTime = Date.now() - startTime;

      // 记录使用情况
      await this.recordUsage({
        modelId: model.id,
        providerId: provider.id,
        sessionId,
        operationType,
        inputTokens: result.usage?.input_tokens || 0,
        outputTokens: result.usage?.output_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0,
        inputCost: result.usage?.input_cost || 0,
        outputCost: result.usage?.output_cost || 0,
        totalCost: result.usage?.total_cost || 0,
        responseTime,
        status: 'success'
      });

      logger.info('AI对话成功', {
        provider: provider.name,
        model: model.name,
        responseTime,
        totalTokens: result.usage?.total_tokens || 0
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 记录错误使用情况
      await this.recordUsage({
        modelId: model.id,
        providerId: provider.id,
        sessionId,
        operationType,
        responseTime,
        status: 'error',
        errorMessage: error.message
      });

      logger.error('AI对话失败', {
        provider: provider.name,
        model: model.name,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 调用提供商API
   */
  async callProvider(provider, model, params) {
    // 这里使用内置的LLMClient（来自coze-coding-dev-sdk）
    // 未来可以扩展支持其他提供商

    const { LLMClient } = require('coze-coding-dev-sdk');

    // 构建LLMClient配置
    const clientConfig = {
      model: model.modelId,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      // 使用提供商的API密钥（如果有）
      apiKey: provider.apiKey || undefined,
      // 使用提供商的API端点（如果有）
      endpoint: provider.apiEndpoint || undefined
    };

    // 创建客户端
    const client = new LLMClient(clientConfig);

    // 转换消息格式（LLMClient期望的格式）
    const messages = params.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 调用API
    const response = await client.chat(messages);

    // 提取结果
    const result = {
      content: response.content || response.message?.content || '',
      usage: {
        input_tokens: response.usage?.inputTokens || response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.outputTokens || response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.totalTokens || response.usage?.total_tokens || 0,
        // 计算成本（如果模型有定价）
        input_cost: this.calculateCost(
          response.usage?.inputTokens || response.usage?.prompt_tokens || 0,
          model.inputPrice
        ),
        output_cost: this.calculateCost(
          response.usage?.outputTokens || response.usage?.completion_tokens || 0,
          model.outputPrice
        ),
        total_cost: 0 // 稍后计算
      }
    };

    // 计算总成本
    result.usage.total_cost = (parseFloat(result.usage.input_cost) || 0) + (parseFloat(result.usage.output_cost) || 0);

    return result;
  }

  /**
   * 计算成本
   */
  calculateCost(tokens, pricePer1K) {
    if (!tokens || !pricePer1K) return 0;
    return (tokens / 1000) * parseFloat(pricePer1K);
  }

  /**
   * 记录使用情况
   */
  async recordUsage(data) {
    try {
      const db = await this.getDb();

      const record = {
        id: uuidv4(),
        ...data
      };

      await db.insert(aiModelUsage).values(record);

      logger.debug('AI使用记录已保存', { recordId: record.id });
    } catch (error) {
      logger.error('记录AI使用情况失败', { error: error.message });
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 获取所有提供商
   */
  async getProviders(filters = {}) {
    await this.ensureCacheValid();

    let providers = Array.from(this.providerCache.values());

    if (filters.type) {
      providers = providers.filter(p => p.type === filters.type);
    }

    if (filters.isEnabled !== undefined) {
      providers = providers.filter(p => p.isEnabled === filters.isEnabled);
    }

    return providers;
  }

  /**
   * 获取所有模型
   */
  async getModels(filters = {}) {
    await this.ensureCacheValid();

    let models = Array.from(this.modelCache.values());

    if (filters.providerId) {
      models = models.filter(m => m.providerId === filters.providerId);
    }

    if (filters.type) {
      models = models.filter(m => m.type === filters.type);
    }

    if (filters.isEnabled !== undefined) {
      models = models.filter(m => m.isEnabled === filters.isEnabled);
    }

    return models;
  }

  /**
   * 获取所有角色
   */
  async getRoles(filters = {}) {
    await this.ensureCacheValid();

    let roles = Array.from(this.roleCache.values());

    if (filters.type) {
      roles = roles.filter(r => r.type === filters.type);
    }

    if (filters.category) {
      roles = roles.filter(r => r.category === filters.category);
    }

    if (filters.isActive !== undefined) {
      roles = roles.filter(r => r.isActive === filters.isActive);
    }

    return roles;
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(filters = {}) {
    await this.ensureCacheValid();

    const db = await this.getDb();

    let query = db.select()
      .from(aiModelUsage);

    if (filters.modelId) {
      query = query.where(eq(aiModelUsage.modelId, filters.modelId));
    }

    if (filters.providerId) {
      query = query.where(eq(aiModelUsage.providerId, filters.providerId));
    }

    if (filters.operationType) {
      query = query.where(eq(aiModelUsage.operationType, filters.operationType));
    }

    if (filters.startDate) {
      query = query.where(and(
        ...filters.startDate.map(date => eq(aiModelUsage.createdAt, date))
      ));
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    query = query.orderBy(desc(aiModelUsage.createdAt));

    return await query;
  }
}

// ============================================
// 导出
// ============================================

const aiCoreService = new AICoreService();

module.exports = {
  aiCoreService
};
