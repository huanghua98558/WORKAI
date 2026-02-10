/**
 * RobotAIService - 机器人专属AI服务
 * 
 * 功能：
 * - 每个机器人配置独立的AI模型
 * - 意图识别（Intent Recognition）
 * - 情感分析（Sentiment Analysis）
 * - 支持多模型配置（不同机器人可以使用不同的AI模型）
 * 
 * 更新日期: 2025-02-10
 * 集成真实的 LLM API (coze-coding-dev-sdk)
 */

const { getDb } = require('coze-coding-dev-sdk');
const { LLMClient, Config } = require('coze-coding-dev-sdk');
const { eq } = require('drizzle-orm');
const { robotAIConfigs, aiModels } = require('../database/robot-ai-config.schema');
const { aiModels: aiModelsTable } = require('../database/schema');

class RobotAIService {
  constructor() {
    this.robotAIConfigsCache = new Map(); // 缓存机器人AI配置
    this.llmClient = null; // LLM 客户端
    console.log('[RobotAIService] 机器人AI服务初始化完成');
  }

  async getDb() {
    return getDb();
  }

  /**
   * 获取 LLM 客户端（单例模式）
   */
  getLLMClient() {
    if (!this.llmClient) {
      const config = new Config();
      this.llmClient = new LLMClient(config);
    }
    return this.llmClient;
  }

  /**
   * 获取机器人AI配置（从数据库）
   */
  async getRobotAIConfig(robotId) {
    // 先从缓存读取
    if (this.robotAIConfigsCache.has(robotId)) {
      return this.robotAIConfigsCache.get(robotId);
    }

    const db = await this.getDb();

    // 从 robot_ai_configs 表查询
    const configs = await db.select()
      .from(robotAIConfigs)
      .where(eq(robotAIConfigs.robotId, robotId))
      .limit(1);

    if (configs.length === 0) {
      // 如果没有配置，返回默认配置
      console.warn(`[RobotAIService] 机器人 ${robotId} 未找到AI配置，使用默认配置`);
      const defaultConfig = this.getDefaultAIConfig(robotId);
      this.robotAIConfigsCache.set(robotId, defaultConfig);
      return defaultConfig;
    }

    const config = configs[0];

    // 获取模型详细信息
    let intentModelDetail = null;
    let sentimentModelDetail = null;

    if (config.intentModelId) {
      const intentModels = await db.select()
        .from(aiModelsTable)
        .where(eq(aiModelsTable.id, config.intentModelId))
        .limit(1);
      if (intentModels.length > 0) {
        intentModelDetail = intentModels[0];
      }
    }

    if (config.sentimentModelId) {
      const sentimentModels = await db.select()
        .from(aiModelsTable)
        .where(eq(aiModelsTable.id, config.sentimentModelId))
        .limit(1);
      if (sentimentModels.length > 0) {
        sentimentModelDetail = sentimentModels[0];
      }
    }

    // 构建完整配置
    const aiConfig = {
      robot_id: config.robotId,
      robot_name: config.robotName,
      enabled: config.enabled,
      intent: {
        model_id: config.intentModelId,
        model_detail: intentModelDetail,
        system_prompt: config.intentSystemPrompt || this.getDefaultIntentPrompt(),
        temperature: parseFloat(config.intentTemperature) || 0.5,
        confidence_threshold: parseFloat(config.intentConfidenceThreshold) || 0.6,
      },
      sentiment: {
        model_id: config.sentimentModelId,
        model_detail: sentimentModelDetail,
        system_prompt: config.sentimentSystemPrompt || this.getDefaultSentimentPrompt(),
        temperature: parseFloat(config.sentimentTemperature) || 0.3,
      }
    };

    // 缓存配置
    this.robotAIConfigsCache.set(robotId, aiConfig);

    return aiConfig;
  }

  /**
   * 获取默认AI配置
   */
  getDefaultAIConfig(robotId) {
    return {
      robot_id: robotId,
      robot_name: '默认机器人',
      enabled: true,
      intent: {
        model_id: null,
        model_detail: null,
        system_prompt: this.getDefaultIntentPrompt(),
        temperature: 0.5,
        confidence_threshold: 0.6,
      },
      sentiment: {
        model_id: null,
        model_detail: null,
        system_prompt: this.getDefaultSentimentPrompt(),
        temperature: 0.3,
      }
    };
  }

  /**
   * 获取默认意图识别提示词
   */
  getDefaultIntentPrompt() {
    return `你是一个专业的意图识别助手。请分析用户的输入，识别其意图。

可能的意图包括：
- inquiry: 咨询类问题（价格、功能、使用方法等）
- complaint: 投诉类问题（服务不满、产品问题等）
- technical: 技术支持类问题（故障排查、技术疑问等）
- administrative: 行政类问题（账户、订单、退款等）
- appointment: 预约类问题（预约服务、安排时间等）
- casual: 闲聊类问题（问候、感谢、其他非业务话题）

请只返回 JSON 格式的结果：{"intent": "xxx", "confidence": 0.xx}`;
  }

