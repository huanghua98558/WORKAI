/**
 * AI 服务封装
 * 支持多 AI 模型（OpenAI 协议兼容）
 */

const OpenAI = require('openai');
const config = require('../lib/config');

class AIService {
  constructor() {
    this.clients = {};
    this.initializeClients();
  }

  initializeClients() {
    const aiConfig = config.get('ai');
    const providers = ['intentRecognition', 'serviceReply', 'chat', 'report'];

    providers.forEach(provider => {
      const configItem = aiConfig[provider];
      if (!configItem || !configItem.apiKey) {
        console.warn(`⚠️  ${provider} AI 配置未设置`);
        return;
      }

      try {
        this.clients[provider] = new OpenAI({
          apiKey: configItem.apiKey,
          baseURL: configItem.apiBase || 'https://api.openai.com/v1'
        });
        console.log(`✅ ${provider} AI 客户端已初始化: ${configItem.model}`);
      } catch (error) {
        console.error(`❌ ${provider} AI 客户端初始化失败:`, error.message);
      }
    });
  }

  /**
   * 意图识别
   */
  async recognizeIntent(message, context = {}) {
    try {
      const client = this.clients.intentRecognition;
      if (!client) {
        throw new Error('意图识别 AI 未配置');
      }

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
        model: config.get('ai.intentRecognition.model'),
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
      const client = this.clients.serviceReply;
      if (!client) {
        throw new Error('服务回复 AI 未配置');
      }

      const systemPrompt = `你是一个企业微信群服务助手。请根据用户问题和意图，生成专业、友好的回复。

回复要求：
1. 语言简洁明了，控制在 200 字以内
2. 语气亲切友好，使用表情符号增加亲和力
3. 避免敏感词汇和不当内容
4. 如果需要人工介入，明确提示

${knowledgeBase ? `知识库参考：\n${knowledgeBase}` : ''}`;

      const response = await client.chat.completions.create({
        model: config.get('ai.serviceReply.model'),
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
      const client = this.clients.chat;
      if (!client) {
        throw new Error('闲聊 AI 未配置');
      }

      const systemPrompt = `你是一个友好的聊天伙伴。请以轻松、自然的方式回应用户的闲聊内容。

要求：
1. 回复简短，控制在 100 字以内
2. 语气轻松活泼，可以使用表情符号
3. 保持对话连贯性`;

      const response = await client.chat.completions.create({
        model: config.get('ai.chat.model'),
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
      const client = this.clients.report;
      if (!client) {
        throw new Error('日终总结 AI 未配置');
      }

      const systemPrompt = `你是一个数据分析师。请根据以下数据生成日终总结报告。

报告要求：
1. 包含关键指标统计（消息数、回复数、人工介入数等）
2. 识别问题和风险
3. 提出改进建议
4. 语言简洁专业`;

      const response = await client.chat.completions.create({
        model: config.get('ai.report.model'),
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
    this.initializeClients();
  }
}

module.exports = new AIService();
