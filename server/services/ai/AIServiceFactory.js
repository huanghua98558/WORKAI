/**
 * AI服务工厂
 * 根据提供商创建对应的AI服务实例
 */

const DoubaoService = require('./DoubaoService');
const DeepSeekService = require('./DeepSeekService');
const KimiService = require('./KimiService');
const { getDb } = require('coze-coding-dev-sdk');
const { aiModels, aiProviders } = require('../../database/schema');
const { eq, sql } = require('drizzle-orm');
const { getLogger } = require('../../lib/logger');

const logger = getLogger('AI_SERVICE_FACTORY');

class AIServiceFactory {
  constructor() {
    this.serviceCache = new Map();
  }

  /**
   * 创建AI服务实例（便捷方法：从数据库加载配置）
   * @param {string} modelIdOrName - 模型ID或模型名称
   * @param {string} organizationId - 组织ID（可选）
   * @returns {Promise<Object>} AI服务实例
   */
  async createServiceByModelId(modelIdOrName, organizationId = 'default') {
    try {
      const db = await getDb();

      // 从数据库查询模型配置
      const modelData = await db
        .select({
          model: aiModels,
          provider: aiProviders
        })
        .from(aiModels)
        .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
        .where(
          sql`${aiModels.id} = ${modelIdOrName} OR ${aiModels.name} = ${modelIdOrName}`
        )
        .limit(1);

      if (modelData.length === 0) {
        throw new Error(`模型不存在: ${modelIdOrName}`);
      }

      const { model, provider } = modelData[0];

      if (!provider) {
        throw new Error(`模型 ${modelIdOrName} 的提供商不存在`);
      }

      if (!model.isEnabled) {
        throw new Error(`模型 ${modelIdOrName} 已禁用`);
      }

      // 使用数据库中的配置创建服务实例
      return this.createService({
        provider: provider.name,
        modelId: model.modelId,
        modelIdStr: model.id,
        providerId: provider.id,
        organizationId,
        apiKey: provider.apiKey,
        apiEndpoint: provider.apiEndpoint,
        temperature: 0.7,
        maxTokens: model.maxTokens
      });
    } catch (error) {
      logger.error('从数据库加载模型配置失败', { modelIdOrName, error: error.message });
      throw error;
    }
  }

  /**
   * 创建AI服务实例（便捷方法：根据类型自动选择模型）
   * @param {string} type - 模型类型 (intent, chat, reasoning, report)
   * @param {string} organizationId - 组织ID（可选）
   * @returns {Promise<Object>} AI服务实例
   */
  async createServiceByType(type, organizationId = 'default') {
    try {
      const db = await getDb();

      // 从数据库查询指定类型的模型（按优先级排序）
      const modelData = await db
        .select({
          model: aiModels,
          provider: aiProviders
        })
        .from(aiModels)
        .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
        .where(
          sql`${aiModels.type} = ${type} AND ${aiModels.isEnabled} = true`
        )
        .orderBy(sql`${aiModels.priority} ASC`)
        .limit(1);

      if (modelData.length === 0) {
        throw new Error(`没有可用的 ${type} 类型模型`);
      }

      const { model, provider } = modelData[0];

      // 使用数据库中的配置创建服务实例
      return this.createService({
        provider: provider.name,
        modelId: model.modelId,
        modelIdStr: model.id,
        providerId: provider.id,
        organizationId,
        apiKey: provider.apiKey,
        apiEndpoint: provider.apiEndpoint,
        temperature: 0.7,
        maxTokens: model.maxTokens
      });
    } catch (error) {
      logger.error('根据类型加载模型失败', { type, error: error.message });
      throw error;
    }
  }

  /**
   * 创建AI服务实例
   * @param {Object} config - 配置对象
   * @param {string} config.provider - 提供商名称 (doubao, deepseek, kimi)
   * @param {string} config.modelId - 模型ID（API调用时使用）
   * @param {string} config.modelIdStr - 模型ID（数据库中的ID）
   * @param {string} config.providerId - 提供商ID（数据库中的ID）
   * @param {string} config.organizationId - 组织ID（用于多租户）
   * @param {string} config.apiKey - API密钥
   * @param {string} config.apiEndpoint - API端点
   * @param {number} config.temperature - 温度参数
   * @param {number} config.maxTokens - 最大token数
   */
  createService(config) {
    const { provider, modelId, modelIdStr, providerId, organizationId, apiKey, apiEndpoint, temperature, maxTokens } = config;

    const cacheKey = `${provider}:${modelId}:${organizationId || 'default'}`;
    
    // 如果已缓存且配置未变，返回缓存实例
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    let service;

    switch (provider) {
      case 'doubao':
        service = new DoubaoService({
          modelId,
          modelIdStr,
          providerId,
          organizationId,
          apiKey,
          apiEndpoint,
          temperature,
          maxTokens
        });
        break;

      case 'deepseek':
        service = new DeepSeekService({
          modelId,
          modelIdStr,
          providerId,
          organizationId,
          apiKey,
          apiEndpoint,
          temperature,
          maxTokens
        });
        break;

      case 'kimi':
        service = new KimiService({
          modelId,
          modelIdStr,
          providerId,
          organizationId,
          apiKey,
          apiEndpoint,
          temperature,
          maxTokens
        });
        break;
      
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }

    this.serviceCache.set(cacheKey, service);
    logger.info('AI服务实例创建成功', { provider, modelId, organizationId });

    return service;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.serviceCache.clear();
    logger.info('AI服务缓存已清除');
  }

  /**
   * 获取缓存的实例数量
   */
  getCacheSize() {
    return this.serviceCache.size;
  }
}

// 单例模式
const aiServiceFactory = new AIServiceFactory();

module.exports = aiServiceFactory;
