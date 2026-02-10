/**
 * RobotAIService - 机器人专属AI服务
 * 
 * 功能：
 * - 每个机器人配置独立的AI模型
 * - 意图识别（Intent Recognition）
 * - 情感分析（Sentiment Analysis）
 * - 支持多模型配置（不同机器人可以使用不同的AI模型）
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('../database/schema');
const { eq } = require('drizzle-orm');

class RobotAIService {
  constructor() {
    this.robotAIConfigs = new Map(); // 缓存机器人AI配置
    console.log('[RobotAIService] 机器人AI服务初始化完成');
  }

  async getDb() {
    return getDb();
  }

  /**
   * 获取机器人AI配置
   */
  async getRobotAIConfig(robotId) {
    // 先从缓存读取
    if (this.robotAIConfigs.has(robotId)) {
      return this.robotAIConfigs.get(robotId);
    }

    const db = await this.getDb();
    const robotsData = await db.select()
      .from(robots)
      .where(eq(robots.robotId, robotId))
      .limit(1);

    if (robotsData.length === 0) {
      throw new Error(`机器人 ${robotId} 不存在`);
    }

    const robot = robotsData[0];

    // 从extraData中提取AI配置
    const aiConfig = robot.extraData?.ai_config || this.getDefaultAIConfig(robot);

    // 缓存配置
    this.robotAIConfigs.set(robotId, aiConfig);

    return aiConfig;
  }

  /**
   * 获取默认AI配置
   */
  getDefaultAIConfig(robot) {
    return {
      intent_model: {
        provider: 'doubao', // 豆包
        model: 'doubao-pro-4k',
        temperature: 0.3,
        max_tokens: 500
      },
      sentiment_model: {
        provider: 'doubao',
        model: 'doubao-pro-4k',
        temperature: 0.1,
        max_tokens: 300
      },
      // 意图识别提示词模板
      intent_prompt_template: `你是一个专业的客服意图识别助手。请分析用户消息，识别其意图。

历史消息：
{history_messages}

当前消息：
{current_message}

用户画像：
- 满意度: {satisfaction_score}
- 问题解决率: {problem_resolution_rate}
- 消息数: {message_count}

可用意图类别：
{intent_categories}

请以JSON格式返回意图识别结果：
{
  "intent": "意图类别",
  "confidence": 0-100,
  "reasoning": "识别理由"
}`,

      // 情感分析提示词模板
      sentiment_prompt_template: `你是一个专业的情感分析助手。请分析用户消息的情感倾向。

当前消息：
{current_message}

历史消息摘要：
{history_summary}

请以JSON格式返回情感分析结果：
{
  "sentiment": "positive/negative/neutral",
  "confidence": 0-100,
  "emotional_intensity": 1-5,
  "key_emotions": ["情感1", "情感2"],
  "reasoning": "分析理由"
}`
    };
  }

  /**
   * 意图识别
   */
  async recognizeIntent(contextData) {
    const { history_messages, current_message, user_profile } = contextData;

    try {
      // 获取机器人AI配置（从contextData.metadata获取robotId）
      const robotId = contextData.robotId;
      const aiConfig = await this.getRobotAIConfig(robotId);

      // 构建意图类别列表
      const intentCategories = this.getIntentCategories();

      // 构建提示词
      const prompt = aiConfig.intent_prompt_template
        .replace('{history_messages}', JSON.stringify(history_messages.slice(-5)))
        .replace('{current_message}', JSON.stringify(current_message))
        .replace('{satisfaction_score}', user_profile?.satisfaction_score || 50)
        .replace('{problem_resolution_rate}', user_profile?.problem_resolution_rate || 0)
        .replace('{message_count}', user_profile?.message_count || 0)
        .replace('{intent_categories}', intentCategories.map(c => `- ${c.name}: ${c.description}`).join('\n'));

      console.log('[RobotAIService] 开始意图识别...');

      // 调用AI模型
      const result = await this.callAIModel(aiConfig.intent_model, prompt);

      // 解析结果
      const intentResult = this.parseAIResponse(result);

      console.log('[RobotAIService] 意图识别完成:', intentResult);

      return intentResult;

    } catch (error) {
      console.error('[RobotAIService] ❌ 意图识别失败:', error);
      // 返回默认意图
      return {
        intent: 'unknown',
        confidence: 30,
        reasoning: '意图识别失败，返回默认值'
      };
    }
  }

  /**
   * 情感分析
   */
  async analyzeSentiment(contextData) {
    const { history_messages, current_message } = contextData;

    try {
      // 获取机器人AI配置
      const robotId = contextData.robotId;
      const aiConfig = await this.getRobotAIConfig(robotId);

      // 构建历史消息摘要
      const historySummary = this.buildHistorySummary(history_messages);

      // 构建提示词
      const prompt = aiConfig.sentiment_prompt_template
        .replace('{current_message}', JSON.stringify(current_message))
        .replace('{history_summary}', historySummary);

      console.log('[RobotAIService] 开始情感分析...');

      // 调用AI模型
      const result = await this.callAIModel(aiConfig.sentiment_model, prompt);

      // 解析结果
      const sentimentResult = this.parseAIResponse(result);

      console.log('[RobotAIService] 情感分析完成:', sentimentResult);

      return sentimentResult;

    } catch (error) {
      console.error('[RobotAIService] ❌ 情感分析失败:', error);
      // 返回默认情感
      return {
        sentiment: 'neutral',
        confidence: 50,
        emotional_intensity: 3,
        key_emotions: [],
        reasoning: '情感分析失败，返回默认值'
      };
    }
  }

  /**
   * 调用AI模型
   */
  async callAIModel(modelConfig, prompt) {
    // 这里需要集成实际的AI模型调用
    // 根据modelConfig.provider选择不同的AI服务

    // TODO: 实际集成LLM Skill
    // 目前返回模拟数据用于测试
    console.log('[RobotAIService] 调用AI模型:', modelConfig.provider, modelConfig.model);

    return this.mockAIResponse(prompt);
  }

  /**
   * 解析AI响应
   */
  parseAIResponse(result) {
    try {
      // 尝试解析JSON
      return JSON.parse(result);
    } catch (error) {
      console.error('[RobotAIService] 解析AI响应失败:', error);
      throw new Error('AI响应格式错误');
    }
  }

  /**
   * 构建历史消息摘要
   */
  buildHistorySummary(historyMessages) {
    if (historyMessages.length === 0) {
      return '无历史消息';
    }

    const lastMessages = historyMessages.slice(-3);
    return lastMessages.map(msg => `${msg.sender_name}: ${msg.content}`).join('\n');
  }

  /**
   * 获取意图类别列表
   */
  getIntentCategories() {
    return [
      { name: 'product_inquiry', description: '产品咨询' },
      { name: 'price_inquiry', description: '价格咨询' },
      { name: 'order_inquiry', description: '订单查询' },
      { name: 'after_sales', description: '售后服务' },
      { name: 'complaint', description: '投诉建议' },
      { name: 'greeting', description: '打招呼' },
      { name: 'farewell', description: '告别' },
      { name: 'unknown', description: '无法识别' }
    ];
  }

  /**
   * 模拟AI响应（用于测试）
   */
  mockAIResponse(prompt) {
    if (prompt.includes('意图识别')) {
      return JSON.stringify({
        intent: 'product_inquiry',
        confidence: 85,
        reasoning: '用户询问了产品相关功能'
      });
    } else {
      return JSON.stringify({
        sentiment: 'positive',
        confidence: 75,
        emotional_intensity: 3,
        key_emotions: ['满意', '期待'],
        reasoning: '用户表达了积极的情感'
      });
    }
  }

  /**
   * 清除机器人AI配置缓存
   */
  clearRobotConfigCache(robotId) {
    this.robotAIConfigs.delete(robotId);
    console.log(`[RobotAIService] 已清除机器人 ${robotId} 的AI配置缓存`);
  }

  /**
   * 清除所有配置缓存
   */
  clearAllConfigCache() {
    this.robotAIConfigs.clear();
    console.log('[RobotAIService] 已清除所有机器人AI配置缓存');
  }
}

// 导出单例
module.exports = new RobotAIService();
