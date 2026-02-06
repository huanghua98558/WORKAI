/**
 * 豆包AI服务
 * 实现豆包大模型的调用接口
 */

const { LLMClient } = require('coze-coding-dev-sdk');
const { getLogger } = require('../../lib/logger');
const AIUsageTracker = require('./AIUsageTracker');
const retryRateLimiter = require('./AIRetryRateLimiter');

const logger = getLogger('DOUBAO_SERVICE');

class DoubaoService {
  constructor(config) {
    this.modelId = config.modelId;
    this.modelIdStr = config.modelIdStr; // 数据库中的modelId
    this.providerId = config.providerId; // 数据库中的providerId
    this.providerName = config.providerName || 'doubao';
    this.organizationId = config.organizationId || 'default'; // 组织ID
    this.apiKey = config.apiKey;
    this.apiEndpoint = config.apiEndpoint;
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 2000;
  }

  /**
   * 创建LLM客户端
   */
  createClient() {
    const { LLMClient, Config } = require('coze-coding-dev-sdk');

    // 创建Config对象，SDK会自动从环境变量加载API密钥
    const config = new Config();
    const client = new LLMClient(config);

    return client;
  }

  /**
   * 意图识别
   * @param {string} input - 用户输入
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 意图识别结果
   */
  async recognizeIntent(input, context = {}) {
    const startTime = Date.now();
    try {
      const client = this.createClient();

      // 构建意图识别的系统提示词
      const systemPrompt = `你是一个意图识别助手。请分析用户的输入，识别其意图类别。

支持的意图类型：
1. service - 用户需要服务或帮助
2. help - 用户需要咨询或解答问题
3. chat - 闲聊或问候
4. welcome - 欢迎词
5. risk - 风险或投诉
6. spam - 垃圾信息
7. admin - 管理相关

请以JSON格式返回结果，格式如下：
{
  "intent": "意图类型",
  "confidence": 置信度(0-1),
  "reasoning": "判断理由"
}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input }
      ];

      let response;
      try {
        // 使用重试和限流保护
        if (this.providerId && this.modelIdStr) {
          response = await retryRateLimiter.executeWithProtection(
            this.providerId,
            this.modelIdStr,
            () => client.invoke(messages, {
              model: this.modelId,
              temperature: this.temperature,
            }),
            {
              maxRetries: 3,
              shouldRetry: (error) => {
                // 网络错误、超时、5xx错误时重试
                return !error.message.includes('401') && !error.message.includes('403');
              }
            }
          );
        } else {
          response = await client.invoke(messages, {
            model: this.modelId,
            temperature: this.temperature,
          });
        }
      } catch (apiError) {
        // AI调试模式下，不使用模拟回复，直接抛出错误以便调试
        logger.error('豆包AI API调用失败', { 
          error: apiError.message,
          modelId: this.modelId,
          input
        });
        throw new Error(`豆包AI API调用失败: ${apiError.message}`);
      }

      // 解析返回的JSON
      let result;
      try {
        const content = typeof response === 'string' ? response : response.content || response.text || '';
        result = JSON.parse(content);
      } catch (e) {
        // 如果解析失败，返回默认结果
        result = {
          intent: 'chat',
          confidence: 0.5,
          reasoning: '无法解析AI返回结果，使用默认意图'
        };
      }

      logger.info('豆包意图识别成功', {
        intent: result.intent,
        confidence: result.confidence,
        robotId: context.robotId
      });

      // 记录使用情况
      if (this.modelIdStr && this.providerId) {
        AIUsageTracker.recordUsage({
          organizationId: this.organizationId,
          modelId: this.modelIdStr,
          providerId: this.providerId,
          operationType: 'intent_recognition',
          inputTokens: input.length, // 简单估算
          outputTokens: JSON.stringify(result).length, // 简单估算
          totalTokens: input.length + JSON.stringify(result).length,
          responseTime: Date.now() - startTime,
          status: 'success',
          sessionId: context.sessionId,
          metadata: { intent: result.intent, confidence: result.confidence }
        });
      }

      return result;
    } catch (error) {
      logger.error('豆包意图识别失败', { error: error.message, input });

      // 记录失败的使用情况
      if (this.modelIdStr && this.providerId) {
        AIUsageTracker.recordUsage({
          organizationId: this.organizationId,
          modelId: this.modelIdStr,
          providerId: this.providerId,
          operationType: 'intent_recognition',
          status: 'error',
          errorMessage: error.message,
          sessionId: context.sessionId
        });
      }

      throw error;
    }
  }

  /**
   * 生成回复
   * @param {Array} messages - 消息列表
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 生成结果
   */
  async generateReply(messages, context = {}) {
    const startTime = Date.now();
    try {
      const client = this.createClient();

      // 使用重试和限流保护
      let response;
      try {
        if (this.providerId && this.modelIdStr) {
          response = await retryRateLimiter.executeWithProtection(
            this.providerId,
            this.modelIdStr,
            () => client.invoke(messages, {
              model: this.modelId,
              temperature: this.temperature,
            }),
            {
              maxRetries: 3,
              shouldRetry: (error) => {
                return !error.message.includes('401') && !error.message.includes('403');
              }
            }
          );
        } else {
          response = await client.invoke(messages, {
            model: this.modelId,
            temperature: this.temperature,
          });
        }
      } catch (apiError) {
        // AI调试模式下，不使用模拟回复，直接抛出错误以便调试
        logger.error('豆包AI API调用失败', { 
          error: apiError.message,
          modelId: this.modelId
        });
        throw new Error(`豆包AI API调用失败: ${apiError.message}`);
      }

      const content = typeof response === 'string' ? response : response.content || response.text || '';
      const usage = response.usage || {};

      const result = {
        content,
        usage: {
          inputTokens: usage.inputTokens || usage.prompt_tokens || 0,
          outputTokens: usage.outputTokens || usage.completion_tokens || 0,
          totalTokens: usage.totalTokens || usage.total_tokens || 0
        }
      };

      logger.info('豆包生成回复成功', {
        contentLength: result.content.length,
        totalTokens: result.usage.totalTokens,
        robotId: context.robotId
      });

      // 记录使用情况
      if (this.modelIdStr && this.providerId) {
        AIUsageTracker.recordUsage({
          organizationId: this.organizationId,
          modelId: this.modelIdStr,
          providerId: this.providerId,
          operationType: context.operationType || 'chat',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          responseTime: Date.now() - startTime,
          status: 'success',
          sessionId: context.sessionId,
          metadata: { ...context, contentLength: result.content.length }
        });
      }

      return result;
    } catch (error) {
      logger.error('豆包生成回复失败', { error: error.message });

      // 记录失败的使用情况
      if (this.modelIdStr && this.providerId) {
        AIUsageTracker.recordUsage({
          organizationId: this.organizationId,
          modelId: this.modelIdStr,
          providerId: this.providerId,
          operationType: context.operationType || 'chat',
          status: 'error',
          errorMessage: error.message,
          sessionId: context.sessionId
        });
      }

      throw error;
    }
  }

  /**
   * 健康检查
   * @returns {Promise<Object>} 健康检查结果
   */
  async healthCheck() {
    try {
      const client = this.createClient();

      // 发送一个简单的测试消息
      const startTime = Date.now();
      await client.invoke([
        { role: 'user', content: '你好' }
      ]);
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        provider: 'doubao'
      };
    } catch (error) {
      logger.error('豆包健康检查失败', { error: error.message });
      return {
        healthy: false,
        error: error.message,
        provider: 'doubao'
      };
    }
  }
}

module.exports = DoubaoService;
