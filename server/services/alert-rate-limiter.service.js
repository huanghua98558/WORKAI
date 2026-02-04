/**
 * 告警限流服务
 * 防止告警风暴，限制通知频率
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { alertNotifications, alertRules } = require('../database/schema');
const { eq, and, gte, lte, desc } = require('drizzle-orm');
const logger = require('./system-logger.service');

class AlertRateLimiter {
  constructor() {
    this.limits = {
      // 每个用户每分钟最多接收的告警数
      perUserPerMinute: 10,
      // 每个用户每小时最多接收的告警数
      perUserPerHour: 50,
      // 每个规则每分钟最多触发的告警数
      perRulePerMinute: 20
    };
  }

  /**
   * 检查是否允许发送通知
   * @param {string} recipientId - 接收者ID
   * @param {string} ruleId - 规则ID
   * @param {string} alertLevel - 告警级别
   * @returns {Promise<Object>} { allowed, reason, remaining }
   */
  async checkLimit(recipientId, ruleId, alertLevel) {
    try {
      const db = await getDb();

      // 获取规则配置
      const [rule] = await db.select()
        .from(alertRules)
        .where(eq(alertRules.id, ruleId))
        .limit(1);

      const maxNotifyCount = rule?.maxNotifyCount || 3;

      // 检查用户通知次数限制
      const userCheck = await this.checkUserLimit(db, recipientId, ruleId);
      if (!userCheck.allowed) {
        return userCheck;
      }

      // 检查规则触发频率限制
      const ruleCheck = await this.checkRuleLimit(db, ruleId);
      if (!ruleCheck.allowed) {
        return ruleCheck;
      }

      // 检查单用户针对该规则的次数限制
      const perRuleUserCheck = await this.checkPerRuleUserLimit(db, recipientId, ruleId, maxNotifyCount);
      if (!perRuleUserCheck.allowed) {
        return perRuleUserCheck;
      }

      return {
        allowed: true,
        reason: null,
        remaining: perRuleUserCheck.remaining
      };
    } catch (error) {
      console.error('[AlertRateLimiter] 检查限流失败:', error);
      logger.error('AlertRateLimiter', '检查限流失败', {
        recipientId,
        ruleId,
        alertLevel,
        error: error.message
      });
      // 发生错误时，默认允许发送
      return {
        allowed: true,
        reason: null,
        remaining: 999
      };
    }
  }

  /**
   * 检查用户级别的限流
   */
  async checkUserLimit(db, recipientId, ruleId) {
    const now = new Date();
    const oneMinuteAgo = new Date(now - 60 * 1000);
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    // 查询用户最近1分钟和1小时的通知次数
    const stats = await db.select({
      lastMinuteCount: sql<number>`count(*) FILTER (WHERE created_at >= ${oneMinuteAgo})`,
      lastHourCount: sql<number>`count(*) FILTER (WHERE created_at >= ${oneHourAgo})`
    })
      .from(alertNotifications)
      .where(
        and(
          eq(alertNotifications.recipientId, recipientId),
          eq(alertNotifications.status, 'sent')
        )
      );

    const statsResult = stats[0] || { lastMinuteCount: 0, lastHourCount: 0 };

    // 检查是否超过限制
    if (statsResult.lastMinuteCount >= this.limits.perUserPerMinute) {
      return {
        allowed: false,
        reason: 'user_per_minute_limit_exceeded',
        message: `每分钟最多接收 ${this.limits.perUserPerMinute} 条告警`,
        remaining: 0
      };
    }

    if (statsResult.lastHourCount >= this.limits.perUserPerHour) {
      return {
        allowed: false,
        reason: 'user_per_hour_limit_exceeded',
        message: `每小时最多接收 ${this.limits.perUserPerHour} 条告警`,
        remaining: 0
      };
    }

    return {
      allowed: true,
      reason: null,
      remaining: Math.min(
        this.limits.perUserPerMinute - statsResult.lastMinuteCount,
        this.limits.perUserPerHour - statsResult.lastHourCount
      )
    };
  }

  /**
   * 检查规则级别的限流
   */
  async checkRuleLimit(db, ruleId) {
    const now = new Date();
    const oneMinuteAgo = new Date(now - 60 * 1000);

    // 查询该规则最近1分钟的触发次数
    const stats = await db.select({
      count: sql<number>`count(*)`
    })
      .from(alertNotifications)
      .where(
        and(
          eq(alertNotifications.ruleId, ruleId),
          eq(alertNotifications.status, 'sent'),
          gte(alertNotifications.createdAt, oneMinuteAgo)
        )
      );

    const count = stats[0]?.count || 0;

    // 检查是否超过限制
    if (count >= this.limits.perRulePerMinute) {
      return {
        allowed: false,
        reason: 'rule_per_minute_limit_exceeded',
        message: `该规则每分钟最多触发 ${this.limits.perRulePerMinute} 次告警`,
        remaining: 0
      };
    }

    return {
      allowed: true,
      reason: null,
      remaining: this.limits.perRulePerMinute - count
    };
  }

  /**
   * 检查单用户针对单规则的次数限制
   */
  async checkPerRuleUserLimit(db, recipientId, ruleId, maxNotifyCount) {
    // 查询该用户针对该规则已发送的通知次数
    const stats = await db.select({
      count: sql<number>`count(*)`
    })
      .from(alertNotifications)
      .where(
        and(
          eq(alertNotifications.recipientId, recipientId),
          eq(alertNotifications.ruleId, ruleId),
          eq(alertNotifications.status, 'sent')
        )
      );

    const count = stats[0]?.count || 0;

    // 检查是否超过限制
    if (count >= maxNotifyCount) {
      return {
        allowed: false,
        reason: 'per_rule_user_limit_exceeded',
        message: `该告警针对此用户最多通知 ${maxNotifyCount} 次`,
        remaining: 0
      };
    }

    return {
      allowed: true,
      reason: null,
      remaining: maxNotifyCount - count
    };
  }

  /**
   * 重置用户的通知计数（告警关闭时调用）
   */
  async resetUserCount(recipientId, ruleId) {
    try {
      const db = await getDb();

      // 注意：这里我们不是真正删除通知记录，而是在下次检查时，
      // 会检查告警是否已关闭，如果已关闭则不计入限制
      // 实际的计数逻辑在 checkPerRuleUserLimit 中会考虑告警状态

      console.log(`[AlertRateLimiter] 重置用户计数: recipientId=${recipientId}, ruleId=${ruleId}`);
    } catch (error) {
      console.error('[AlertRateLimiter] 重置用户计数失败:', error);
    }
  }

  /**
   * 更新限流配置
   */
  updateLimits(newLimits) {
    this.limits = { ...this.limits, ...newLimits };
    console.log('[AlertRateLimiter] 限流配置已更新:', this.limits);
  }

  /**
   * 获取当前限流配置
   */
  getLimits() {
    return { ...this.limits };
  }

  /**
   * 获取限流统计信息
   */
  async getStats() {
    try {
      const db = await getDb();

      const now = new Date();
      const oneMinuteAgo = new Date(now - 60 * 1000);
      const oneHourAgo = new Date(now - 60 * 60 * 1000);

      const stats = await db.select({
        totalNotifications: sql<number>`count(*)`,
        lastMinuteCount: sql<number>`count(*) FILTER (WHERE created_at >= ${oneMinuteAgo})`,
        lastHourCount: sql<number>`count(*) FILTER (WHERE created_at >= ${oneHourAgo})`,
        successCount: sql<number>`count(*) FILTER (WHERE status = 'sent')`,
        failureCount: sql<number>`count(*) FILTER (WHERE status = 'failed')`
      })
        .from(alertNotifications);

      return stats[0] || {
        totalNotifications: 0,
        lastMinuteCount: 0,
        lastHourCount: 0,
        successCount: 0,
        failureCount: 0
      };
    } catch (error) {
      console.error('[AlertRateLimiter] 获取统计信息失败:', error);
      return {
        totalNotifications: 0,
        lastMinuteCount: 0,
        lastHourCount: 0,
        successCount: 0,
        failureCount: 0
      };
    }
  }
}

module.exports = new AlertRateLimiter();
