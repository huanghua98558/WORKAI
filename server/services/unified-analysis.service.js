/**
 * UnifiedAnalysisService - 统一AI分析服务
 * 
 * 功能：
 * - 整合上下文准备和AI分析功能
 * - 为工作流节点提供统一的分析入口
 * - 支持意图识别和情感分析
 * - 返回完整的分析结果
 */

const contextPreparationService = require('./context-preparation.service');
const robotAIService = require('./robot-ai.service');
const alertTriggerService = require('./alert-trigger.service');
const taskAssignmentService = require('./task-assignment.service');

class UnifiedAnalysisService {
  constructor() {
    this.contextPreparationService = contextPreparationService;
    this.robotAIService = robotAIService;
    console.log('[UnifiedAnalysisService] 统一AI分析服务初始化完成');
  }

  /**
   * 执行统一分析（主入口）
   * @param {string} sessionId - 会话ID
   * @param {Object} message - 消息对象
   * @param {Object} robot - 机器人对象
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} 完整分析结果
   */
  async analyze(sessionId, message, robot, options = {}) {
    console.log('[UnifiedAnalysis] === 开始统一分析 ===');
    console.log('[UnifiedAnalysis] sessionId:', sessionId);
    console.log('[UnifiedAnalysis] robotId:', robot.robotId);

    const {
      enableIntent = true,      // 是否启用意图识别
      enableSentiment = true,   // 是否启用情感分析
      enableContext = true      // 是否启用上下文准备
    } = options;

    try {
      // 1. 准备上下文数据
      let contextData = null;
      if (enableContext) {
        contextData = await this.contextPreparationService.prepareContext(
          sessionId,
          message,
          robot
        );
      } else {
        contextData = {
          session_id: sessionId,
          robotId: robot.robotId,
          history_messages: [],
          current_message: message,
          user_profile: {},
          staff_status: {},
          task_status: {},
          group_info: {},
          metadata: {}
        };
      }

      // 2. 执行意图识别
      let intentResult = null;
      if (enableIntent) {
        intentResult = await this.robotAIService.recognizeIntent(contextData);
      }

      // 3. 执行情感分析
      let sentimentResult = null;
      if (enableSentiment) {
        sentimentResult = await this.robotAIService.analyzeSentiment(contextData);
      }

      // 4. 构建分析结果
      const analysisResult = {
        session_id: sessionId,
        robot_id: robot.robotId,
        message_id: message.messageId,
        analysis_time: new Date().toISOString(),

        // 上下文数据
        context: {
          is_new_session: contextData.is_new_session,
          context_count: contextData.metadata.context_count,
          context_type: contextData.metadata.context_type,
          retrieval_time: contextData.metadata.retrieval_time,
          retrieval_strategy: contextData.metadata.retrieval_strategy
        },

        // 用户画像摘要
        user_profile_summary: {
          user_id: contextData.user_profile.user_id,
          user_name: contextData.user_profile.user_name,
          satisfaction_score: contextData.user_profile.satisfaction_score,
          problem_resolution_rate: contextData.user_profile.problem_resolution_rate,
          message_count: contextData.user_profile.message_count,
          user_type: contextData.user_profile.user_type
        },

        // 意图识别结果
        intent: intentResult ? {
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          reasoning: intentResult.reasoning
        } : null,

        // 情感分析结果
        sentiment: sentimentResult ? {
          sentiment: sentimentResult.sentiment,
          confidence: sentimentResult.confidence,
          emotional_intensity: sentimentResult.emotional_intensity,
          key_emotions: sentimentResult.key_emotions,
          reasoning: sentimentResult.reasoning
        } : null,

        // 后续行动建议
        action_suggestions: this.generateActionSuggestions(
          intentResult,
          sentimentResult,
          contextData
        ),

        // 告警触发判断
        alert_trigger: this.checkAlertTrigger(
          intentResult,
          sentimentResult,
          contextData
        )
      };

      console.log('[UnifiedAnalysis] ✅ 统一分析完成:', {
        intent: analysisResult.intent?.intent,
        sentiment: analysisResult.sentiment?.sentiment,
        hasActionSuggestion: analysisResult.action_suggestions.length > 0,
        shouldTriggerAlert: analysisResult.alert_trigger.should_trigger
      });

      // 如果需要触发告警，执行告警触发逻辑
      if (analysisResult.alert_trigger.should_trigger) {
        console.log('[UnifiedAnalysis] 触发告警...');
        try {
          await alertTriggerService.triggerAlert({
            sessionId,
            intentType: intentResult?.intent || 'unknown',
            intent: intentResult?.intent,
            userId: message.senderId,
            userName: message.receivedName,
            groupId: message.groupId,
            groupName: message.groupName,
            messageContent: message.content,
            robotId: robot.robotId,
            robotName: robot.name,
            alertLevel: analysisResult.alert_trigger.alert_level,
            sentiment: sentimentResult?.sentiment
          });
          console.log('[UnifiedAnalysis] ✅ 告警触发成功');
        } catch (alertError) {
          console.error('[UnifiedAnalysis] ❌ 告警触发失败:', alertError);
          // 告警触发失败不影响后续流程
        }
      }

      // 创建任务（基于分析结果）
      try {
        const task = await taskAssignmentService.createTaskFromAnalysis(analysisResult, {
          sessionId,
          message,
          robot,
        });
        if (task) {
          console.log('[UnifiedAnalysis] ✅ 任务创建成功:', task.taskId);
          // 将任务 ID 添加到分析结果中
          analysisResult.task_id = task.taskId;
          analysisResult.task_created = true;
        } else {
          analysisResult.task_created = false;
        }
      } catch (taskError) {
        console.error('[UnifiedAnalysis] ❌ 任务创建失败:', taskError);
        // 任务创建失败不影响分析结果返回
        analysisResult.task_created = false;
      }

      return analysisResult;

    } catch (error) {
      console.error('[UnifiedAnalysis] ❌ 统一分析失败:', error);
      throw error;
    }
  }

