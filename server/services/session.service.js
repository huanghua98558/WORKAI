/**
 * 会话管理服务
 * 负责会话状态、上下文、人工接管等
 */

const redisClient = require('../lib/redis');
const sessionMessageService = require('./session-message.service');
const { formatDate, generateRequestId } = require('../lib/utils');

class SessionService {
  constructor() {
    this.redis = null; // 延迟初始化
    this.sessionPrefix = 'session:';
    this.sessionTTL = 3600 * 24; // 24小时过期
    this.contextPrefix = 'context:';
  }

  // 获取 Redis 客户端（延迟初始化）
  async getRedis() {
    if (!this.redis) {
      this.redis = await redisClient.getClient();
    }
    return this.redis;
  }

  /**
   * 创建或获取会话
   */
  async getOrCreateSession(userId, groupId, userInfo = {}) {
    const redis = await this.getRedis();
    const sessionId = `${groupId}_${userId}`;
    const key = `${this.sessionPrefix}${sessionId}`;

    const existing = await redis.get(key);
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

    await redis.setex(key, this.sessionTTL, JSON.stringify(session));
    return session;
  }

  /**
   * 更新会话
   */
  async updateSession(sessionId, updates) {
    const redis = await this.getRedis();
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

    await redis.setex(key, this.sessionTTL, JSON.stringify(updated));
    return updated;
  }

