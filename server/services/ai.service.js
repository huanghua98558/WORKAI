/**
 * AI 服务封装
 * 支持多 AI 模型（OpenAI 协议兼容）
 * 支持内置模型和自定义 API 配置
 */

const OpenAI = require('openai');
const config = require('../lib/config');

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
            model: builtinModel.model,
            apiKey: builtinModel.apiKey,
            apiBase: builtinModel.apiBase,
            provider: builtinModel.provider
          });
          console.log(`✅ ${provider} 使用内置模型: ${builtinModel.name}`);
          return;
        } else {
          console.warn(`⚠️  ${provider} 内置模型 ${configItem.builtinModelId} 未找到`);
        }
      }

      // 使用自定义 API
      if (configItem.useCustom && configItem.customModel) {
        const customConfig = this.parseCustomProvider(configItem.customModel);
        this.initializeClient(provider, customConfig);
        console.log(`✅ ${provider} 使用自定义模型: ${customConfig.model} (${customConfig.provider})`);
      }
    });
  }

  /**
   * 初始化单个 AI 客户端
   */
  initializeClient(provider, configItem) {
    try {
      this.clients[provider] = new OpenAI({
        apiKey: configItem.apiKey,
        baseURL: configItem.apiBase || this.getDefaultApiBase(configItem.provider)
      });
      this.clients[provider].model = configItem.model;
      this.clients[provider].provider = configItem.provider;
    } catch (error) {
      console.error(`❌ ${provider} AI 客户端初始化失败:`, error.message);
    }
  }

  /**
   * 解析自定义提供商配置
   */
  parseCustomProvider(customModel) {
    const provider = customModel.provider || 'openai';
    const apiBase = customModel.apiBase || this.getDefaultApiBase(provider);
    
    return {
      provider,
      model: customModel.model,
      apiKey: customModel.apiKey,
      apiBase
    };
  }

  /**
   * 获取默认 API Base
   */
  getDefaultApiBase(provider) {
    const baseUrls = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      google: 'https://generativelanguage.googleapis.com/v1beta',
      azure: 'https://your-resource.openai.azure.com',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
      baichuan: 'https://api.baichuan-ai.com/v1',
      minimax: 'https://api.minimax.chat/v1',
      xunfei: 'https://spark-api.xf-yun.com/v1',
      custom: 'https://api.custom-provider.com/v1'
    };
    return baseUrls[provider] || 'https://api.openai.com/v1';
  }

  /**
   * 获取指定类型的客户端
   */
  getClient(provider) {
    const client = this.clients[provider];
    if (!client) {
      throw new Error(`${provider} AI 未配置`);
    }
    return client;
  }

  /**
   * 意图识别
   */
  async recognizeIntent(message, context = {}) {
    try {
      const client = this.getClient('intentRecognition');

      const systemPrompt = `你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

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
}`;

      const response = await client.chat.completions.create({
        model: client.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `消息内容：${message}\n\n上下文信息：${JSON.stringify(context)}` 
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;
    } catch (error) {
      console.error('意图识别失败:', error.message);
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
  async generateServiceReply(userMessage, intent, knowledgeBase = '') {
    try {
      const client = this.getClient('serviceReply');

      const systemPrompt = `你是一个企业微信群服务助手。请根据用户问题和意图，生成专业、友好的回复。

回复要求：
1. 语言简洁明了，控制在 200 字以内
2. 语气亲切友好，使用表情符号增加亲和力
3. 避免敏感词汇和不当内容
4. 如果需要人工介入，明确提示

${knowledgeBase ? `知识库参考：\n${knowledgeBase}` : ''}`;

      const response = await client.chat.completions.create({
        model: client.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `用户问题：${userMessage}\n意图：${intent}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('生成服务回复失败:', error.message);
      // 降级处理：返回固定话术
      return '您好，我已收到您的问题，正在为您处理中，请稍等片刻 🙏';
    }
  }

  /**
   * 闲聊回复生成
   */
  async generateChatReply(userMessage) {
    try {
      const client = this.getClient('chat');

      const systemPrompt = `你是一个友好的聊天伙伴。请以轻松、自然的方式回应用户的闲聊内容。

要求：
1. 回复简短，控制在 100 字以内
2. 语气轻松活泼，可以使用表情符号
3. 保持对话连贯性`;

      const response = await client.chat.completions.create({
        model: client.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.9,
        max_tokens: 150
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('生成闲聊回复失败:', error.message);
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
      const client = this.getClient('report');

      const systemPrompt = `你是一个数据分析师。请根据以下数据生成日终总结报告。

报告要求：
1. 包含关键指标统计（消息数、回复数、人工介入数等）
2. 识别问题和风险
3. 提出改进建议
4. 语言简洁专业`;

      const response = await client.chat.completions.create({
        model: client.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(data) }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return response.choices[0].message.content;
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
      const client = this.clients[provider];
      if (client) {
        status[provider] = {
          configured: true,
          model: client.model,
          provider: client.provider
        };
      } else {
        status[provider] = {
          configured: false,
          model: null,
          provider: null
        };
      }
    });
    
    return status;
  }
}

module.exports = new AIService();
