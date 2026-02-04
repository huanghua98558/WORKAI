/**
 * 豆包AI服务
 * 实现豆包大模型的调用接口
 */

const { LLMClient } = require('coze-coding-dev-sdk');
const { getLogger } = require('../../lib/logger');

const logger = getLogger('DOUBAO_SERVICE');

class DoubaoService {
  constructor(config) {
    this.modelId = config.modelId;
    this.apiKey = config.apiKey;
    this.apiEndpoint = config.apiEndpoint;
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 2000;
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

      const response = await client.chat(messages);

      // 解析返回的JSON
      let result;
      try {
        result = JSON.parse(response.content || response.message?.content || '{}');
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

      return result;
    } catch (error) {
      logger.error('豆包意图识别失败', { error: error.message, input });
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
    try {
      const client = this.createClient();

      const response = await client.chat(messages);

      const result = {
        content: response.content || response.message?.content || '',
        usage: {
          inputTokens: response.usage?.inputTokens || response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.outputTokens || response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.totalTokens || response.usage?.total_tokens || 0
        }
      };

      logger.info('豆包生成回复成功', {
        contentLength: result.content.length,
        totalTokens: result.usage.totalTokens,
        robotId: context.robotId
      });

      return result;
    } catch (error) {
      logger.error('豆包生成回复失败', { error: error.message });
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
      await client.chat([
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
