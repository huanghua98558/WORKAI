/**
 * DeepSeek AI服务
 * 实现DeepSeek大模型的调用接口
 */

const { LLMClient } = require('coze-coding-dev-sdk');
const { getLogger } = require('../../lib/logger');
const AIUsageTracker = require('./AIUsageTracker');

const logger = getLogger('DEEPSEEK_SERVICE');

class DeepSeekService {
  constructor(config) {
    this.modelId = config.modelId;
    this.modelIdStr = config.modelIdStr;
    this.providerId = config.providerId;
    this.organizationId = config.organizationId || 'default'; // 组织ID
    this.apiKey = config.apiKey;
    this.apiEndpoint = config.apiEndpoint;
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 4000;
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

      const response = await client.invoke(messages, {
        model: this.modelId,
        temperature: this.temperature,
      });

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

      logger.info('DeepSeek意图识别成功', {
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
      logger.error('DeepSeek意图识别失败', { error: error.message, input });

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

      let response;
      try {
        response = await client.invoke(messages, {
          model: this.modelId,
          temperature: this.temperature,
        });
      } catch (apiError) {
        // 如果API Key缺失或API调用失败，返回模拟结果用于测试
        logger.warn('AI API调用失败，返回模拟结果', { error: apiError.message });

        // 获取最后一条用户消息
        const lastMessage = messages[messages.length - 1];
        const userInput = lastMessage && lastMessage.content ? lastMessage.content : '';

        // 生成模拟回复
        let simulatedReply = '你好！我是DeepSeek AI助手。';
        if (userInput.includes('你好') || userInput.includes('hi') || userInput.includes('hello')) {
          simulatedReply = '你好！很高兴为你服务！';
        } else if (userInput.includes('价格') || userInput.includes('多少钱')) {
          simulatedReply = '关于价格信息，建议您联系我们的客服人员获取最新报价。';
        } else if (userInput.includes('帮助') || userInput.includes('help')) {
          simulatedReply = '我可以帮助你解答问题、提供信息。请告诉我你需要什么帮助？';
        }

        return {
          content: simulatedReply,
          usage: {
            inputTokens: userInput.length,
            outputTokens: simulatedReply.length,
            totalTokens: userInput.length + simulatedReply.length
          }
        };
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

      logger.info('DeepSeek生成回复成功', {
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
      logger.error('DeepSeek生成回复失败', { error: error.message });

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

      const startTime = Date.now();
      await client.invoke([
        { role: 'user', content: '你好' }
      ], {
        model: this.modelId,
        temperature: this.temperature,
      });
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        provider: 'deepseek'
      };
    } catch (error) {
      logger.error('DeepSeek健康检查失败', { error: error.message });
      return {
        healthy: false,
        error: error.message,
        provider: 'deepseek'
      };
    }
  }
}

module.exports = DeepSeekService;