  /**
   * 获取默认情感分析提示词
   */
  getDefaultSentimentPrompt() {
    return `你是一个情感分析助手。请分析用户文本的情感倾向。

可能的情感包括：
- positive: 积极情感（满意、赞美、开心等）
- neutral: 中性情感（平静、客观、中性等）
- negative: 消极情感（不满、抱怨、失望等）
- angry: 愤怒情感（愤怒、怒骂、威胁等）

请只返回 JSON 格式的结果：{"sentiment": "xxx", "score": 0.xx}`;
  }

  /**
   * 意图识别
   */
  async recognizeIntent(contextData) {
    const { current_message } = contextData;

    try {
      // 获取机器人AI配置
      const robotId = contextData.robotId;
      const aiConfig = await this.getRobotAIConfig(robotId);

      if (!aiConfig.enabled) {
        console.log('[RobotAIService] 机器人AI未启用，返回默认意图');
        return { intent: 'unknown', confidence: 0.5, reasoning: 'AI未启用' };
      }

      // 构建提示词
      const prompt = aiConfig.intent.system_prompt + `\n\n当前消息：${current_message}`;

      console.log('[RobotAIService] 开始意图识别...');

      // 调用AI模型
      const result = await this.callAIModel(
        aiConfig.intent.model_detail?.model_id || 'doubao-seed-1-8-251228',
        prompt,
        { temperature: aiConfig.intent.temperature }
      );

      // 解析结果
      const intentResult = this.parseJSONResponse(result);

      // 检查置信度
      if (intentResult.confidence < aiConfig.intent.confidence_threshold) {
        console.log('[RobotAIService] 置信度低于阈值，返回 unknown');
        intentResult.intent = 'unknown';
        intentResult.reasoning = `置信度 ${intentResult.confidence} 低于阈值 ${aiConfig.intent.confidence_threshold}`;
      }

      console.log('[RobotAIService] 意图识别完成:', intentResult);

      return intentResult;

    } catch (error) {
      console.error('[RobotAIService] ❌ 意图识别失败:', error);
      // 返回默认意图
      return {
        intent: 'unknown',
        confidence: 0.3,
        reasoning: '意图识别失败，返回默认值'
      };
    }
  }

  /**
   * 情感分析
   */
  async analyzeSentiment(contextData) {
    const { current_message } = contextData;

    try {
      // 获取机器人AI配置
      const robotId = contextData.robotId;
      const aiConfig = await this.getRobotAIConfig(robotId);

      if (!aiConfig.enabled) {
        console.log('[RobotAIService] 机器人AI未启用，返回默认情感');
        return { sentiment: 'neutral', score: 0.5, reasoning: 'AI未启用' };
      }

      // 构建提示词
      const prompt = aiConfig.sentiment.system_prompt + `\n\n当前消息：${current_message}`;

      console.log('[RobotAIService] 开始情感分析...');

      // 调用AI模型
      const result = await this.callAIModel(
        aiConfig.sentiment.model_detail?.model_id || 'doubao-seed-1-8-251228',
        prompt,
        { temperature: aiConfig.sentiment.temperature }
      );

      // 解析结果
      const sentimentResult = this.parseJSONResponse(result);

      console.log('[RobotAIService] 情感分析完成:', sentimentResult);

      return sentimentResult;

    } catch (error) {
      console.error('[RobotAIService] ❌ 情感分析失败:', error);
      // 返回默认情感
      return {
        sentiment: 'neutral',
        score: 0.5,
        reasoning: '情感分析失败，返回默认值'
      };
    }
  }

  /**
   * 调用AI模型（使用真实的 LLM API）
   */
  async callAIModel(modelId, prompt, options = {}) {
    const client = this.getLLMClient();

    const messages = [
      { role: 'user', content: prompt }
    ];

    const llmConfig = {
      model: modelId,
      temperature: options.temperature || 0.7,
      thinking: 'disabled',
      caching: 'disabled',
    };

    console.log(`[RobotAIService] 调用LLM模型: ${modelId}, temperature: ${llmConfig.temperature}`);

    try {
      const response = await client.invoke(messages, llmConfig);
      return response.content;
    } catch (error) {
      console.error('[RobotAIService] LLM调用失败:', error);
      throw error;
    }
  }

  /**
   * 解析JSON响应
   */
  parseJSONResponse(result) {
    try {
      // 尝试直接解析
      return JSON.parse(result);
    } catch (error) {
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('[RobotAIService] JSON提取后解析失败:', e);
        }
      }

      console.error('[RobotAIService] 解析AI响应失败:', error);
      // 返回默认值
      return {
        intent: 'unknown',
        sentiment: 'neutral',
        confidence: 0.3,
        score: 0.5,
        reasoning: '解析失败'
      };
    }
  }

  /**
   * 清除机器人AI配置缓存
   */
  clearRobotConfigCache(robotId) {
    this.robotAIConfigsCache.delete(robotId);
    console.log(`[RobotAIService] 已清除机器人 ${robotId} 的AI配置缓存`);
  }

  /**
   * 清除所有配置缓存
   */
  clearAllConfigCache() {
    this.robotAIConfigsCache.clear();
    console.log('[RobotAIService] 已清除所有机器人AI配置缓存');
  }
}

// 导出单例
module.exports = new RobotAIService();