  /**
   * 生成后续行动建议
   */
  generateActionSuggestions(intentResult, sentimentResult, contextData) {
    const suggestions = [];

    // 根据意图生成建议
    if (intentResult) {
      switch (intentResult.intent) {
        case 'product_inquiry':
          suggestions.push({
            type: 'product_info',
            priority: 'medium',
            action: '提供产品信息',
            description: '用户询问产品，需要提供相关产品介绍'
          });
          break;

        case 'price_inquiry':
          suggestions.push({
            type: 'price_info',
            priority: 'medium',
            action: '提供价格信息',
            description: '用户询问价格，需要提供相关价格表'
          });
          break;

        case 'order_inquiry':
          suggestions.push({
            type: 'order_check',
            priority: 'medium',
            action: '查询订单状态',
            description: '用户查询订单，需要提供订单状态信息'
          });
          break;

        case 'after_sales':
          suggestions.push({
            type: 'after_sales_support',
            priority: 'high',
            action: '提供售后服务',
            description: '用户需要售后支持，建议人工介入'
          });
          break;

        case 'complaint':
          suggestions.push({
            type: 'complaint_handling',
            priority: 'critical',
            action: '处理投诉',
            description: '用户投诉，需要立即人工介入'
          });
          break;
      }
    }

    // 根据情感生成建议
    if (sentimentResult) {
      if (sentimentResult.sentiment === 'negative' && sentimentResult.emotional_intensity >= 4) {
        suggestions.push({
          type: 'emotion_soothing',
          priority: 'high',
          action: '安抚用户情绪',
          description: '用户情绪较为负面，需要进行安抚'
        });
      } else if (sentimentResult.sentiment === 'positive' && sentimentResult.emotional_intensity >= 4) {
        suggestions.push({
          type: 'thank_you',
          priority: 'low',
          action: '感谢用户',
          description: '用户情绪积极，可以表达感谢'
        });
      }
    }

    // 根据用户画像生成建议
    if (contextData.user_profile.satisfaction_score < 40) {
      suggestions.push({
        type: 'satisfaction_improvement',
        priority: 'high',
        action: '提升满意度',
        description: '用户满意度较低，需要关注服务质量'
      });
    }

    // 去重
    const uniqueSuggestions = [];
    const suggestionTypes = new Set();
    for (const suggestion of suggestions) {
      if (!suggestionTypes.has(suggestion.type)) {
        suggestionTypes.add(suggestion.type);
        uniqueSuggestions.push(suggestion);
      }
    }

    return uniqueSuggestions;
  }

  /**
   * 检查是否需要触发告警
   */
  checkAlertTrigger(intentResult, sentimentResult, contextData) {
    const triggerConditions = [];
    let shouldTrigger = false;
    let alertLevel = 'info';

    // 意图告警
    if (intentResult) {
      if (intentResult.intent === 'complaint') {
        shouldTrigger = true;
        alertLevel = 'critical';
        triggerConditions.push({
          type: 'intent',
          condition: '投诉意图',
          severity: 'critical'
        });
      }
    }

    // 情感告警
    if (sentimentResult) {
      if (sentimentResult.sentiment === 'negative' && sentimentResult.emotional_intensity >= 4) {
        shouldTrigger = true;
        if (alertLevel !== 'critical') {
          alertLevel = 'high';
        }
        triggerConditions.push({
          type: 'sentiment',
          condition: '负面情绪高强度',
          severity: 'high'
        });
      }
    }

    // 用户满意度告警
    if (contextData.user_profile.satisfaction_score < 30) {
      shouldTrigger = true;
      if (alertLevel !== 'critical' && alertLevel !== 'high') {
        alertLevel = 'medium';
      }
      triggerConditions.push({
        type: 'user_satisfaction',
        condition: '用户满意度过低',
        severity: 'medium'
      });
    }

    // 任务超时告警
    if (contextData.task_status.has_pending_task) {
      const taskCreatedAt = new Date(contextData.task_status.created_at);
      const taskAge = Date.now() - taskCreatedAt.getTime();
      const hoursSinceCreated = taskAge / (1000 * 60 * 60);

      if (hoursSinceCreated > 24) {
        shouldTrigger = true;
        if (alertLevel !== 'critical' && alertLevel !== 'high') {
          alertLevel = 'medium';
        }
        triggerConditions.push({
          type: 'task_timeout',
          condition: '任务超时',
          severity: 'medium'
        });
      }
    }

    return {
      should_trigger: shouldTrigger,
      alert_level: alertLevel,
      trigger_conditions: triggerConditions
    };
  }

  /**
   * 快速分析（仅意图识别）
   */
  async quickAnalyzeIntent(sessionId, message, robot) {
    return this.analyze(sessionId, message, robot, {
      enableIntent: true,
      enableSentiment: false,
      enableContext: false
    });
  }

  /**
   * 快速分析（仅情感分析）
   */
  async quickAnalyzeSentiment(sessionId, message, robot) {
    return this.analyze(sessionId, message, robot, {
      enableIntent: false,
      enableSentiment: true,
      enableContext: false
    });
  }
}

// 导出单例
module.exports = new UnifiedAnalysisService();
