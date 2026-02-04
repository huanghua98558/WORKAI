/**
 * AI 服务封装
 * 使用 coze-coding-dev-sdk 调用大语言模型
 * 支持意图识别、服务回复、闲聊、报告生成
 */

const { LLMClient, Config } = require('coze-coding-dev-sdk');
const config = require('../lib/config');
const { getLogger } = require('../lib/logger');
const aiIoLogService = require('./ai-io-log.service');
const DEFAULT_PROMPTS = require('../config/default-prompts');

class AIService {
  constructor() {
    this.clients = {};
    this.builtinModelMap = {};
    this.logger = getLogger('AI');
    this.initializeClients();
  }

  /**
   * 初始化所有 AI 客户端
   */
  initializeClients() {
    const aiConfig = config.get('ai');
    const providers = ['intentRecognition', 'serviceReply', 'report', 'conversion'];

    // 构建内置模型映射
    if (aiConfig?.builtinModels) {
      aiConfig.builtinModels.forEach(model => {
        this.builtinModelMap[model.id] = model;
      });
    }

    providers.forEach(provider => {
      const configItem = aiConfig[provider];
      if (!configItem) {
        this.logger.warn(`${provider} AI 配置未设置`, { provider });
        return;
      }

      // 优先使用内置模型
      if (configItem.useBuiltin && configItem.builtinModelId) {
        const builtinModel = this.builtinModelMap[configItem.builtinModelId];
        if (builtinModel) {
          this.initializeClient(provider, {
            modelId: builtinModel.modelId,
            temperature: configItem.temperature ?? this.getDefaultTemperature(provider),
            systemPrompt: configItem.systemPrompt || this.getDefaultSystemPrompt(provider)
          });
          this.logger.info(`${provider} 使用内置模型`, {
            provider,
            model: builtinModel.name,
            modelId: builtinModel.modelId,
            useCustomPrompt: !!configItem.systemPrompt
          });
          return;
        } else {
          this.logger.warn(`${provider} 内置模型未找到`, {
            provider,
            modelId: configItem.builtinModelId
          });
        }
      }

      // 使用自定义模型配置
      if (configItem.useCustom && configItem.customModel) {
        this.initializeClient(provider, {
          modelId: configItem.customModel.model,
          temperature: configItem.temperature ?? this.getDefaultTemperature(provider),
          systemPrompt: configItem.systemPrompt || this.getDefaultSystemPrompt(provider)
        });
        this.logger.info(`${provider} 使用自定义模型`, {
          provider,
          model: configItem.customModel.model,
          useCustomPrompt: !!configItem.systemPrompt
        });
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
      this.logger.debug(`${provider} 客户端初始化成功`, {
        provider,
        modelId: configItem.modelId,
        temperature: configItem.temperature
      });
    } catch (error) {
      this.logger.error(`${provider} AI 客户端初始化失败`, {
        provider,
        error: error.message
      });
    }
  }

  /**
   * 获取默认温度参数
   */
  getDefaultTemperature(provider) {
    const defaults = {
      'intentRecognition': 0.1,  // 意图识别需要确定性高
      'serviceReply': 0.7,      // 客服回复需要一定的创造性和友好性
      'report': 0.3,            // 报告生成需要确定性和专业性
      'conversion': 0.8         // 转化客服需要更高的创造性和亲和力
    };
    return defaults[provider] || 0.7;
  }

  /**
   * 获取默认系统提示词
   */
  getDefaultSystemPrompt(provider) {
    return DEFAULT_PROMPTS[provider] || '';
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
    const userName = context.userName || context.userId || '未知用户';
    const groupName = context.groupName || context.groupId || '未知群组';

    this.logger.info('开始意图识别', {
      sessionId,
      messageId,
      robotId,
      userName,
      groupName,
      messageLength: message.length
    });

    // 获取长期记忆配置
    const memoryConfig = config.get('ai.memory') || {
      enabled: true,
      maxContextMessages: 20,
      rememberUserHistory: true
    };

    let clientConfig;
    let messages;

    try {
      clientConfig = this.getClient('intentRecognition');

      // 构建用户信息，方便AI长期记忆
      const userInfo = {
        userName: userName,
        groupName: groupName,
        userId: context.userId || userName,
        groupId: context.groupId || groupName,
        robotName: robotName || '智能助手'
      };

      // 根据配置决定是否包含历史对话
      let historySummary = '无历史对话';
      if (memoryConfig.enabled && memoryConfig.rememberUserHistory && context.history && context.history.length > 0) {
        const maxMessages = memoryConfig.maxContextMessages || 20;
        historySummary = context.history.slice(-maxMessages).map((msg, idx) => 
          `[${idx + 1}] ${msg.role === 'user' ? userName : robotName || '助手'}: ${msg.content}`
        ).join('\n');
      }

      // 根据配置构建用户消息内容
      let userContent = '';
      if (memoryConfig.enabled) {
        userContent = `用户：${userName}\n群组：${groupName}\n\n`;
      }
      userContent += `当前消息：${message}\n\n`;
      if (memoryConfig.enabled && memoryConfig.rememberUserHistory) {
        userContent += `最近对话：\n${historySummary}\n\n`;
      }
      userContent += `请识别这条消息的意图。`;

      messages = [
        {
          role: 'system',
          content: clientConfig.systemPrompt
        },
        {
          role: 'user',
          content: userContent
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

      // 记录性能日志
      await this.logger.performance('意图识别', duration, {
        modelId: clientConfig.modelId,
        sessionId,
        outputLength: content.length
      });

      // 尝试解析 JSON
      let result;
      try {
        // 清理可能的 markdown 代码块标记
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        result = JSON.parse(cleanContent);
      } catch (e) {
        this.logger.warn('意图识别返回格式错误，使用默认值', {
          error: e.message,
          content: content.substring(0, 200)
        });
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
      this.logger.error('意图识别失败', {
        sessionId,
        messageId,
        robotId,
        error: error.message,
        stack: error.stack,
        duration
      });

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
    const userName = context.userName || context.userId || '未知用户';
    const groupName = context.groupName || context.groupId || '未知群组';

    // 获取长期记忆配置
    const memoryConfig = config.get('ai.memory') || {
      enabled: true,
      maxContextMessages: 20,
      rememberUserHistory: true
    };

    let clientConfig;
    let messages;

    try {
      clientConfig = this.getClient('serviceReply');

      // 构建知识库信息（如果有）
      const knowledgeInfo = knowledgeBase ? `\n\n知识库参考：\n${knowledgeBase}` : '';

      // 根据配置决定是否包含历史对话
      let historySummary = '无历史对话';
      if (memoryConfig.enabled && memoryConfig.rememberUserHistory && context.history && context.history.length > 0) {
        const maxMessages = memoryConfig.maxContextMessages || 20;
        historySummary = context.history.slice(-maxMessages).map((msg, idx) => 
          `[${idx + 1}] ${msg.role === 'user' ? userName : robotName || '助手'}: ${msg.content}`
        ).join('\n');
      }

      // 根据配置构建用户消息内容
      let userContent = '';
      if (memoryConfig.enabled) {
        userContent = `用户：${userName}\n群组：${groupName}\n\n`;
      }
      userContent += `当前问题：${userMessage}\n意图类型：${intent}${knowledgeInfo}\n\n`;
      if (memoryConfig.enabled && memoryConfig.rememberUserHistory) {
        userContent += `最近对话：\n${historySummary}\n\n`;
      }
      userContent += `请生成合适的回复。`;

      messages = [
        {
          role: 'system',
          content: clientConfig.systemPrompt
        },
        {
          role: 'user',
          content: userContent
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
   * 转化客服回复生成
   */
  async generateConversionReply(userMessage, intent, context = {}) {
    const startTime = Date.now();
    const sessionId = context.sessionId || null;
    const messageId = context.messageId || null;
    const robotId = context.robotId || null;
    const robotName = context.robotName || null;
    const userName = context.userName || context.userId || '未知用户';
    const groupName = context.groupName || context.groupId || '未知群组';

    // 获取长期记忆配置
    const memoryConfig = config.get('ai.memory') || {
      enabled: true,
      maxContextMessages: 20,
      rememberUserHistory: true,
      userProfileEnabled: true
    };

    let clientConfig;
    let messages;

    try {
      clientConfig = this.getClient('conversion');

      // 根据配置决定是否包含历史对话
      let historySummary = '无历史对话';
      if (memoryConfig.enabled && memoryConfig.rememberUserHistory && context.history && context.history.length > 0) {
        const maxMessages = memoryConfig.maxContextMessages || 20;
        historySummary = context.history.slice(-maxMessages).map((msg, idx) => 
          `[${idx + 1}] ${msg.role === 'user' ? userName : robotName || '助手'}: ${msg.content}`
        ).join('\n');
      }

      // 根据配置决定是否包含用户画像
      let userProfile = '';
      if (memoryConfig.enabled && memoryConfig.userProfileEnabled && context.userProfile) {
        userProfile = `\n\n用户画像：\n${JSON.stringify(context.userProfile)}`;
      }

      // 根据配置构建用户消息内容
      let userContent = '';
      if (memoryConfig.enabled) {
        userContent = `用户：${userName}\n群组：${groupName}\n\n`;
      }
      userContent += `当前消息：${userMessage}\n意图类型：${intent}${userProfile}\n\n`;
      if (memoryConfig.enabled && memoryConfig.rememberUserHistory) {
        userContent += `最近对话：\n${historySummary}\n\n`;
      }
      userContent += `请生成引导转化的回复。`;

      messages = [
        {
          role: 'system',
          content: clientConfig.systemPrompt
        },
        {
          role: 'user',
          content: userContent
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
        operationType: 'conversion_reply',
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
      console.error('生成转化客服回复失败:', error.message);

      // 记录错误日志
      await aiIoLogService.saveLog({
        sessionId,
        messageId,
        robotId,
        robotName,
        operationType: 'conversion_reply',
        aiInput: JSON.stringify(messages),
        status: 'error',
        errorMessage: error.message,
        requestDuration: duration,
      });

      return '抱歉，我暂时无法回复，请稍后再试。';
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
    const providers = ['intentRecognition', 'serviceReply', 'report', 'conversion'];
    
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
