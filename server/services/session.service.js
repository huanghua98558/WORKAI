/**
 * 会话管理服务
 * 负责会话状态、上下文、人工接管等
 */

const redisClient = require('../lib/redis');
const { formatDate, generateRequestId } = require('../lib/utils');

class SessionService {
  constructor() {
    this.redis = redisClient.getClient();
    this.sessionPrefix = 'session:';
    this.sessionTTL = 3600 * 24; // 24小时过期
    this.contextPrefix = 'context:';
  }

  /**
   * 创建或获取会话
   */
  async getOrCreateSession(userId, groupId, userInfo = {}) {
    const sessionId = `${groupId}_${userId}`;
    const key = `${this.sessionPrefix}${sessionId}`;

    const existing = await this.redis.get(key);
    if (existing) {
      return JSON.parse(existing);
    }

    const session = {
      sessionId,
      userId,
      groupId,
      userInfo,
      startTime: new Date().toISOString(),
      lastActiveTime: new Date().toISOString(),
      messageCount: 0,
      replyCount: 0,
      aiReplyCount: 0,
      humanReplyCount: 0,
      status: 'auto', // auto | human | closed
      context: [],
      tags: []
    };

    await this.redis.setex(key, this.sessionTTL, JSON.stringify(session));
    return session;
  }

  /**
   * 更新会话
   */
  async updateSession(sessionId, updates) {
    const key = `${this.sessionPrefix}${sessionId}`;
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const updated = {
      ...session,
      ...updates,
      lastActiveTime: new Date().toISOString()
    };

    await this.redis.setex(key, this.sessionTTL, JSON.stringify(updated));
    return updated;
  }

  /**
   * 获取会话
   */
  async getSession(sessionId) {
    const key = `${this.sessionPrefix}${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * 添加上下文
   */
  async addContext(sessionId, message) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.context.push({
      role: message.from_type === 'robot' ? 'assistant' : 'user',
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString()
    });

    // 只保留最近 10 条上下文
    if (session.context.length > 10) {
      session.context = session.context.slice(-10);
    }

    return await this.updateSession(sessionId, {
      context: session.context,
      messageCount: session.messageCount + 1
    });
  }

  /**
   * 人工接管
   */
  async takeOverByHuman(sessionId, operator) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    if (session.status === 'human') {
      return session;
    }

    return await this.updateSession(sessionId, {
      status: 'human',
      humanOperator: operator,
      humanTakeoverTime: new Date().toISOString()
    });
  }

  /**
   * 切换回自动模式
   */
  async switchToAuto(sessionId) {
    return await this.updateSession(sessionId, {
      status: 'auto',
      humanOperator: null
    });
  }

  /**
   * 标记为风险会话
   */
  async markAsRisky(sessionId, reason = '') {
    return await this.updateSession(sessionId, {
      status: 'human',
      isRisky: true,
      riskReason: reason
    });
  }

  /**
   * 获取今日会话统计
   */
  async getTodayStats() {
    const pattern = `${this.sessionPrefix}*`;
    // 确保客户端是最新的
    const client = await redisClient.getClient();
    const keys = await client.keys(pattern);
    
    let stats = {
      totalSessions: 0,
      autoSessions: 0,
      humanSessions: 0,
      riskySessions: 0,
      totalMessages: 0,
      aiReplies: 0,
      humanReplies: 0,
      avgMessagesPerSession: 0
    };

    const today = formatDate();

    for (const key of keys) {
      const session = JSON.parse(await this.redis.get(key));
      const sessionDate = formatDate(session.startTime);
      
      if (sessionDate === today) {
        stats.totalSessions++;
        
        if (session.status === 'auto') {
          stats.autoSessions++;
        } else if (session.status === 'human') {
          stats.humanSessions++;
        }
        
        if (session.isRisky) {
          stats.riskySessions++;
        }
        
        stats.totalMessages += session.messageCount;
        stats.aiReplies += session.aiReplyCount;
        stats.humanReplies += session.humanReplyCount;
      }
    }

    if (stats.totalSessions > 0) {
      stats.avgMessagesPerSession = (
        stats.totalMessages / stats.totalSessions
      ).toFixed(2);
    }

    return stats;
  }

  /**
   * 获取活跃会话
   */
  async getActiveSessions(limit = 100) {
    const pattern = `${this.sessionPrefix}*`;
    // 确保客户端是最新的
    const client = await redisClient.getClient();
    const keys = await client.keys(pattern);
    
    const sessions = [];
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);

    for (const key of keys.slice(0, limit)) {
      const session = JSON.parse(await this.redis.get(key));
      const lastActive = new Date(session.lastActiveTime);
      
      if (lastActive > oneHourAgo) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => 
      new Date(b.lastActiveTime) - new Date(a.lastActiveTime)
    );
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId) {
    const key = `${this.sessionPrefix}${sessionId}`;
    await this.redis.del(key);
  }

  /**
   * 批量清理过期会话
   */
  async cleanupExpiredSessions() {
    // Redis 会自动清理过期键，这里只是统计
    const pattern = `${this.sessionPrefix}*`;
    // 确保客户端是最新的
    const client = await redisClient.getClient();
    const keys = await client.keys(pattern);
    return keys.length;
  }
}

module.exports = new SessionService();
