/**
 * AI 服务封装
 * 使用 coze-coding-dev-sdk 调用大语言模型
 * 支持意图识别、服务回复、闲聊、报告生成
 */

const { LLMClient, Config } = require('coze-coding-dev-sdk');
const config = require('../lib/config');
const aiIoLogService = require('./ai-io-log.service');

class AIService {
  constructor() {
    this.clients = {};
    this.builtinModelMap = {};
    this.initializeClients();
  }

  /**
   * 初始化所有 AI 客户端
   */
  initializeClients() {
    const aiConfig = config.get('ai');
    const providers = ['intentRecognition', 'serviceReply', 'chat', 'report'];

    // 构建内置模型映射
    if (aiConfig?.builtinModels) {
      aiConfig.builtinModels.forEach(model => {
        this.builtinModelMap[model.id] = model;
      });
    }

    providers.forEach(provider => {
      const configItem = aiConfig[provider];
      if (!configItem) {
        console.warn(`⚠️  ${provider} AI 配置未设置`);
        return;
      }

      // 优先使用内置模型
      if (configItem.useBuiltin && configItem.builtinModelId) {
        const builtinModel = this.builtinModelMap[configItem.builtinModelId];
        if (builtinModel) {
          this.initializeClient(provider, {
            modelId: builtinModel.modelId,
            temperature: configItem.temperature ?? this.getDefaultTemperature(provider),
            systemPrompt: configItem.systemPrompt ?? this.getDefaultSystemPrompt(provider)
          });
          console.log(`✅ ${provider} 使用内置模型: ${builtinModel.name}`);
          return;
        } else {
          console.warn(`⚠️  ${provider} 内置模型 ${configItem.builtinModelId} 未找到`);
        }
      }

      // 使用自定义模型配置
      if (configItem.useCustom && configItem.customModel) {
        this.initializeClient(provider, {
          modelId: configItem.customModel.model,
          temperature: configItem.temperature ?? this.getDefaultTemperature(provider),
          systemPrompt: configItem.systemPrompt ?? this.getDefaultSystemPrompt(provider)
        });
        console.log(`✅ ${provider} 使用自定义模型: ${configItem.customModel.model}`);
      }
    });
  }

  /**
   * 初始化单个 AI 客户端
   */
  initializeClient(provider, configItem) {
    try {
      const sdkConfig = new Config();
      const client = new LLMClient(sdkConfig);
      
      this.clients[provider] = {
        client,
        modelId: configItem.modelId,
        temperature: configItem.temperature,
        systemPrompt: configItem.systemPrompt
      };
    } catch (error) {
      console.error(`❌ ${provider} AI 客户端初始化失败:`, error.message);
    }
  }

  /**
   * 获取默认温度参数
   */
  getDefaultTemperature(provider) {
    const defaults = {
      'intentRecognition': 0.1,  // 意图识别需要确定性高
      'serviceReply': 0.7,      // 服务回复需要一定的创造性
      'chat': 0.9,              // 闲聊需要高创造性
      'report': 0.3             // 报告生成需要确定性和专业性
    };
    return defaults[provider] || 0.7;
  }

  /**
   * 获取默认系统提示词
   */
  getDefaultSystemPrompt(provider) {
    const prompts = {
      'intentRecognition': `你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- chat: 闲聊、问候、日常对话
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}`,

      'serviceReply': `你是一个企业微信群服务助手。请根据用户问题和意图，生成专业、友好的回复。

回复要求：
1. 语言简洁明了，控制在 200 字以内
2. 语气亲切友好，使用表情符号增加亲和力
3. 避免敏感词汇和不当内容
4. 如果需要人工介入，明确提示`,

      'chat': `你是一个友好的聊天伙伴。请以轻松、自然的方式回应用户的闲聊内容。

要求：
1. 回复简短，控制在 100 字以内
2. 语气轻松活泼，可以使用表情符号
3. 保持对话连贯性`,

      'report': `你是一个数据分析师。请根据以下数据生成日终总结报告。

报告要求：
1. 包含关键指标统计（消息数、回复数、人工介入数等）
2. 识别问题和风险
3. 提出改进建议
4. 语言简洁专业`
    };
    return prompts[provider] || '';
  }

