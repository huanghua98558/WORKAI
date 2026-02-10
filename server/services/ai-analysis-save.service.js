/**
 * AI 分析保存服务
 * 用于将 AI 分析结果保存到 robot_ai_analysis_history 表
 */

const { getLogger } = require('../lib/logger');
const logger = getLogger('AI_ANALYSIS_SAVE');

/**
 * 保存 AI 分析结果到数据库
 * @param {Object} params - 分析参数
 * @param {string} params.sessionId - 会话 ID
 * @param {string} params.robotId - 机器人 ID
 * @param {string} params.messageId - 消息 ID
 * @param {Object} params.analysisResult - AI 分析结果
 * @returns {Promise<Object>} 保存的分析记录
 */
async function saveAIAnalysisResult({
  sessionId,
  robotId,
  messageId,
  analysisResult
}) {
  try {
    const db = await getDb();

    const {
      intent,
      sentiment,
      summary,
      keywords,
      suggestedActions,
      alertTrigger,
      actionSuggestions
    } = analysisResult;

    const query = `
      INSERT INTO robot_ai_analysis_history (
        session_id,
        robot_id,
        message_id,
        intent,
        intent_confidence,
        sentiment,
        sentiment_score,
        emotion,
        emotion_confidence,
        summary,
        keywords,
        suggested_actions,
        should_trigger_alert,
        alert_type,
        model_used,
        analysis_time
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
    `;

    const values = [
      sessionId,
      robotId,
      messageId,
      intent?.intent || null,
      intent?.confidence || 0,
      sentiment?.sentiment || null,
      sentiment?.confidence || 0,
      sentiment?.emotion || null,
      sentiment?.emotion_confidence || 0,
      summary || null,
      Array.isArray(keywords) ? keywords : [],
      Array.isArray(suggestedActions) || Array.isArray(actionSuggestions)
        ? (suggestedActions || actionSuggestions)
        : [],
      alertTrigger?.should_trigger || false,
      alertTrigger?.alert_type || null,
      intent?.model_used || 'unknown',
      new Date()
    ];

    const result = await db.query(query, values);

    logger.info('[AI_ANALYSIS_SAVE] 保存 AI 分析结果成功', {
      sessionId,
      robotId,
      messageId,
      intent: intent?.intent,
      sentiment: sentiment?.sentiment,
      shouldTriggerAlert: alertTrigger?.should_trigger
    });

    return result.rows[0];
  } catch (error) {
    logger.error('[AI_ANALYSIS_SAVE] 保存 AI 分析结果失败', {
      sessionId,
      robotId,
      messageId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  saveAIAnalysisResult
};
