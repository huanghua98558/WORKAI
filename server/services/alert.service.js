/**
 * 预警服务
 * 负责规则配置、告警触发、告警管理
 */

const config = require('../lib/config');
const worktoolService = require('./worktool.service');
const monitorService = require('./monitor.service');
const redisClient = require('../lib/redis');

class AlertService {
  constructor() {
    this.redisPromise = redisClient.getClient();
  }

  async getRedis() {
    return await this.redisPromise;
  }

  /**
   * 检查所有预警规则
   */
  async checkAllRules() {
    const rules = config.get('alert.rules') || [];
    const results = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      try {
        const triggered = await this.checkRule(rule);
        if (triggered) {
          await this.triggerAlert(rule);
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            status: 'triggered',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`检查预警规则失败 [${rule.id}]:`, error.message);
      }
    }

    return results;
  }

  /**
   * 检查单个规则
   */
  async checkRule(rule) {
    switch (rule.id) {
      case 'robot_offline':
        return await this.checkRobotOffline();
      
      case 'high_error_rate':
        return await this.checkHighErrorRate(rule);
      
      case 'spam_detected':
        return await this.checkSpamDetected();
      
      default:
        return false;
    }
  }

  /**
   * 检查机器人掉线
   */
  async checkRobotOffline() {
    try {
      const status = await worktoolService.getRobotStatus();
      const isOnline = status?.status === 'online';
      
      if (!isOnline) {
        console.warn('⚠️  机器人掉线检测');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('检查机器人状态失败:', error.message);
      return true; // 状态检查失败也视为掉线
    }
  }

  /**
   * 检查错误率过高
   */
  async checkHighErrorRate(rule) {
    const threshold = rule.threshold || 0.1; // 默认10%
    const window = rule.window || '5m'; // 默认5分钟窗口

    const today = new Date().toISOString().split('T')[0];
    const errorMetrics = await monitorService.getSystemMetrics('callback_error', today);
    const processedMetrics = await monitorService.getSystemMetrics('callback_processed', today);

    const now = Date.now();
    const windowMs = this.parseWindow(window);
    const cutoff = now - windowMs;

    const recentErrors = errorMetrics.filter(m => m.timestamp > cutoff).length;
    const recentProcessed = processedMetrics.filter(m => m.timestamp > cutoff).length;

    if (recentProcessed === 0) return false;

    const errorRate = recentErrors / recentProcessed;

    if (errorRate > threshold) {
      console.warn(`⚠️  错误率过高: ${(errorRate * 100).toFixed(2)}% > ${(threshold * 100).toFixed(2)}%`);
      return true;
    }

    return false;
  }

  /**
   * 检查垃圾信息
   */
  async checkSpamDetected() {
    const today = new Date().toISOString().split('T')[0];
    const spamIntents = await monitorService.getSystemMetrics('intent_spam', today);

    // 如果最近1小时内垃圾消息超过10条
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentSpam = spamIntents.filter(m => m.timestamp > oneHourAgo).length;

    if (recentSpam > 10) {
      console.warn(`⚠️  垃圾信息检测: 最近1小时 ${recentSpam} 条`);
      return true;
    }

    return false;
  }

  /**
   * 触发告警
   */
  async triggerAlert(rule, extraData = {}) {
    const alertId = `alert:${rule.id}:${Date.now()}`;
    
    const alertData = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      level: rule.level,
      timestamp: new Date().toISOString(),
      ...extraData
    };

    // 记录告警
    const redis = await this.getRedis();
    await redis.setex(alertId, 86400, JSON.stringify(alertData)); // 保存24小时

    // 执行告警动作
    for (const action of rule.actions) {
      await this.executeAlertAction(action, rule, alertData);
    }

    // 发布告警事件
    await redis.publish('alert:triggered', JSON.stringify(alertData));

    console.log(`🚨 告警触发: [${rule.level}] ${rule.name}`);
    
    return alertData;
  }

  /**
   * 执行告警动作
   */
  async executeAlertAction(action, rule, alertData) {
    switch (action) {
      case 'send_message':
        await this.sendAlertMessage(rule, alertData);
        break;
      
      case 'mark_human':
        await this.markSessionsAsHuman();
        break;
      
      case 'close_ai':
        await this.disableAI();
        break;
      
      default:
        console.warn(`未知的告警动作: ${action}`);
    }
  }

  /**
   * 发送告警消息
   */
  async sendAlertMessage(rule, alertData) {
    const targets = rule.targets || [];
    
    if (targets.length === 0) {
      console.warn('⚠️  告警目标未配置');
      return;
    }

    const message = `[${rule.level.toUpperCase()} 告警]
规则: ${rule.name}
时间: ${alertData.timestamp}
详情: ${JSON.stringify(alertData)}`;

    for (const target of targets) {
      try {
        await worktoolService.sendTextMessage(
          target.type,
          target.id,
          message
        );
      } catch (error) {
        console.error(`发送告警消息失败:`, error.message);
      }
    }
  }

  /**
   * 标记会话为人工接管
   */
  async markSessionsAsHuman() {
    const sessionService = require('./session.service');
    const activeSessions = await sessionService.getActiveSessions(100);
    
    for (const session of activeSessions) {
      if (session.status === 'auto') {
        await sessionService.takeOverByHuman(
          session.sessionId,
          'system_alert'
        );
      }
    }

    console.log(`已标记 ${activeSessions.length} 个会话为人工接管`);
  }

  /**
   * 禁用 AI（全局熔断）
   */
  async disableAI() {
    const redis = await this.getRedis();
    await redis.set('circuit_breaker:enabled', 'true');
    console.log('🧯 AI 已被全局禁用（熔断）');
  }

  /**
   * 获取告警历史
   */
  async getAlertHistory(limit = 50) {
    const pattern = 'alert:*';
    const redis = await this.getRedis();
    const keys = await redis.keys(pattern);
    
    const alerts = [];
    for (const key of keys.slice(-limit)) {
      const data = await redis.get(key);
      if (data) {
        alerts.push(JSON.parse(data));
      }
    }

    return alerts.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  /**
   * 获取告警统计
   */
  async getAlertStats(days = 7) {
    const pattern = 'alert:*';
    const redis = await this.getRedis();
    const keys = await redis.keys(pattern);
    
    const stats = {
      total: 0,
      byLevel: {
        critical: 0,
        warning: 0,
        info: 0
      },
      byRule: {},
      recent: []
    };

    const now = Date.now();
    const daysAgo = now - days * 24 * 3600000;

    for (const key of keys) {
      const data = await redis.get(key);
      if (!data) continue;

      const alert = JSON.parse(data);
      const alertTime = new Date(alert.timestamp).getTime();

      if (alertTime > daysAgo) {
        stats.total++;
        stats.byLevel[alert.level]++;
        
        if (!stats.byRule[alert.ruleId]) {
          stats.byRule[alert.ruleId] = {
            ruleName: alert.ruleName,
            count: 0
          };
        }
        stats.byRule[alert.ruleId].count++;

        if (stats.recent.length < 10) {
          stats.recent.push(alert);
        }
      }
    }

    return stats;
  }

  /**
   * 解析时间窗口
   */
  parseWindow(window) {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) return 300000; // 默认5分钟

    const value = parseInt(match[1]);
    const unit = match[2];

    const units = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000
    };

    return value * units[unit];
  }

  /**
   * 检查熔断状态
   */
  async isCircuitBreakerOpen() {
    const redis = await this.getRedis();
    console.log('[isCircuitBreakerOpen] redis:', typeof redis, typeof redis.get);
    const enabled = await redis.get('circuit_breaker:enabled');
    return enabled === 'true';
  }

  /**
   * 重置熔断器
   */
  async resetCircuitBreaker() {
    const redis = await this.getRedis();
    await redis.del('circuit_breaker:enabled');
    console.log('✅ 熔断器已重置');
  }
}

module.exports = new AlertService();