  /**
   * 获取指定类型的客户端
   */
  getClient(provider) {
    const clientConfig = this.clients[provider];
    if (!clientConfig) {
      throw new Error(`${provider} AI 未配置`);
    }
    return clientConfig;
  }

  /**
   * 意图识别
   */
  async recognizeIntent(message, context = {}) {
    const startTime = Date.now();
    const sessionId = context.sessionId || null;
    const messageId = context.messageId || `msg_${Date.now()}`;
    const robotId = context.robotId || null;
    const robotName = context.robotName || null;

    let clientConfig;
    let messages;

    try {
      clientConfig = this.getClient('intentRecognition');

      messages = [
        {
          role: 'system',
          content: clientConfig.systemPrompt
        },
        {
          role: 'user',
          content: `消息内容：${message}\n\n上下文信息：${JSON.stringify(context)}`
        }
      ];

      const response = await clientConfig.client.invoke(messages, {
        model: clientConfig.modelId,
        temperature: clientConfig.temperature
      });

      const content = response.content;
      const duration = Date.now() - startTime;

      // 记录 AI IO 日志
      await aiIoLogService.saveLog({
        sessionId,
        messageId,
        robotId,
        robotName,
        operationType: 'intent_recognition',
        aiInput: JSON.stringify(messages),
        aiOutput: content,
        modelId: clientConfig.modelId,
        temperature: clientConfig.temperature,
        requestDuration: duration,
        status: 'success',
      });

      // 尝试解析 JSON
      let result;
      try {
        // 清理可能的 markdown 代码块标记
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        result = JSON.parse(cleanContent);
      } catch (e) {
        console.warn('意图识别返回格式错误，使用默认值:', content);
        result = {
          intent: 'chat',
          needReply: true,
          needHuman: false,
          confidence: 0.5,
          reason: '解析失败，降级处理'
        };
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('意图识别失败:', error.message);

      // 记录错误日志
      await aiIoLogService.saveLog({
        sessionId,
        messageId,
        robotId,
        robotName,
        operationType: 'intent_recognition',
        aiInput: messages ? JSON.stringify(messages) : null,
        aiOutput: null,
        modelId: clientConfig?.modelId,
        temperature: clientConfig?.temperature,
        requestDuration: duration,
        status: 'error',
        errorMessage: error.message,
      });

      // 降级处理：返回默认意图
      return {
        intent: 'chat',
        needReply: true,
        needHuman: false,
        confidence: 0.5,
        reason: '识别失败，降级处理'
      };
    }
  }

  /**
   * 服务回复生成
   */
  async generateServiceReply(userMessage, intent, knowledgeBase = '', context = {}) {
    const startTime = Date.now();
    const sessionId = context.sessionId || null;
    const messageId = context.messageId || null;
    const robotId = context.robotId || null;
    const robotName = context.robotName || null;

    let clientConfig;
    let messages;

    try {
      clientConfig = this.getClient('serviceReply');

      messages = [
        {
          role: 'system',
          content: clientConfig.systemPrompt
        },
        {
          role: 'user',
          content: `用户问题：${userMessage}\n意图：${intent}`
        }
      ];

      const response = await clientConfig.client.invoke(messages, {
        model: clientConfig.modelId,
        temperature: clientConfig.temperature
      });

      const duration = Date.now() - startTime;
      const content = response.content;

      // 记录 AI IO 日志
      await aiIoLogService.saveLog({
        sessionId,
        messageId,
        robotId,
        robotName,
        operationType: 'service_reply',
        aiInput: JSON.stringify(messages),
        aiOutput: content,
        modelId: clientConfig.modelId,
        temperature: clientConfig.temperature,
        requestDuration: duration,
        status: 'success',
      });

      return content;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('生成服务回复失败:', error.message);

      // 记录错误日志
      await aiIoLogService.saveLog({
        sessionId,
        messageId,
        robotId,
        robotName,
        operationType: 'service_reply',
        aiInput: messages ? JSON.stringify(messages) : null,
        aiOutput: null,
        modelId: clientConfig?.modelId,
        temperature: clientConfig?.temperature,
        requestDuration: duration,
        status: 'error',
        errorMessage: error.message,
      });

      // 降级处理：返回固定话术
      return '您好，我已收到您的问题，正在为您处理中，请稍等片刻 🙏';
    }
  }

  /**
   * 闲聊回复生成
   */
  async generateChatReply(userMessage, context = {}) {
    const startTime = Date.now();
    const sessionId = context.sessionId || null;
    const messageId = context.messageId || null;
    const robotId = context.robotId || null;
    const robotName = context.robotName || null;

    let clientConfig;
    let messages;

    try {
      clientConfig = this.getClient('chat');

      messages = [
        {
          role: 'system',
          content: clientConfig.systemPrompt
        },
        { role: 'user', content: userMessage }
      ];

      const response = await clientConfig.client.invoke(messages, {
        model: clientConfig.modelId,
        temperature: clientConfig.temperature
      });

      const duration = Date.now() - startTime;
      const content = response.content;

      // 记录 AI IO 日志
      await aiIoLogService.saveLog({
        sessionId,
        messageId,
        robotId,
        robotName,
        operationType: 'chat_reply',
        aiInput: JSON.stringify(messages),
        aiOutput: content,
        modelId: clientConfig.modelId,
        temperature: clientConfig.temperature,
        requestDuration: duration,
        status: 'success',
      });

      return content;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('生成闲聊回复失败:', error.message);

      // 记录错误日志
      await aiIoLogService.saveLog({
        sessionId,
        messageId,
        robotId,
        robotName,
        operationType: 'chat_reply',
        aiInput: messages ? JSON.stringify(messages) : null,
        aiOutput: null,
        modelId: clientConfig?.modelId,
        temperature: clientConfig?.temperature,
        requestDuration: duration,
        status: 'error',
        errorMessage: error.message,
      });

      // 降级处理：返回随机表情
      const emojis = ['👋', '😊', '🎉', '✨', '👍', '💪'];
      return emojis[Math.floor(Math.random() * emojis.length)];
    }
  }

  /**
   * 日终总结生成
   */
  async generateDailyReport(data) {
    try {
      const clientConfig = this.getClient('report');

      const messages = [
        { 
          role: 'system', 
          content: clientConfig.systemPrompt 
        },
        { role: 'user', content: JSON.stringify(data) }
      ];

      const response = await clientConfig.client.invoke(messages, {
        model: clientConfig.modelId,
        temperature: clientConfig.temperature
      });

      return response.content;
    } catch (error) {
      console.error('生成日终总结失败:', error.message);
      return '日终总结生成失败，请查看详细数据。';
    }
  }

  /**
   * 重新初始化客户端（配置更新后）
   */
  reinitialize() {
    this.clients = {};
    this.builtinModelMap = {};
    this.initializeClients();
  }

  /**
   * 获取当前配置状态
   */
  getConfigStatus() {
    const status = {};
    const providers = ['intentRecognition', 'serviceReply', 'chat', 'report'];
    
    providers.forEach(provider => {
      const clientConfig = this.clients[provider];
      if (clientConfig) {
        status[provider] = {
          configured: true,
          model: clientConfig.modelId,
          temperature: clientConfig.temperature
        };
      } else {
        status[provider] = {
          configured: false,
          model: null,
          temperature: null
        };
      }
    });
    
    return status;
  }
}

module.exports = new AIService();
