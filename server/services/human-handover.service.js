/**
 * 人工转接服务
 * 负责风险转人工、人工坐席分配、通知等功能
 */

const sessionService = require('./session.service');
const worktoolService = require('./worktool.service');
const config = require('../lib/config');
const redisClient = require('../lib/redis');

class HumanHandoverService {
  constructor() {
    this.redis = redisClient.getClient();
  }

  /**
   * 风险内容转人工
   */
  async handoverRiskContent(session, reason, context = {}) {
    const handoverConfig = config.get('humanHandover');
    
    if (!handoverConfig?.enabled) {
      console.log('人工转接功能未启用');
      return { action: 'none', reason: '人工转接功能未启用' };
    }

    // 标记会话为风险状态
    await sessionService.markAsRisky(session.sessionId, reason);

    // 选择人工坐席
    const agent = await this.selectAgent(handoverConfig, context);

    if (!agent) {
      console.warn('没有可用的人工坐席');
      await this.notifyNoAgentAvailable(session, context);
      return {
        action: 'none',
        reason: '没有可用的人工坐席',
        sessionStatus: 'human'
      };
    }

    // 分配坐席
    await this.assignAgent(session, agent);

    // 通知用户
    await this.notifyUser(session, handoverConfig.notificationMessage);

    // 通知坐席
    await this.notifyAgent(session, agent, reason, context);

    console.log(`✅ 会话 ${session.sessionId} 已转人工: ${agent.name}`);

    return {
      action: 'takeover_human',
      reason: `风险内容转人工: ${reason}`,
      agentId: agent.id,
      agentName: agent.name,
      sessionStatus: 'human'
    };
  }

  /**
   * 选择人工坐席
   */
  async selectAgent(handoverConfig, context) {
    const agents = handoverConfig.agents || [];
    const availableAgents = agents.filter(a => 
      a.status === 'online' && 
      (!context.intent || a.specialties?.includes(context.intent))
    );

    if (availableAgents.length === 0) {
      return null;
    }

    const strategy = handoverConfig.handoverStrategy || 'round_robin';

    switch (strategy) {
      case 'round_robin':
        return await this.roundRobinSelect(availableAgents);
      
      case 'priority':
        return this.prioritySelect(availableAgents);
      
      case 'load_balance':
        return await this.loadBalanceSelect(availableAgents);
      
      default:
        return availableAgents[0];
    }
  }

  /**
   * 轮询选择
   */
  async roundRobinSelect(agents) {
    const key = 'handover:round_robin:index';
    let currentIndex = parseInt(await this.redis.get(key) || '0');
    currentIndex = currentIndex % agents.length;
    await this.redis.set(key, currentIndex + 1);
    return agents[currentIndex];
  }

  /**
   * 优先级选择
   */
  prioritySelect(agents) {
    return agents.sort((a, b) => (a.priority || 0) - (b.priority || 0))[0];
  }

  /**
   * 负载均衡选择
   */
  async loadBalanceSelect(agents) {
    const agentLoads = {};
    
    for (const agent of agents) {
      const activeSessionsKey = `handover:agent:${agent.id}:active_sessions`;
      const count = await this.redis.scard(activeSessionsKey);
      agentLoads[agent.id] = count;
    }

    return agents.sort((a, b) => agentLoads[a.id] - agentLoads[b.id])[0];
  }

  /**
   * 分配坐席给会话
   */
  async assignAgent(session, agent) {
    await sessionService.updateSession(session.sessionId, {
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      assignedAgentTime: new Date().toISOString()
    });

    // 记录坐席活跃会话
    const activeSessionsKey = `handover:agent:${agent.id}:active_sessions`;
    await this.redis.sadd(activeSessionsKey, session.sessionId);
    await this.redis.expire(activeSessionsKey, 3600); // 1小时过期
  }

  /**
   * 通知用户
   */
  async notifyUser(session, message) {
    try {
      await worktoolService.sendTextMessage('group', session.groupId, message);
    } catch (error) {
      console.error('通知用户失败:', error.message);
    }
  }

  /**
   * 通知坐席
   */
  async notifyAgent(session, agent, reason, context) {
    const message = `[人工转接通知]
用户: ${session.userInfo?.userName || session.userId}
群组: ${session.userInfo?.groupName || session.groupId}
原因: ${reason}
时间: ${new Date().toLocaleString('zh-CN')}
消息内容: ${context.message?.content || '无'}`;

    try {
      await worktoolService.sendTextMessage(agent.type, agent.userId, message);
    } catch (error) {
      console.error('通知坐席失败:', error.message);
    }
  }

  /**
   * 没有可用坐席时的通知
   */
  async notifyNoAgentAvailable(session, context) {
    const message = '暂时没有可用的人工坐席，请稍后再试或使用其他联系方式。';
    await this.notifyUser(session, message);
  }

  /**
   * 释放坐席（会话结束）
   */
  async releaseAgent(session) {
    if (!session.assignedAgentId) return;

    const activeSessionsKey = `handover:agent:${session.assignedAgentId}:active_sessions`;
    await this.redis.srem(activeSessionsKey, session.sessionId);
  }

  /**
   * 获取坐席状态
   */
  async getAgentStats(agentId) {
    const activeSessionsKey = `handover:agent:${agentId}:active_sessions`;
    const activeSessions = await this.redis.smembers(activeSessionsKey);
    
    return {
      agentId,
      activeSessionCount: activeSessions.length,
      activeSessions
    };
  }

  /**
   * 获取所有坐席统计
   */
  async getAllAgentsStats() {
    const handoverConfig = config.get('humanHandover');
    const agents = handoverConfig?.agents || [];
    
    const stats = [];
    for (const agent of agents) {
      const agentStats = await this.getAgentStats(agent.id);
      stats.push({
        ...agent,
        ...agentStats
      });
    }

    return stats;
  }
}

module.exports = new HumanHandoverService();
