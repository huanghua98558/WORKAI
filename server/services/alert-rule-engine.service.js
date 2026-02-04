/**
 * 告警规则引擎服务
 * 负责加载告警规则、匹配规则和触发告警
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { alertRules, robots } = require('../database/schema');
const { eq, and, or, gte, lte, desc, isNotNull } = require('drizzle-orm');
const logger = require('./system-logger.service');

class AlertRuleEngine {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.CHECK_INTERVAL_MS = 60000; // 1分钟检查一次
  }

  /**
   * 启动规则引擎
   */
  start() {
    if (this.isRunning) {
      console.log('[AlertRuleEngine] 规则引擎已在运行');
      return;
    }

    console.log('[AlertRuleEngine] 启动规则引擎');
    this.isRunning = true;

    // 立即执行一次检查
    this.checkRules();

    // 定时检查
    this.checkInterval = setInterval(() => {
      this.checkRules();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * 停止规则引擎
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[AlertRuleEngine] 停止规则引擎');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 检查所有启用的规则
   */
  async checkRules() {
    if (!this.isRunning) {
      return;
    }

    try {
      console.log('[AlertRuleEngine] 开始检查规则');
      const startTime = Date.now();

      const db = await getDb();

      // 获取所有启用的规则
      const rules = await db.select()
        .from(alertRules)
        .where(eq(alertRules.isEnabled, true));

      console.log(`[AlertRuleEngine] 找到 ${rules.length} 个启用的规则`);

      // 检查每个规则
      for (const rule of rules) {
        try {
          await this.checkRule(rule);
        } catch (error) {
          console.error(`[AlertRuleEngine] 检查规则失败 (ruleId: ${rule.id}):`, error);
          logger.error('AlertRuleEngine', '检查规则失败', {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[AlertRuleEngine] 规则检查完成，耗时 ${duration}ms`);

      logger.info('AlertRuleEngine', '规则检查完成', {
        ruleCount: rules.length,
        duration
      });
    } catch (error) {
      console.error('[AlertRuleEngine] 检查规则失败:', error);
      logger.error('AlertRuleEngine', '规则检查失败', {
        error: error.message
      });
    }
  }

  /**
   * 检查单个规则
   */
  async checkRule(rule) {
    console.log(`[AlertRuleEngine] 检查规则: ${rule.ruleName} (intentType: ${rule.intentType})`);

    // 根据规则类型检查不同的指标
    switch (rule.intentType) {
      case 'robot_status':
        await this.checkRobotStatusRule(rule);
        break;
      case 'execution_failure':
        await this.checkExecutionFailureRule(rule);
        break;
      case 'robot_health':
        await this.checkRobotHealthRule(rule);
        break;
      case 'ai_error':
        await this.checkAiErrorRule(rule);
        break;
      default:
        console.log(`[AlertRuleEngine] 未知规则类型: ${rule.intentType}`);
    }
  }

  /**
   * 检查机器人状态规则
   */
  async checkRobotStatusRule(rule) {
    const db = await getDb();

    // 获取所有离线的机器人
    const offlineRobots = await db.select()
      .from(robots)
      .where(
        and(
          eq(robots.isActive, true),
          eq(robots.status, 'offline'),
          isNotNull(robots.lastCheckAt)
        )
      );

    console.log(`[AlertRuleEngine] 找到 ${offlineRobots.length} 个离线机器人`);

    // 检查每个离线机器人
    for (const robot of offlineRobots) {
      // 检查是否超过阈值时间
      const now = new Date();
      const lastCheckTime = new Date(robot.lastCheckAt);
      const elapsedMinutes = (now - lastCheckTime) / (1000 * 60);

      if (elapsedMinutes >= rule.threshold) {
        // 触发告警
        await this.triggerAlert(rule, {
          type: '机器人离线告警',
          level: rule.alertLevel,
          robotId: robot.robotId,
          robotName: robot.name,
          description: `机器人已离线 ${Math.floor(elapsedMinutes)} 分钟`,
          metadata: {
            elapsedMinutes,
            lastCheckTime: robot.lastCheckAt
          }
        });
      }
    }
  }

  /**
   * 检查执行失败率规则
   */
  async checkExecutionFailureRule(rule) {
    // 查询执行追踪表，统计失败率
    // 这个需要根据实际的execution_tracking表来实现
    // 暂时跳过，等后续完善
    console.log('[AlertRuleEngine] 执行失败率规则检查 - 待实现');
  }

  /**
   * 检查机器人健康度规则
   */
  async checkRobotHealthRule(rule) {
    // 查询机器人健康度指标
    // 暂时跳过，等后续完善
    console.log('[AlertRuleEngine] 机器人健康度规则检查 - 待实现');
  }

  /**
   * 检查AI错误规则
   */
  async checkAiErrorRule(rule) {
    // 查询AI错误日志
    // 暂时跳过，等后续完善
    console.log('[AlertRuleEngine] AI错误规则检查 - 待实现');
  }

  /**
   * 触发告警
   */
  async triggerAlert(rule, alertData) {
    console.log(`[AlertRuleEngine] 触发告警: ${alertData.type} (${alertData.level})`);

    // 调用告警触发器服务
    const alertTriggerService = require('./alert-trigger-enhanced.service');
    
    try {
      await alertTriggerService.triggerAlert({
        ...alertData,
        ruleId: rule.id,
        ruleName: rule.ruleName,
        triggerTime: new Date().toISOString()
      });
    } catch (error) {
      console.error('[AlertRuleEngine] 触发告警失败:', error);
      logger.error('AlertRuleEngine', '触发告警失败', {
        ruleId: rule.id,
        alertType: alertData.type,
        error: error.message
      });
    }
  }

  /**
   * 手动触发规则检查（用于测试）
   */
  async checkRulesManual() {
    console.log('[AlertRuleEngine] 手动触发规则检查');
    await this.checkRules();
  }

  /**
   * 获取规则引擎状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL_MS,
      lastCheckTime: this.lastCheckTime
    };
  }
}

module.exports = new AlertRuleEngine();