  /**
   * 获取会话
   */
  async getSession(sessionId) {
    const redis = await this.getRedis();
    const key = `${this.sessionPrefix}${sessionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * 添加上下文
   */
  async addContext(sessionId, message) {
    const redis = await this.getRedis();
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
    console.log(`[会话服务] 开始人工接管: sessionId=${sessionId}, operator=${operator}`);
    let session = await this.getSession(sessionId);

    // 如果 Redis 中没有会话数据，从数据库中创建一个
    if (!session) {
      console.log(`[会话服务] Redis 中没有会话，从数据库查询: sessionId=${sessionId}`);
      const { getDb } = require('coze-coding-dev-sdk');
      const { sql } = require('drizzle-orm');
      const { sessionMessages } = require('../database/schema');
      const db = await getDb();

      // 查询该会话的最新信息
      const result = await db.execute(sql`
        SELECT DISTINCT ON (session_id)
          session_id as "sessionId",
          COALESCE(user_name, user_id) as "userName",
          COALESCE(group_name, group_id) as "groupName",
          robot_id as "robotId",
          robot_name as "robotName",
          created_at as "lastActiveTime",
          COUNT(*) OVER (PARTITION BY session_id) as "messageCount",
          SUM(CASE WHEN is_from_user = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "userMessages",
          SUM(CASE WHEN is_from_bot = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "aiReplyCount",
          SUM(CASE WHEN is_human = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "humanReplyCount",
          MAX(intent) OVER (PARTITION BY session_id) as "lastIntent"
        FROM session_messages
        WHERE session_id = ${sessionId}
        ORDER BY session_id, created_at DESC
        LIMIT 1
      `);

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        session = {
          sessionId: row.sessionId,
          userName: row.userName || '未知用户',
          groupName: row.groupName || '未知群组',
          robotId: row.robotId,
          robotName: row.robotName || '未知机器人',
          lastActiveTime: row.lastActiveTime,
          messageCount: parseInt(row.messageCount) || 0,
          userMessages: parseInt(row.userMessages) || 0,
          aiReplyCount: parseInt(row.aiReplyCount) || 0,
          humanReplyCount: parseInt(row.humanReplyCount) || 0,
          replyCount: (parseInt(row.aiReplyCount) || 0) + (parseInt(row.humanReplyCount) || 0),
          lastIntent: row.lastIntent,
          status: 'auto', // 默认为自动模式
          startTime: row.lastActiveTime,
          context: [] // 初始化空上下文
        };

        console.log(`[会话服务] 从数据库创建会话: sessionId=${sessionId}, status=${session.status}`);

        // 将会话保存到 Redis
        await redisClient.getClient().then(client => {
          const key = `${this.sessionPrefix}${sessionId}`;
          return client.setex(key, this.sessionTTL, JSON.stringify(session));
        });
      } else {
        console.log(`[会话服务] 数据库中也找不到会话: sessionId=${sessionId}`);
        throw new Error('会话不存在');
      }
    }

    if (session.status === 'human') {
      console.log(`[会话服务] 会话已经是人工模式: sessionId=${sessionId}`);
      // 填充机器人信息
      await this.enrichSessionWithRobotInfo(session);
      return session;
    }

    console.log(`[会话服务] 切换到人工模式: sessionId=${sessionId}`);
    const updated = await this.updateSession(sessionId, {
      status: 'human',
      humanOperator: operator,
      humanTakeoverTime: new Date().toISOString()
    });

    // 填充机器人信息
    await this.enrichSessionWithRobotInfo(updated);
    console.log(`[会话服务] 人工接管完成: sessionId=${sessionId}, newStatus=${updated.status}`);
    return updated;
  }

  /**
   * 切换回自动模式
   */
  async switchToAuto(sessionId) {
    console.log(`[会话服务] 开始切换到自动模式: sessionId=${sessionId}`);
    let session = await this.getSession(sessionId);

    // 如果 Redis 中没有会话数据，从数据库中创建一个
    if (!session) {
      console.log(`[会话服务] Redis 中没有会话，从数据库查询: sessionId=${sessionId}`);
      const { getDb } = require('coze-coding-dev-sdk');
      const { sql } = require('drizzle-orm');
      const { sessionMessages } = require('../database/schema');
      const db = await getDb();

      // 查询该会话的最新信息
      const result = await db.execute(sql`
        SELECT DISTINCT ON (session_id)
          session_id as "sessionId",
          COALESCE(user_name, user_id) as "userName",
          COALESCE(group_name, group_id) as "groupName",
          robot_id as "robotId",
          robot_name as "robotName",
          created_at as "lastActiveTime",
          COUNT(*) OVER (PARTITION BY session_id) as "messageCount",
          SUM(CASE WHEN is_from_user = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "userMessages",
          SUM(CASE WHEN is_from_bot = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "aiReplyCount",
          SUM(CASE WHEN is_human = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "humanReplyCount",
          MAX(intent) OVER (PARTITION BY session_id) as "lastIntent"
        FROM session_messages
        WHERE session_id = ${sessionId}
        ORDER BY session_id, created_at DESC
        LIMIT 1
      `);

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        session = {
          sessionId: row.sessionId,
          userName: row.userName || '未知用户',
          groupName: row.groupName || '未知群组',
          robotId: row.robotId,
          robotName: row.robotName || '未知机器人',
          lastActiveTime: row.lastActiveTime,
          messageCount: parseInt(row.messageCount) || 0,
          userMessages: parseInt(row.userMessages) || 0,
          aiReplyCount: parseInt(row.aiReplyCount) || 0,
          humanReplyCount: parseInt(row.humanReplyCount) || 0,
          replyCount: (parseInt(row.aiReplyCount) || 0) + (parseInt(row.humanReplyCount) || 0),
          lastIntent: row.lastIntent,
          status: 'auto', // 默认为自动模式
          startTime: row.lastActiveTime,
          context: [] // 初始化空上下文
        };

        console.log(`[会话服务] 从数据库创建会话: sessionId=${sessionId}, status=${session.status}`);

        // 将会话保存到 Redis
        await redisClient.getClient().then(client => {
          const key = `${this.sessionPrefix}${sessionId}`;
          return client.setex(key, this.sessionTTL, JSON.stringify(session));
        });
      } else {
        console.log(`[会话服务] 数据库中也找不到会话: sessionId=${sessionId}`);
        throw new Error('会话不存在');
      }
    }

    console.log(`[会话服务] 切换到自动模式: sessionId=${sessionId}`);
    const updated = await this.updateSession(sessionId, {
      status: 'auto',
      humanOperator: null
    });

    // 填充机器人信息
    await this.enrichSessionWithRobotInfo(updated);
    console.log(`[会话服务] 自动模式切换完成: sessionId=${sessionId}, newStatus=${updated.status}`);
    return updated;
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
    const redis = await this.getRedis();
    const pattern = `${this.sessionPrefix}*`;
    const keys = await redis.keys(pattern);
    
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
      const session = JSON.parse(await redis.get(key));
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
    const sessions = [];
    const oneHourAgo = new Date(Date.now() - 24 * 3600 * 1000); // 扩大到24小时

    // 1. 从 Redis 获取活跃会话
    try {
      const client = await redisClient.getClient();
      const pattern = `${this.sessionPrefix}*`;
      const keys = await client.keys(pattern);

      for (const key of keys) {
        const session = JSON.parse(await client.get(key));
        const lastActive = new Date(session.lastActiveTime);

        if (lastActive > oneHourAgo) {
          // 从数据库查询最新的机器人信息
          await this.enrichSessionWithRobotInfo(session);
          sessions.push(session);
        }
      }
    } catch (error) {
      console.error('[会话服务] 从 Redis 获取会话失败:', error);
    }

    // 2. 从数据库查询会话（主要查询逻辑）
    try {
      const { getDb } = require('coze-coding-dev-sdk');
      const { sql } = require('drizzle-orm');
      const { sessionMessages } = require('../database/schema');
      const db = await getDb();

      // 使用 DISTINCT ON 查询每个会话的最新消息
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      const result = await db.execute(sql`
        SELECT DISTINCT ON (session_id)
          session_id as "sessionId",
          COALESCE(user_name, user_id) as "userName",
          COALESCE(group_name, group_id) as "groupName",
          robot_id as "robotId",
          robot_name as "robotName",
          created_at as "lastActiveTime",
          COUNT(*) OVER (PARTITION BY session_id) as "messageCount",
          SUM(CASE WHEN is_from_user = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "userMessages",
          SUM(CASE WHEN is_from_bot = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "aiReplyCount",
          SUM(CASE WHEN is_human = true THEN 1 ELSE 0 END) OVER (PARTITION BY session_id) as "humanReplyCount",
          MAX(intent) OVER (PARTITION BY session_id) as "lastIntent"
        FROM session_messages
        WHERE created_at > ${sevenDaysAgo.toISOString()}
        ORDER BY session_id, created_at DESC
        LIMIT ${limit}
      `);

      if (result.rows && result.rows.length > 0) {
        console.log(`[会话服务] 从数据库查询到 ${result.rows.length} 个会话`);
        
        for (const row of result.rows) {
          const session = {
            sessionId: row.sessionId,
            userName: row.userName || '未知用户',
            groupName: row.groupName || '未知群组',
            robotId: row.robotId,
            robotName: row.robotName || '未知机器人',
            lastActiveTime: row.lastActiveTime,
            messageCount: parseInt(row.messageCount),
            userMessages: parseInt(row.userMessages),
            aiReplyCount: parseInt(row.aiReplyCount),
            humanReplyCount: parseInt(row.humanReplyCount),
            replyCount: parseInt(row.aiReplyCount) + parseInt(row.humanReplyCount),
            lastIntent: row.lastIntent,
            status: 'auto', // 数据库中的会话默认为自动模式
            startTime: row.lastActiveTime // 使用最后消息时间作为开始时间
          };

          // 尝试从数据库获取更准确的机器人信息
          await this.enrichSessionWithRobotInfo(session);

          sessions.push(session);
        }
      } else {
        console.log('[会话服务] 数据库中没有查询到会话数据');
      }
    } catch (error) {
      console.error('[会话服务] 从数据库获取会话失败:', error);
      console.error('[会话服务] 错误堆栈:', error.stack);
    }

    console.log(`[会话服务] 总共返回 ${sessions.length} 个会话`);
    
    return sessions.sort((a, b) => 
      new Date(b.lastActiveTime) - new Date(a.lastActiveTime)
    );
  }

  /**
   * 用数据库中的机器人信息丰富会话数据
   */
  async enrichSessionWithRobotInfo(session) {
    try {
      const { getDb } = require('coze-coding-dev-sdk');
      const { sql } = require('drizzle-orm');
      const { sessionMessages } = require('../database/schema');
      const db = await getDb();

      // 查询该会话最近的机器人消息，获取 robotId 和 robotName
      // 使用 OR 条件来查询有 robotId 或 robotName 的消息
      const robotMessage = await db.execute(sql`
        SELECT robot_id as "robotId", robot_name as "robotName"
        FROM session_messages
        WHERE session_id = ${session.sessionId}
          AND (robot_id IS NOT NULL OR robot_name IS NOT NULL)
          AND (robot_name != '' AND robot_name IS NOT NULL)
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (robotMessage.rows && robotMessage.rows.length > 0) {
        session.robotId = robotMessage.rows[0].robotId;
        session.robotName = robotMessage.rows[0].robotName;
        console.log(`[会话服务] 会话 ${session.sessionId} 机器人信息: robotId=${session.robotId}, robotName=${session.robotName}`);
      } else {
        console.warn(`[会话服务] 会话 ${session.sessionId} 未找到机器人信息`);
      }

      // 填充用户信息
      if (!session.userName && session.userInfo?.userName) {
        session.userName = session.userInfo.userName;
      }
      if (!session.groupName && session.userInfo?.groupName) {
        session.groupName = session.userInfo.groupName;
      }
    } catch (error) {
      console.error(`[会话服务] 获取会话 ${session.sessionId} 机器人信息失败:`, error);
    }
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

  /**
   * 获取会话消息记录
   */
  async getSessionMessages(sessionId) {
    // 从数据库查询消息记录
    const messages = await sessionMessageService.getSessionMessages(sessionId);

    // 如果数据库没有消息，回退到从 Redis context 中获取（兼容旧数据）
    if (messages.length === 0) {
      const session = await this.getSession(sessionId);
      if (session && session.context && session.context.length > 0) {
        console.log(`[会话服务] 数据库无消息，从 Redis context 获取 ${session.context.length} 条消息`);
        return session.context.map((ctx, index) => ({
          id: `${sessionId}_msg_${index}`,
          content: ctx.content,
          isFromUser: ctx.role === 'user',
          isFromBot: ctx.role === 'assistant',
          isHuman: false,
          timestamp: ctx.timestamp,
          intent: session.lastIntent || null
        }));
      }
    }

    return messages;
  }
}

module.exports = new SessionService();
