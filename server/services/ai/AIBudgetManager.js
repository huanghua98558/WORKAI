/**
 * AI预算控制管理
 * 提供预算设置、成本追踪和预警功能
 */

const { getDb } = require('coze-coding-dev-sdk');
const { aiBudgetSettings, aiModelUsage } = require('../../database/schema');
const { eq, and, sql, desc } = require('drizzle-orm');
const { getLogger } = require('../../lib/logger');

const logger = getLogger('AI_BUDGET_MANAGER');

class AIBudgetManager {
  constructor() {
    // 默认预算设置
    this.defaultSettings = {
      monthlyBudget: 10000.00, // 月度预算（元）
      dailyBudget: 500.00, // 日预算（元）
      warningThreshold: 0.8, // 预警阈值（80%）
      criticalThreshold: 0.95, // 严重阈值（95%）
      enabled: true // 是否启用预算控制
    };
  }

  /**
   * 获取预算设置
   * @param {string} organizationId - 组织ID（用于多租户）
   * @returns {Promise<Object>}
   */
  async getBudgetSettings(organizationId = 'default') {
    try {
      const db = await getDb();

      const settings = await db
        .select()
        .from(aiBudgetSettings)
        .where(eq(aiBudgetSettings.organizationId, organizationId))
        .limit(1);

      if (settings.length === 0) {
        // 创建默认设置
        const newSettings = await db.insert(aiBudgetSettings).values({
          organizationId,
          ...this.defaultSettings,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        return newSettings[0];
      }

      return settings[0];
    } catch (error) {
      logger.error('获取预算设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新预算设置
   * @param {string} organizationId - 组织ID
   * @param {Object} updates - 更新的字段
   * @returns {Promise<Object>}
   */
  async updateBudgetSettings(organizationId, updates) {
    try {
      const db = await getDb();

      const result = await db
        .update(aiBudgetSettings)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(aiBudgetSettings.organizationId, organizationId))
        .returning();

      return result[0];
    } catch (error) {
      logger.error('更新预算设置失败:', error);
      throw error;
    }
  }

  /**
   * 计算指定时间范围内的成本
   * @param {string} organizationId - 组织ID
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Promise<number>}
   */
  async calculateCost(organizationId, startDate, endDate) {
    try {
      const db = await getDb();

      const result = await db
        .select({
          totalCost: sql`COALESCE(SUM(${aiModelUsage.cost}), 0)`
        })
        .from(aiModelUsage)
        .where(
          and(
            eq(aiModelUsage.organizationId, organizationId),
            sql`${aiModelUsage.createdAt} >= ${startDate}`,
            sql`${aiModelUsage.createdAt} <= ${endDate}`
          )
        );

      return parseFloat(result[0].totalCost) || 0;
    } catch (error) {
      logger.error('计算成本失败:', error);
      throw error;
    }
  }

  /**
   * 检查预算状态
   * @param {string} organizationId - 组织ID
   * @returns {Promise<Object>}
   */
  async checkBudgetStatus(organizationId = 'default') {
    try {
      const settings = await this.getBudgetSettings(organizationId);

      if (!settings.enabled) {
        return {
          enabled: false,
          status: 'disabled'
        };
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 计算本月和今日成本
      const [monthlyCost, dailyCost] = await Promise.all([
        this.calculateCost(organizationId, startOfMonth, now),
        this.calculateCost(organizationId, startOfDay, now)
      ]);

      // 计算使用率
      const monthlyUsageRate = monthlyCost / settings.monthlyBudget;
      const dailyUsageRate = dailyCost / settings.dailyBudget;

      // 判断状态
      let status = 'normal';
      if (monthlyUsageRate >= settings.criticalThreshold || dailyUsageRate >= settings.criticalThreshold) {
        status = 'critical';
      } else if (monthlyUsageRate >= settings.warningThreshold || dailyUsageRate >= settings.warningThreshold) {
        status = 'warning';
      }

      return {
        enabled: true,
        status,
        monthlyCost,
        monthlyBudget: settings.monthlyBudget,
        monthlyUsageRate,
        dailyCost,
        dailyBudget: settings.dailyBudget,
        dailyUsageRate,
        remainingMonthlyBudget: settings.monthlyBudget - monthlyCost,
        remainingDailyBudget: settings.dailyBudget - dailyCost,
        warningThreshold: settings.warningThreshold,
        criticalThreshold: settings.criticalThreshold
      };
    } catch (error) {
      logger.error('检查预算状态失败:', error);
      throw error;
    }
  }

  /**
   * 记录AI使用并检查预算
   * @param {Object} usageRecord - 使用记录
   * @returns {Promise<Object>}
   */
  async recordUsageAndCheckBudget(usageRecord) {
    try {
      const organizationId = usageRecord.organizationId || 'default';

      // 先记录使用情况（这个在AIUsageTracker中已完成）
      // 这里只检查预算状态

      const budgetStatus = await this.checkBudgetStatus(organizationId);

      // 如果预算超限，返回警告
      if (budgetStatus.enabled && budgetStatus.status === 'critical') {
        logger.warn(`预算严重超限: ${JSON.stringify(budgetStatus)}`);
        return {
          allowed: false,
          budgetStatus,
          message: '预算已达到严重阈值，建议立即停止AI服务'
        };
      }

      if (budgetStatus.enabled && budgetStatus.status === 'warning') {
        logger.warn(`预算预警: ${JSON.stringify(budgetStatus)}`);
        return {
          allowed: true,
          budgetStatus,
          message: '预算已达到预警阈值，请注意控制使用'
        };
      }

      return {
        allowed: true,
        budgetStatus,
        message: '预算正常'
      };
    } catch (error) {
      logger.error('记录使用并检查预算失败:', error);
      throw error;
    }
  }

  /**
   * 获取预算使用趋势
   * @param {string} organizationId - 组织ID
   * @param {number} days - 查询天数
   * @returns {Promise<Array>}
   */
  async getBudgetTrend(organizationId = 'default', days = 7) {
    try {
      const db = await getDb();

      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - days);

      const result = await db
        .select({
          date: sql`DATE(${aiModelUsage.createdAt})`,
          totalCost: sql`COALESCE(SUM(${aiModelUsage.cost}), 0)`,
          totalTokens: sql`COALESCE(SUM(${aiModelUsage.totalTokens}), 0)`,
          totalCalls: sql`COUNT(*)`
        })
        .from(aiModelUsage)
        .where(
          and(
            eq(aiModelUsage.organizationId, organizationId),
            sql`${aiModelUsage.createdAt} >= ${startDate}`
          )
        )
        .groupBy(sql`DATE(${aiModelUsage.createdAt})`)
        .orderBy(sql`DATE(${aiModelUsage.createdAt})`);

      return result;
    } catch (error) {
      logger.error('获取预算趋势失败:', error);
      throw error;
    }
  }
}

// 导出单例
module.exports = new AIBudgetManager();
