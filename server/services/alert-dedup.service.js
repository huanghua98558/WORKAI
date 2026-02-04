/**
 * 告警去重服务
 * 防止相同的告警在短时间内重复触发
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { alertDedupRecords, alertRules } = require('../database/schema');
const { eq, and, gte, desc } = require('drizzle-orm');
const logger = require('./system-logger.service');

class AlertDedupService {
  constructor() {
    this.cache = new Map(); // 内存缓存，加速查询
    this.CACHE_TTL = 300000; // 缓存5分钟
  }

  /**
   * 检查是否为重复告警
   * @param {string} ruleId - 规则ID
   * @param {string} robotId - 机器人ID
   * @param {string} recipientId - 接收者ID
   * @param {string} alertType - 告警类型
   * @returns {Promise<Object>} { isDuplicate, dedupRecord }
   */
  async checkDuplicate(ruleId, robotId, recipientId, alertType) {
    try {
      // 生成去重key
      const dedupKey = this.generateDedupKey(ruleId, robotId, recipientId, alertType);

      // 先检查内存缓存
      const cached = this.cache.get(dedupKey);
      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
        return { isDuplicate: cached.isDuplicate, dedupRecord: cached.dedupRecord };
      }

      // 查询数据库
      const db = await getDb();
      const [record] = await db.select()
        .from(alertDedupRecords)
        .where(eq(alertDedupRecords.dedupKey, dedupKey))
        .limit(1);

      if (!record) {
        // 没有记录，不是重复
        return { isDuplicate: false, dedupRecord: null };
      }

      // 检查是否在冷却期内
      const now = new Date();
      const lastTriggerTime = new Date(record.lastTriggerTime);
      const elapsedSeconds = (now - lastTriggerTime) / 1000;
      const cooldownPeriod = record.cooldownPeriod || 300; // 默认5分钟

      const isDuplicate = elapsedSeconds < cooldownPeriod;

      // 缓存结果
      this.cache.set(dedupKey, {
        isDuplicate,
        dedupRecord: record,
        timestamp: Date.now()
      });

      return { isDuplicate, dedupRecord: record };
    } catch (error) {
      console.error('[AlertDedupService] 检查重复告警失败:', error);
      logger.error('AlertDedupService', '检查重复告警失败', {
        ruleId,
        robotId,
        recipientId,
        alertType,
        error: error.message
      });
      // 发生错误时，默认允许发送（避免误杀）
      return { isDuplicate: false, dedupRecord: null };
    }
  }

  /**
   * 记录告警触发
   * @param {string} ruleId - 规则ID
   * @param {string} robotId - 机器人ID
   * @param {string} recipientId - 接收者ID
   * @param {string} alertType - 告警类型
   * @param {number} cooldownPeriod - 冷却期（秒）
   * @returns {Promise<Object>} 创建的去重记录
   */
  async recordTrigger(ruleId, robotId, recipientId, alertType, cooldownPeriod = 300) {
    try {
      const dedupKey = this.generateDedupKey(ruleId, robotId, recipientId, alertType);
      const now = new Date();

      const db = await getDb();

      // 查询是否已存在记录
      const [existing] = await db.select()
        .from(alertDedupRecords)
        .where(eq(alertDedupRecords.dedupKey, dedupKey))
        .limit(1);

      if (existing) {
        // 更新现有记录
        const [updated] = await db.update(alertDedupRecords)
          .set({
            lastTriggerTime: now,
            triggerCount: sql`${alertDedupRecords.triggerCount} + 1`,
            status: 'active',
            updatedAt: now
          })
          .where(eq(alertDedupRecords.id, existing.id))
          .returning();

        // 更新缓存
        this.cache.set(dedupKey, {
          isDuplicate: true,
          dedupRecord: updated,
          timestamp: Date.now()
        });

        return updated;
      } else {
        // 创建新记录
        const [created] = await db.insert(alertDedupRecords)
          .values({
            dedupKey,
            ruleId,
            robotId,
            recipientId,
            alertType,
            firstTriggerTime: now,
            lastTriggerTime: now,
            triggerCount: 1,
            cooldownPeriod,
            status: 'active',
            createdAt: now,
            updatedAt: now
          })
          .returning();

        // 缓存结果
        this.cache.set(dedupKey, {
          isDuplicate: false,
          dedupRecord: created,
          timestamp: Date.now()
        });

        return created;
      }
    } catch (error) {
      console.error('[AlertDedupService] 记录告警触发失败:', error);
      logger.error('AlertDedupService', '记录告警触发失败', {
        ruleId,
        robotId,
        recipientId,
        alertType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 清理过期的去重记录
   */
  async cleanExpiredRecords() {
    try {
      const db = await getDb();

      // 删除超过冷却期2倍的记录
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const deleted = await db.delete(alertDedupRecords)
        .where(
          sql`${alertDedupRecords.lastTriggerTime} < ${twoHoursAgo}`
        );

      // 清理内存缓存
      for (const [key, value] of this.cache.entries()) {
        if (Date.now() - value.timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }

      console.log(`[AlertDedupService] 清理了过期的去重记录`);
      return deleted;
    } catch (error) {
      console.error('[AlertDedupService] 清理过期记录失败:', error);
      logger.error('AlertDedupService', '清理过期记录失败', {
        error: error.message
      });
    }
  }

  /**
   * 生成去重key
   */
  generateDedupKey(ruleId, robotId, recipientId, alertType) {
    return `${ruleId}_${robotId}_${recipientId}_${alertType}`;
  }

  /**
   * 获取去重统计信息
   */
  async getStats() {
    try {
      const db = await getDb();

      const stats = await db.select({
        totalCount: sql<number>`count(*)`,
        activeCount: sql<number>`count(*) FILTER (WHERE status = 'active')`,
        avgTriggerCount: sql<number>`avg(trigger_count)`
      })
        .from(alertDedupRecords);

      return stats[0] || {
        totalCount: 0,
        activeCount: 0,
        avgTriggerCount: 0
      };
    } catch (error) {
      console.error('[AlertDedupService] 获取统计信息失败:', error);
      return {
        totalCount: 0,
        activeCount: 0,
        avgTriggerCount: 0
      };
    }
  }
}

module.exports = new AlertDedupService();
