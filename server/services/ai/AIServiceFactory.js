/**
 * AI服务工厂
 * 根据提供商创建对应的AI服务实例
 */

const DoubaoService = require('./DoubaoService');
const DeepSeekService = require('./DeepSeekService');
const KimiService = require('./KimiService');
const { getLogger } = require('../../lib/logger');

const logger = getLogger('AI_SERVICE_FACTORY');

class AIServiceFactory {
  constructor() {
    this.serviceCache = new Map();
  }

  /**
   * 创建AI服务实例
   * @param {Object} config - 配置对象
   * @param {string} config.provider - 提供商名称 (doubao, deepseek, kimi)
   * @param {string} config.modelId - 模型ID
   * @param {string} config.apiKey - API密钥
   * @param {string} config.apiEndpoint - API端点
   * @param {number} config.temperature - 温度参数
   * @param {number} config.maxTokens - 最大token数
   */
  createService(config) {
    const { provider, modelId, apiKey, apiEndpoint, temperature, maxTokens } = config;

    const cacheKey = `${provider}:${modelId}`;
    
    // 如果已缓存且配置未变，返回缓存实例
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    let service;

    switch (provider) {
      case 'doubao':
        service = new DoubaoService({
          modelId,
          apiKey,
          apiEndpoint,
          temperature,
          maxTokens
        });
        break;
      
      case 'deepseek':
        service = new DeepSeekService({
          modelId,
          apiKey,
          apiEndpoint,
          temperature,
          maxTokens
        });
        break;
      
      case 'kimi':
        service = new KimiService({
          modelId,
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
    logger.info('AI服务实例创建成功', { provider, modelId });

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
