/**
 * AI使用记录追踪服务
 * 用于记录AI模型的使用情况、成本和性能指标
 */

const { getDb } = require('coze-coding-dev-sdk');
const { aiModelUsage, aiModels, aiProviders } = require('../../database/schema');
const { getLogger } = require('../../lib/logger');
const { sql, eq, desc } = require('drizzle-orm');

const logger = getLogger('AI_USAGE_TRACKER');

class AIUsageTracker {
  /**
   * 记录AI使用情况
   * @param {Object} data - 使用数据
   * @param {string} data.modelId - 模型ID
   * @param {string} data.providerId - 提供商ID
   * @param {string} data.operationType - 操作类型
   * @param {number} data.inputTokens - 输入token数
   * @param {number} data.outputTokens - 输出token数
   * @param {number} data.totalTokens - 总token数
   * @param {number} data.responseTime - 响应时间（毫秒）
   * @param {string} data.status - 状态
   * @param {string} data.errorMessage - 错误信息
   * @param {Object} data.metadata - 元数据
   * @param {string} data.sessionId - 会话ID（可选）
   */
  static async recordUsage(data) {
    try {
      const {
        modelId,
        providerId,
        operationType,
        inputTokens = 0,
        outputTokens = 0,
        totalTokens = 0,
        responseTime,
        status = 'success',
        errorMessage,
        metadata = {},
        sessionId
      } = data;

      // 获取模型价格信息
      const modelInfo = await getDb()
        .select()
        .from(aiModels)
        .where(eq(aiModels.id, modelId))
        .limit(1);

      const inputPrice = modelInfo[0]?.inputPrice || 0;
      const outputPrice = modelInfo[0]?.outputPrice || 0;

      // 计算成本（价格单位：每1K tokens）
      const inputCost = (inputTokens / 1000) * parseFloat(inputPrice || 0);
      const outputCost = (outputTokens / 1000) * parseFloat(outputPrice || 0);
      const totalCost = inputCost + outputCost;

      // 插入使用记录
      await getDb().insert(aiModelUsage).values({
        modelId,
        providerId,
        sessionId,
        operationType,
        inputTokens,
        outputTokens,
        totalTokens,
        inputCost: inputCost.toString(),
        outputCost: outputCost.toString(),
        totalCost: totalCost.toString(),
        responseTime,
        status,
        errorMessage,
        metadata: JSON.stringify(metadata)
      });

      logger.info('AI使用记录已保存', {
        modelId,
        operationType,
        totalTokens,
        responseTime,
        status
      });

      return { success: true, cost: totalCost };
    } catch (error) {
      logger.error('记录AI使用失败', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取使用统计
   * @param {Object} filters - 过滤条件
   * @param {string} filters.startDate - 开始日期
   * @param {string} filters.endDate - 结束日期
   * @param {string} filters.modelId - 模型ID
   * @param {string} filters.providerId - 提供商ID
   * @param {string} filters.operationType - 操作类型
   */
  static async getUsageStats(filters = {}) {
    try {
      const db = await getDb();
      const {
        startDate,
        endDate,
        modelId,
        providerId,
        operationType
      } = filters;

      // 构建查询条件
      const conditions = [];

      if (startDate) {
        conditions.push(sql`created_at >= ${startDate}`);
      }
      if (endDate) {
        conditions.push(sql`created_at <= ${endDate}`);
      }
      if (modelId) {
        conditions.push(eq(aiModelUsage.modelId, modelId));
      }
      if (providerId) {
        conditions.push(eq(aiModelUsage.providerId, providerId));
      }
      if (operationType) {
        conditions.push(eq(aiModelUsage.operationType, operationType));
      }

      // 聚合查询
      const stats = await db
        .select({
          totalCalls: sql`COUNT(*)`,
          totalTokens: sql`SUM(total_tokens)`,
          totalInputTokens: sql`SUM(input_tokens)`,
          totalOutputTokens: sql`SUM(output_tokens)`,
          totalCost: sql`SUM(total_cost::numeric)`,
          avgResponseTime: sql`AVG(response_time)`,
          successRate: sql`COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*) * 100`,
          errorCount: sql`COUNT(*) FILTER (WHERE status = 'error')`
        })
        .from(aiModelUsage)
        .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : sql`1=1`);

      // 调用明细
      const details = await db
        .select({
          id: aiModelUsage.id,
          modelId: aiModelUsage.modelId,
          modelName: aiModels.displayName,
          providerName: aiProviders.displayName,
          operationType: aiModelUsage.operationType,
          totalTokens: aiModelUsage.totalTokens,
          totalCost: aiModelUsage.totalCost,
          responseTime: aiModelUsage.responseTime,
          status: aiModelUsage.status,
          createdAt: aiModelUsage.createdAt
        })
        .from(aiModelUsage)
        .leftJoin(aiModels, eq(aiModelUsage.modelId, aiModels.id))
        .leftJoin(aiProviders, eq(aiModelUsage.providerId, aiProviders.id))
        .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : sql`1=1`)
        .orderBy(desc(aiModelUsage.createdAt))
        .limit(100);

      return {
        success: true,
        data: {
          stats: stats[0] || {},
          details
        }
      };
    } catch (error) {
      logger.error('获取使用统计失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取模型使用排行榜
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   */
  static async getModelRanking(startDate, endDate) {
    try {
      const db = await getDb();
      const conditions = [];

      if (startDate) {
        conditions.push(sql`created_at >= ${startDate}`);
      }
      if (endDate) {
        conditions.push(sql`created_at <= ${endDate}`);
      }

      const ranking = await db
        .select({
          modelId: aiModelUsage.modelId,
          modelName: aiModels.displayName,
          providerName: aiProviders.displayName,
          totalCalls: sql`COUNT(*)`,
          totalTokens: sql`SUM(total_tokens)`,
          totalCost: sql`SUM(total_cost::numeric)`,
          avgResponseTime: sql`AVG(response_time)`
        })
        .from(aiModelUsage)
        .leftJoin(aiModels, eq(aiModelUsage.modelId, aiModels.id))
        .leftJoin(aiProviders, eq(aiModelUsage.providerId, aiProviders.id))
        .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : sql`1=1`)
        .groupBy(aiModelUsage.modelId, aiModels.displayName, aiProviders.displayName)
        .orderBy(desc(sql`COUNT(*)`));

      return {
        success: true,
        data: ranking
      };
    } catch (error) {
      logger.error('获取模型排名失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AIUsageTracker;
