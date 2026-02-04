/**
 * 告警配置服务
 * 管理意图配置、告警规则和通知方式配置
 */

const { getDb } = require('coze-coding-dev-sdk');
const { intentConfigs, alertRules, notificationMethods } = require('../database/schema');
const { sql } = require('drizzle-orm');

class AlertConfigService {
  /**
   * 获取所有启用的意图配置
   */
  async getEnabledIntentConfigs() {
    const db = await getDb();

    const configs = await db
      .select()
      .from(intentConfigs)
      .where(sql`${intentConfigs.isEnabled} = true`)
      .orderBy(intentConfigs.intentType);

    return configs;
  }

  /**
   * 根据意图类型获取配置
   */
  async getIntentConfigByType(intentType) {
    const db = await getDb();

    const config = await db
      .select()
      .from(intentConfigs)
      .where(sql`${intentConfigs.intentType} = ${intentType}`)
      .limit(1);

    return config[0] || null;
  }

  /**
   * 获取所有意图配置
   */
  async getAllIntentConfigs() {
    const db = await getDb();

    const configs = await db
      .select()
      .from(intentConfigs)
      .orderBy(intentConfigs.intentType);

    return configs;
  }

  /**
   * 创建或更新意图配置
   */
  async upsertIntentConfig(config) {
    const db = await getDb();

    const existing = await this.getIntentConfigByType(config.intentType);

    if (existing) {
      // 更新
      const result = await db
        .update(intentConfigs)
        .set({
          ...config,
          updatedAt: new Date(),
        })
        .where(sql`${intentConfigs.intentType} = ${config.intentType}`)
        .returning();

      console.log(`[告警配置] 更新意图配置: ${config.intentType}`);
      return result[0];
    } else {
      // 创建
      const result = await db
        .insert(intentConfigs)
        .values({
          ...config,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log(`[告警配置] 创建意图配置: ${config.intentType}`);
      return result[0];
    }
  }

  /**
   * 获取意图类型对应的告警规则
   */
  async getAlertRuleByIntent(intentType) {
    const db = await getDb();

    const rule = await db
      .select()
      .from(alertRules)
      .where(
        sql`${alertRules.intentType} = ${intentType} AND ${alertRules.isEnabled} = true`
      )
      .limit(1);

    return rule[0] || null;
  }

  /**
   * 获取所有告警规则
   */
  async getAllAlertRules() {
    const db = await getDb();

    const rules = await db
      .select()
      .from(alertRules)
      .orderBy(alertRules.alertLevel, alertRules.intentType);

    return rules;
  }

  /**
   * 创建或更新告警规则
   */
  async upsertAlertRule(rule) {
    const db = await getDb();

    const existing = await this.getAlertRuleByIntent(rule.intentType);

    if (existing) {
      // 更新
      const result = await db
        .update(alertRules)
        .set({
          ...rule,
          updatedAt: new Date(),
        })
        .where(sql`${alertRules.intentType} = ${rule.intentType}`)
        .returning();

      console.log(`[告警配置] 更新告警规则: ${rule.intentType}`);
      return result[0];
    } else {
      // 创建
      const result = await db
        .insert(alertRules)
        .values({
          ...rule,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log(`[告警配置] 创建告警规则: ${rule.intentType}`);
      return result[0];
    }
  }

  /**
   * 获取告警规则的通知方式
   */
  async getNotificationMethods(alertRuleId) {
    const db = await getDb();

    const methods = await db
      .select()
      .from(notificationMethods)
      .where(
        sql`${notificationMethods.alertRuleId} = ${alertRuleId} AND ${notificationMethods.isEnabled} = true`
      )
      .orderBy(notificationMethods.priority);

    return methods;
  }

  /**
   * 添加通知方式
   */
  async addNotificationMethod(method) {
    const db = await getDb();

    const result = await db
      .insert(notificationMethods)
      .values({
        ...method,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`[告警配置] 添加通知方式: ${method.methodType} for rule ${method.alertRuleId}`);
    return result[0];
  }

  /**
   * 更新通知方式
   */
  async updateNotificationMethod(id, updates) {
    const db = await getDb();

    const result = await db
      .update(notificationMethods)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(sql`${notificationMethods.id} = ${id}`)
      .returning();

    console.log(`[告警配置] 更新通知方式: ${id}`);
    return result[0];
  }

  /**
   * 删除通知方式
   */
  async deleteNotificationMethod(id) {
    const db = await getDb();

    const result = await db
      .delete(notificationMethods)
      .where(sql`${notificationMethods.id} = ${id}`)
      .returning();

    console.log(`[告警配置] 删除通知方式: ${id}`);
    return result[0];
  }

  /**
   * 通过 ID 删除告警规则
   */
  async deleteAlertRuleById(ruleId) {
    const db = await getDb();

    const result = await db
      .delete(alertRules)
      .where(sql`${alertRules.id} = ${ruleId}`)
      .returning();

    if (result.length > 0) {
      console.log(`[告警配置] 删除告警规则: ${ruleId}`);
    }
    
    return result[0] || null;
  }

  /**
   * 通过 ID 更新告警规则
   */
  async updateAlertRuleById(ruleId, updates) {
    const db = await getDb();

    const result = await db
      .update(alertRules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(sql`${alertRules.id} = ${ruleId}`)
      .returning();

    if (result.length > 0) {
      console.log(`[告警配置] 更新告警规则: ${ruleId}`);
    }
    
    return result[0] || null;
  }

  /**
   * 获取完整的告警配置（包含通知方式）
   */
  async getCompleteAlertConfig(intentType) {
    const rule = await this.getAlertRuleByIntent(intentType);

    if (!rule) {
      return null;
    }

    const notificationMethods = await this.getNotificationMethods(rule.id);

    return {
      ...rule,
      notificationMethods,
    };
  }
}

module.exports = new AlertConfigService();
