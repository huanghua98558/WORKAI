/**
 * AI服务工厂
 * 用于创建不同提供商的AI服务实例
 */

import AIService from './base/AIService';
import DoubaoProvider from './providers/DoubaoProvider';
// TODO: 添加其他Provider
// import AliyunQwenProvider from './providers/AliyunQwenProvider';
// import QwenProProvider from './providers/QwenProProvider';
// import OpenAIProvider from './providers/OpenAIProvider';
// import ClaudeProvider from './providers/ClaudeProvider';
// import CustomProvider from './providers/CustomProvider';

/**
 * AI服务配置
 */
export interface AIServiceConfig {
  /**
   * 提供商
   */
  provider: 'doubao' | 'aliyun_qwen' | 'qwen_pro' | 'openai' | 'claude' | 'custom';

  /**
   * 模型ID
   */
  modelId: string;

  /**
   * API密钥
   */
  apiKey?: string;

  /**
   * API端点
   */
  apiEndpoint?: string;

  /**
   * 温度
   */
  temperature?: number;

  /**
   * 最大Token数
   */
  maxTokens?: number;

  /**
   * 超时时间
   */
  timeout?: number;
}

/**
 * AI服务工厂类
 */
class AIServiceFactory {
  private static instance: AIServiceFactory;
  private services: Map<string, AIService> = new Map();

  private constructor() {}

  /**
   * 获取工厂实例
   */
  static getInstance(): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      AIServiceFactory.instance = new AIServiceFactory();
    }
    return AIServiceFactory.instance;
  }

  /**
   * 创建AI服务
   * @param config - AI服务配置
   * @returns AI服务实例
   */
  createService(config: AIServiceConfig): AIService {
    const key = `${config.provider}:${config.modelId}`;

    // 如果已存在，直接返回
    if (this.services.has(key)) {
      return this.services.get(key)!;
    }

    // 根据提供商创建对应的AI服务
    let service: AIService;

    switch (config.provider) {
      case 'doubao':
        service = new DoubaoProvider({
          modelId: config.modelId,
          apiKey: config.apiKey,
          apiEndpoint: config.apiEndpoint,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          timeout: config.timeout
        });
        break;

      // TODO: 添加其他Provider
      // case 'aliyun_qwen':
      //   service = new AliyunQwenProvider(config);
      //   break;
      // case 'qwen_pro':
      //   service = new QwenProProvider(config);
      //   break;
      // case 'openai':
      //   service = new OpenAIProvider(config);
      //   break;
      // case 'claude':
      //   service = new ClaudeProvider(config);
      //   break;
      // case 'custom':
      //   service = new CustomProvider(config);
      //   break;

      default:
        throw new Error(`不支持的AI服务提供商: ${config.provider}`);
    }

    // 缓存服务实例
    this.services.set(key, service);

    return service;
  }

  /**
   * 获取AI服务
   * @param provider - 提供商
   * @param modelId - 模型ID
   * @returns AI服务实例
   */
  getService(provider: string, modelId: string): AIService | undefined {
    const key = `${provider}:${modelId}`;
    return this.services.get(key);
  }

  /**
   * 移除AI服务
   * @param provider - 提供商
   * @param modelId - 模型ID
   */
  removeService(provider: string, modelId: string): void {
    const key = `${provider}:${modelId}`;
    this.services.delete(key);
  }

  /**
   * 清除所有服务
   */
  clearAll(): void {
    this.services.clear();
  }

  /**
   * 获取所有服务
   * @returns 所有AI服务实例
   */
  getAllServices(): AIService[] {
    return Array.from(this.services.values());
  }
}

// 导出单例实例
export default AIServiceFactory.getInstance();
