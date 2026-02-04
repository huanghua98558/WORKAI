/**
 * 豆包大模型 Provider 实现
 * 基于 coze-coding-dev-sdk
 */

import AIService from '../base/AIService';
import type {
  AIContext,
  IntentRecognitionResult,
  ChatMessage,
  GenerateOptions,
  GenerateReplyResult,
  ReportOptions,
  GenerateReportResult,
  HealthCheckResult
} from '../base/AIContext';

/**
 * 豆包大模型配置
 */
interface DoubaoConfig {
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
   * 温度 (0-2)
   */
  temperature?: number;

  /**
   * 最大Token数
   */
  maxTokens?: number;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;
}

/**
 * 豆包大模型Provider
 */
export default class DoubaoProvider implements AIService {
  private config: DoubaoConfig;
  private providerName = 'doubao';

  constructor(config: DoubaoConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
      ...config
    };
  }

  /**
   * 意图识别
   */
  async recognizeIntent(
    message: string,
    context: AIContext
  ): Promise<IntentRecognitionResult> {
    const startTime = Date.now();

    try {
      // 构造意图识别提示词
      const systemPrompt = `# 角色
你是一个专业的意图识别专家，负责分析用户消息并判断用户的真实意图。

# 任务
分析用户的输入，判断用户的意图属于以下哪一类：

## 意图分类
1. **咨询** - 用户询问产品、服务、价格、功能等信息
2. **投诉** - 用户表达不满、抱怨、要求解决问题
3. **售后** - 用户提出退换货、维修、客服等需求
4. **互动** - 用户进行闲聊、点赞、评论等社交行为
5. **购买** - 用户表现出购买意向或直接下单
6. **其他** - 无法明确分类的其他意图

# 输出格式
请以JSON格式输出，格式如下：
{
  "intent": "意图类型",
  "confidence": 0.95,
  "category": "分类",
  "description": "描述"
}

# 示例
用户：这个产品多少钱？ → {"intent": "咨询", "confidence": 0.98, "category": "product", "description": "用户询问产品价格"}`;

      const userPrompt = `用户消息：${message}

请识别用户意图（只返回JSON，不要有其他内容）：`;

      // 调用豆包大模型
      const result = await this.callDoubaoAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.3,
        maxTokens: 500
      });

      // 解析JSON结果
      const jsonMatch = result.reply.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析意图识别结果');
      }

      const intentData = JSON.parse(jsonMatch[0]);

      return {
        intent: intentData.intent || '其他',
        confidence: intentData.confidence || 0.5,
        category: intentData.category,
        description: intentData.description,
        extra: {
          latency: result.latency
        }
      };
    } catch (error) {
      console.error('意图识别失败:', error);
      return {
        intent: '其他',
        confidence: 0.5,
        description: '意图识别失败',
        extra: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * 生成回复
   */
  async generateReply(
    messages: ChatMessage[],
    options: GenerateOptions
  ): Promise<GenerateReplyResult> {
    const startTime = Date.now();

    try {
      // 如果有话术模板，优先使用话术模板
      if (options.template) {
        // TODO: 从模板服务获取话术模板并替换变量
        // 这里先简单实现
        console.log('使用话术模板:', options.template.id);
      }

      // 调用豆包大模型
      const result = await this.callDoubaoAPI(messages, {
        temperature: options.temperature ?? this.config.temperature,
        maxTokens: options.maxTokens ?? this.config.maxTokens,
        stream: options.stream
      });

      return result;
    } catch (error) {
      console.error('生成回复失败:', error);
      return {
        reply: '抱歉，我无法理解您的问题。请稍后再试。',
        model: this.getModelName(),
        latency: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 生成报告
   */
  async generateReport(
    data: any,
    options: ReportOptions
  ): Promise<GenerateReportResult> {
    const startTime = Date.now();

    try {
      const systemPrompt = `# 角色
你是一个专业的报告生成专家，负责根据数据生成结构化的报告。

# 任务
根据提供的数据，生成一份${options.reportType}报告。

# 要求
1. 结构清晰，逻辑严谨
2. 数据准确，分析深入
3. 语言简洁，易于理解
4. 格式：${options.format || 'markdown'}`;

      const userPrompt = `数据：${JSON.stringify(data)}

请生成报告（只返回报告内容，不要有其他说明）：`;

      const result = await this.callDoubaoAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.5,
        maxTokens: 4000
      });

      return {
        content: result.reply,
        format: options.format || 'markdown',
        model: result.model,
        latency: result.latency,
        success: true,
        extra: result.extra
      };
    } catch (error) {
      console.error('生成报告失败:', error);
      return {
        content: '',
        format: options.format || 'markdown',
        model: this.getModelName(),
        latency: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 简单的健康检查：调用一次API
      await this.callDoubaoAPI([
        { role: 'user', content: '你好' }
      ], {
        maxTokens: 10
      });

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        info: {
          model: this.getModelName(),
          provider: this.getProviderName()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 调用豆包API
   */
  private async callDoubaoAPI(
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<GenerateReplyResult> {
    const startTime = Date.now();

    try {
      // TODO: 这里需要调用实际的豆包API
      // 使用 coze-coding-dev-sdk 或者直接调用HTTP API

      // 模拟实现（实际项目中需要替换为真实的API调用）
      // const response = await fetch(this.config.apiEndpoint || 'https://api.doubao.com/v1/chat/completions', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${this.config.apiKey}`
      //   },
      //   body: JSON.stringify({
      //     model: this.config.modelId,
      //     messages: messages.map(m => ({
      //       role: m.role,
      //       content: m.content
      //     })),
      //     temperature: options.temperature,
      //     max_tokens: options.maxTokens,
      //     stream: options.stream
      //   })
      // });

      // 模拟响应（实际项目中删除）
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      const mockReply = this.generateMockReply(messages);

      return {
        reply: mockReply,
        model: this.getModelName(),
        tokens: {
          promptTokens: messages.reduce((sum, m) => sum + m.content.length, 0),
          completionTokens: mockReply.length,
          totalTokens: messages.reduce((sum, m) => sum + m.content.length, 0) + mockReply.length
        },
        latency: Date.now() - startTime,
        success: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 生成模拟回复（仅用于测试，实际项目中删除）
   */
  private generateMockReply(messages: ChatMessage[]): string {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();

    if (content.includes('你好') || content.includes('hello')) {
      return '您好！很高兴为您服务，请问有什么可以帮助您的？';
    } else if (content.includes('多少钱') || content.includes('价格')) {
      return '关于价格信息，请告诉我您感兴趣的产品，我会为您详细介绍。';
    } else if (content.includes('投诉') || content.includes('不满')) {
      return '非常抱歉给您带来不好的体验，我们会尽快处理您的问题。';
    } else if (content.includes('退货') || content.includes('退款')) {
      return '关于退货退款，请提供您的订单号，我们会为您处理。';
    } else if (content.includes('购买') || content.includes('买')) {
      return '感谢您的购买意向！我可以为您介绍我们的产品和服务。';
    } else {
      return '我理解您的意思，请问还有什么其他需要帮助的吗？';
    }
  }

  /**
   * 获取模型名称
   */
  getModelName(): string {
    return this.config.modelId;
  }

  /**
   * 获取模型ID
   */
  getModelId(): string {
    return this.config.modelId;
  }

  /**
   * 获取提供商名称
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * 获取支持的能力列表
   */
  getCapabilities(): string[] {
    return ['intent_recognition', 'service_reply', 'conversion', 'chat', 'report'];
  }
}
