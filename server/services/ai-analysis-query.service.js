/**
 * AI 分析查询服务
 * 用于从 robot_ai_analysis_history 表查询 AI 分析历史
 */

const { getLogger } = require('../lib/logger');
const logger = getLogger('AI_ANALYSIS_QUERY');

/**
 * 查询指定会话的最新 AI 分析结果
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<Object|null>} AI 分析结果，如果不存在则返回 null
 */
async function getLatestAIAnalysis(sessionId) {
  try {
    const db = await getDb();

    // 查询最新的 AI 分析结果
    const query = `
      SELECT
        analysis_id,
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
        analysis_time,
        model_used
      FROM robot_ai_analysis_history
      WHERE session_id = $1
      ORDER BY analysis_time DESC
      LIMIT 1
    `;

    const result = await db.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // 转换为前端需要的格式
    return {
      analysisId: row.analysis_id,
      sessionId: row.session_id,
      robotId: row.robot_id,
      messageId: row.message_id,
      intent: row.intent,
      intentConfidence: row.intent_confidence,
      sentiment: row.sentiment,
      sentimentScore: row.sentiment_score,
      emotion: row.emotion,
      emotionConfidence: row.emotion_confidence,
      summary: row.summary,
      keywords: row.keywords,
      suggestedActions: row.suggested_actions,
      shouldTriggerAlert: row.should_trigger_alert,
      alertType: row.alert_type,
      analysisTime: row.analysis_time,
      modelUsed: row.model_used
    };
  } catch (error) {
    logger.error('[AI_ANALYSIS_QUERY] 查询 AI 分析失败', {
      sessionId,
      error: error.message
    });
    return null;
  }
}

/**
 * 批量查询多个会话的最新 AI 分析结果
 * @param {string[]} sessionIds - 会话 ID 数组
 * @returns {Promise<Map>} Map<sessionId, AIAnalysisResult>
 */
async function getBatchLatestAIAnalysis(sessionIds) {
  try {
    logger.info('[AI_ANALYSIS_QUERY] 批量查询 AI 分析', {
      sessionIds: sessionIds.length
    });

    if (!sessionIds || sessionIds.length === 0) {
      logger.info('[AI_ANALYSIS_QUERY] sessionIds 为空，返回空 Map');
      return new Map();
    }

    const db = await getDb();

    // 使用原生 SQL 查询（不依赖 schema 定义）
    const query = `
      WITH ranked_analyses AS (
        SELECT
          *,
          ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY analysis_time DESC) as rn
        FROM robot_ai_analysis_history
        WHERE session_id = ANY($1)
      )
      SELECT
        analysis_id,
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
        analysis_time,
        model_used
      FROM ranked_analyses
      WHERE rn = 1
    `;

    const result = await db.query(query, [sessionIds]);

    logger.info('[AI_ANALYSIS_QUERY] 批量查询结果', {
      totalRequested: sessionIds.length,
      totalFound: result.rows.length
    });

    const analysisMap = new Map();
    for (const row of result.rows) {
      analysisMap.set(row.session_id, {
        analysisId: row.analysis_id,
        sessionId: row.session_id,
        robotId: row.robot_id,
        messageId: row.message_id,
        intent: row.intent,
        intentConfidence: row.intent_confidence,
        sentiment: row.sentiment,
        sentimentScore: row.sentiment_score,
        emotion: row.emotion,
        emotionConfidence: row.emotion_confidence,
        summary: row.summary,
        keywords: row.keywords,
        suggestedActions: row.suggested_actions,
        shouldTriggerAlert: row.should_trigger_alert,
        alertType: row.alert_type,
        analysisTime: row.analysis_time,
        modelUsed: row.model_used
      });
    }

    return analysisMap;
  } catch (error) {
    logger.error('[AI_ANALYSIS_QUERY] 批量查询 AI 分析失败', {
      sessionIds: sessionIds.length,
      error: error.message,
      stack: error.stack
    });
    return new Map();
  }
}

module.exports = {
  getLatestAIAnalysis,
  getBatchLatestAIAnalysis
};
