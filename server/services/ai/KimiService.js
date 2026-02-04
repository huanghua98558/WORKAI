/**
 * Kimi AI服务
 * 实现Kimi（Moonshot AI）大模型的调用接口
 */

const { LLMClient } = require('coze-coding-dev-sdk');
const { getLogger } = require('../../lib/logger');
const AIUsageTracker = require('./AIUsageTracker');

const logger = getLogger('KIMI_SERVICE');

class KimiService {
  constructor(config) {
    this.modelId = config.modelId;
    this.modelIdStr = config.modelIdStr;
    this.providerId = config.providerId;
    this.apiKey = config.apiKey;
    this.apiEndpoint = config.apiEndpoint;
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 8000;
  }

  /**
   * 创建LLM客户端
   */
  createClient() {
    return new LLMClient({
      model: this.modelId,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      apiKey: this.apiKey,
      endpoint: this.apiEndpoint
    });
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

      const response = await client.invoke(messages);

      let result;
      try {
        const content = typeof response === 'string' ? response : response.content || response.text || '';
        result = JSON.parse(content);
      } catch (e) {
        result = {
          intent: 'chat',
          confidence: 0.5,
          reasoning: '无法解析AI返回结果，使用默认意图'
        };
      }

      logger.info('Kimi意图识别成功', {
        intent: result.intent,
        confidence: result.confidence,
        robotId: context.robotId
      });

      // 记录使用情况
      if (this.modelIdStr && this.providerId) {
        AIUsageTracker.recordUsage({
          modelId: this.modelIdStr,
          providerId: this.providerId,
          operationType: 'intent_recognition',
          inputTokens: input.length,
          outputTokens: JSON.stringify(result).length,
          totalTokens: input.length + JSON.stringify(result).length,
          responseTime: Date.now() - startTime,
          status: 'success',
          sessionId: context.sessionId,
          metadata: { intent: result.intent, confidence: result.confidence }
        });
      }

      return result;
    } catch (error) {
      logger.error('Kimi意图识别失败', { error: error.message, input });

      // 记录失败的使用情况
      if (this.modelIdStr && this.providerId) {
        AIUsageTracker.recordUsage({
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

      const response = await client.invoke(messages);

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

      logger.info('Kimi生成回复成功', {
        contentLength: result.content.length,
        totalTokens: result.usage.totalTokens,
        robotId: context.robotId
      });

      // 记录使用情况
      if (this.modelIdStr && this.providerId) {
        AIUsageTracker.recordUsage({
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
      logger.error('Kimi生成回复失败', { error: error.message });

      // 记录失败的使用情况
      if (this.modelIdStr && this.providerId) {
        AIUsageTracker.recordUsage({
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

      const startTime = Date.now();
      await client.invoke([
        { role: 'user', content: '你好' }
      ]);
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        provider: 'kimi'
      };
    } catch (error) {
      logger.error('Kimi健康检查失败', { error: error.message });
      return {
        healthy: false,
        error: error.message,
        provider: 'kimi'
      };
    }
  }
}

module.exports = KimiService;
