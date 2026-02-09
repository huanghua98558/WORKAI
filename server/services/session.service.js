/**
 * 会话管理服务
 * 管理用户会话和Token
 */

const { eq, and, sql } = require('drizzle-orm');
const { getDb } = require('coze-coding-dev-sdk');
const { userLoginSessions, users } = require('../database/schema');
const { getLogger } = require('../lib/logger');
const { verifyToken, generateTokenPair } = require('../lib/jwt');

class SessionService {
  constructor() {
    this.logger = getLogger('SESSION');
    this.MAX_CONCURRENT_SESSIONS = 5; // 最大并发会话数
    this.DEFAULT_SESSION_EXPIRY_DAYS = 7; // 默认会话过期天数
    this.REMEMBER_ME_SESSION_EXPIRY_DAYS = 30; // 记住我会话过期天数
  }

  /**
   * 创建会话
   * @param {Object} user - 用户信息
   * @param {Object} sessionData - 会话数据
   * @param {boolean} rememberMe - 是否记住登录
   * @returns {Promise<Object>} 会话信息和Token
   */
  async createSession(user, sessionData = {}, rememberMe = false) {
    const db = await getDb();
    const { v4: uuidv4 } = require('uuid');

    // 检查并强制执行会话并发限制
    await this.enforceSessionLimit(user.id);

    // 生成Token对（支持记住登录）
    this.logger.info('[createSession] rememberMe参数', { rememberMe, userId: user.id });
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: user.role
    }, { rememberMe });

    // 计算过期时间（记住登录则延长到30天）
    const now = new Date();
    const expiryDays = rememberMe ? this.REMEMBER_ME_SESSION_EXPIRY_DAYS : this.DEFAULT_SESSION_EXPIRY_DAYS;
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    this.logger.info('[createSession] 会话过期时间计算', {
      rememberMe,
      expiryDays,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString()
    });

    // 创建会话记录
    const session = {
      id: uuidv4(),
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ipAddress: sessionData.ip || null,
      userAgent: sessionData.userAgent || null,
      deviceType: sessionData.deviceType || 'unknown',
      location: sessionData.location || null,
      isActive: true,
      expiresAt: expiresAt,
      createdAt: now,
      lastActivityAt: now
    };

    this.logger.info('准备插入会话记录', {
      sessionId: session.id,
      userId: user.id,
      username: user.username,
      token: session.token.substring(0, 20) + '...',
      expiresAt: session.expiresAt
    });

    try {
      // 使用原始 pg 客户端插入，绕过 Drizzle ORM 的 .insert() 方法问题
      const pgClient = db.session.client;
      const result = await pgClient.query(
        `INSERT INTO user_login_sessions (id, user_id, token, refresh_token, ip_address, user_agent, device_type, location, is_active, expires_at, created_at, last_activity_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, user_id, token, refresh_token, ip_address, user_agent, device_type, location, is_active, expires_at, created_at, last_activity_at`,
        [
          session.id,
          session.userId,
          session.token,
          session.refreshToken,
          session.ipAddress,
          session.userAgent,
          session.deviceType,
          session.location,
          session.isActive,
          session.expiresAt,
          session.createdAt,
          session.lastActivityAt
        ]
      );

      const createdSession = result.rows[0];

      this.logger.info('创建会话成功', {
        sessionId: createdSession.id,
        userId: user.id,
        username: user.username,
        ip: session.ipAddress,
        device: session.deviceType
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive
        },
        session: {
          id: createdSession.id,
          expiresAt: expiresAt,
          deviceType: session.deviceType,
          ipAddress: session.ipAddress
        },
        ...tokens
      };
    } catch (error) {
      this.logger.error('创建会话失败', {
        error: error.message,
        stack: error.stack,
        userId: user.id,
        username: user.username,
        sessionId: session.id
      });
      throw error;
    }
  }

  /**
   * 验证会话
   * @param {string} token - 访问令牌
   * @returns {Promise<Object|null>} 会话信息，验证失败返回null
   */
  async verifySession(token) {
    try {
      // 验证Token
      const decoded = verifyToken(token);
      if (!decoded) {
        return null;
      }

      const db = await getDb();

      // 查询会话
      const [session] = await db
        .select()
        .from(userLoginSessions)
        .where(
          and(
            eq(userLoginSessions.token, token),
            eq(userLoginSessions.isActive, true)
          )
        );

      if (!session) {
        return null;
      }

      // 检查是否过期
      if (new Date() > new Date(session.expiresAt)) {
        // 标记会话为非活跃
        await db
          .update(userLoginSessions)
          .set({ isActive: false })
          .where(eq(userLoginSessions.id, session.id));

        this.logger.warn('会话已过期', { sessionId: session.id });
        return null;
      }

      // 获取用户信息
      const [user] = await db.select().from(users).where(eq(users.id, session.userId));
      if (!user || !user.isActive) {
        return null;
      }

      // 更新最后活跃时间
      await db
        .update(userLoginSessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(userLoginSessions.id, session.id));

      return {
        session,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive
        },
        decoded
      };
    } catch (error) {
      this.logger.error('验证会话失败', { error: error.message });
      return null;
    }
  }

  /**
   * 刷新Token
   * @param {string} refreshToken - 刷新令牌
   * @returns {Promise<Object|null>} 新的Token对，验证失败返回null
   */
  async refreshTokens(refreshToken) {
    try {
      const db = await getDb();

      // 查找刷新令牌对应的会话
      const [session] = await db
        .select()
        .from(userLoginSessions)
        .where(
          and(
            eq(userLoginSessions.refreshToken, refreshToken),
            eq(userLoginSessions.isActive, true)
          )
        );

      if (!session) {
        return null;
      }

      // 检查是否过期
      if (new Date() > new Date(session.expiresAt)) {
        await db
          .update(userLoginSessions)
          .set({ isActive: false })
          .where(eq(userLoginSessions.id, session.id));

        return null;
      }

      // 获取用户信息
      const [user] = await db.select().from(users).where(eq(users.id, session.userId));
      if (!user || !user.isActive) {
        return null;
      }

      // 生成新的Token对
      const newTokens = generateTokenPair({
        userId: user.id,
        username: user.username,
        role: user.role
      });

      // 更新会话
      await db
        .update(userLoginSessions)
        .set({
          token: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastActivityAt: new Date()
        })
        .where(eq(userLoginSessions.id, session.id));

      this.logger.info('刷新Token成功', { sessionId: session.id, userId: user.id });

      return {
        ...newTokens,
        expiresIn: this.getTokenExpiresIn()
      };
    } catch (error) {
      this.logger.error('刷新Token失败', { error: error.message });
      return null;
    }
  }

  /**
   * 销毁会话（登出）
   * @param {string} token - 访问令牌
   * @returns {Promise<boolean>} 是否成功
   */
  async destroySession(token) {
    try {
      const db = await getDb();

      const result = await db
        .update(userLoginSessions)
        .set({ isActive: false })
        .where(eq(userLoginSessions.token, token));

      const success = result.rowCount > 0;
      if (success) {
        this.logger.info('销毁会话成功', { token: token.substring(0, 20) + '...' });
      }

      return success;
    } catch (error) {
      this.logger.error('销毁会话失败', { error: error.message });
      return false;
    }
  }

  /**
   * 销毁用户的所有会话（强制登出）
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} 销毁的会话数量
   */
  async destroyAllSessions(userId) {
    try {
      const db = await getDb();

      const result = await db
        .update(userLoginSessions)
        .set({ isActive: false })
        .where(eq(userLoginSessions.userId, userId));

      this.logger.info('销毁所有会话成功', { userId, count: result.rowCount });
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('销毁所有会话失败', { error: error.message });
      return 0;
    }
  }

  /**
   * 获取用户的所有活跃会话
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 会话列表
   */
  async getUserSessions(userId) {
    try {
      const db = await getDb();

      const sessions = await db
        .select()
        .from(userLoginSessions)
        .where(
          and(
            eq(userLoginSessions.userId, userId),
            eq(userLoginSessions.isActive, true)
          )
        )
        .orderBy(userLoginSessions.lastActivityAt);

      // 清理过期的会话
      const now = new Date();
      for (const session of sessions) {
        if (new Date(session.expiresAt) < now) {
          await db
            .update(userLoginSessions)
            .set({ isActive: false })
            .where(eq(userLoginSessions.id, session.id));
        }
      }

      // 返回活跃会话
      return sessions.filter(s => new Date(s.expiresAt) > now);
    } catch (error) {
      this.logger.error('获取用户会话失败', { error: error.message });
      return [];
    }
  }

  /**
   * 清理过期会话
   * @returns {Promise<number>} 清理的会话数量
   */
  async cleanExpiredSessions() {
    try {
      const db = await getDb();

      const result = await db
        .update(userLoginSessions)
        .set({ isActive: false })
        .where(sql`${userLoginSessions.expiresAt} < NOW()`);

      this.logger.info('清理过期会话完成', { count: result.rowCount });
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('清理过期会话失败', { error: error.message });
      return 0;
    }
  }

  /**
   * 获取所有活跃会话（管理员功能）
   * @param {Object} options - 查询选项
   * @param {number} options.limit - 限制数量
   * @returns {Promise<Array>} 活跃会话列表
   */
  async getActiveSessions(options = {}) {
    try {
      const db = await getDb();
      const { limit = 50 } = options;

      const sessions = await db
        .select()
        .from(userLoginSessions)
        .where(eq(userLoginSessions.isActive, true))
        .orderBy(userLoginSessions.lastActivityAt)
        .limit(limit);

      // 清理过期的会话
      const now = new Date();
      for (const session of sessions) {
        if (new Date(session.expiresAt) < now) {
          await db
            .update(userLoginSessions)
            .set({ isActive: false })
            .where(eq(userLoginSessions.id, session.id));
        }
      }

      // 返回活跃会话
      return sessions.filter(s => new Date(s.expiresAt) > now);
    } catch (error) {
      this.logger.error('获取活跃会话失败', { error: error.message });
      return [];
    }
  }

  /**
   * 获取Token过期时间（秒）
   * @returns {number}
   */
  getTokenExpiresIn() {
    const expiresIn = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h';
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  /**
   * 强制执行会话并发限制
   * 如果用户活跃会话数超过限制，则销毁最早的会话
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} 被销毁的会话数量
   */
  async enforceSessionLimit(userId) {
    try {
      const activeSessions = await this.getUserSessions(userId);
      const currentCount = activeSessions.length;

      if (currentCount < this.MAX_CONCURRENT_SESSIONS) {
        return 0;
      }

      // 计算需要销毁的会话数量
      const sessionsToDestroy = currentCount - this.MAX_CONCURRENT_SESSIONS + 1;

      // 按 lastActivityAt 排序，销毁最早的会话
      const sortedSessions = [...activeSessions].sort((a, b) =>
        new Date(a.lastActivityAt) - new Date(b.lastActivityAt)
      );

      const sessionsToDestroyIds = sortedSessions.slice(0, sessionsToDestroy).map(s => s.id);
      let destroyedCount = 0;

      for (const sessionId of sessionsToDestroyIds) {
        const success = await this.destroySessionById(sessionId);
        if (success) {
          destroyedCount++;
        }
      }

      if (destroyedCount > 0) {
        this.logger.info('强制执行会话限制', {
          userId,
          destroyedCount,
          limit: this.MAX_CONCURRENT_SESSIONS
        });
      }

      return destroyedCount;
    } catch (error) {
      this.logger.error('强制执行会话限制失败', { error: error.message, userId });
      return 0;
    }
  }

  /**
   * 销毁其他设备的所有会话（保留当前会话）
   * @param {string} userId - 用户ID
   * @param {string} currentSessionId - 当前会话ID（不销毁）
   * @returns {Promise<number>} 被销毁的会话数量
   */
  async destroyOtherSessions(userId, currentSessionId) {
    try {
      const db = await getDb();

      const result = await db
        .update(userLoginSessions)
        .set({ isActive: false })
        .where(
          and(
            eq(userLoginSessions.userId, userId),
            sql`${userLoginSessions.id} != ${currentSessionId}`
          )
        );

      this.logger.info('销毁其他会话成功', {
        userId,
        currentSessionId,
        count: result.rowCount
      });

      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('销毁其他会话失败', { error: error.message });
      return 0;
    }
  }

  /**
   * 按ID销毁会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async destroySessionById(sessionId) {
    try {
      const db = await getDb();

      const result = await db
        .update(userLoginSessions)
        .set({ isActive: false })
        .where(eq(userLoginSessions.id, sessionId));

      const success = result.rowCount > 0;
      if (success) {
        this.logger.info('按ID销毁会话成功', { sessionId });
      }

      return success;
    } catch (error) {
      this.logger.error('按ID销毁会话失败', { error: error.message, sessionId });
      return false;
    }
  }

  /**
   * 获取会话统计信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 统计信息
   */
  async getSessionStats(userId) {
    try {
      const activeSessions = await this.getUserSessions(userId);

      // 按设备类型分组
      const deviceTypeStats = {};
      activeSessions.forEach(session => {
        const deviceType = session.deviceType || 'unknown';
        deviceTypeStats[deviceType] = (deviceTypeStats[deviceType] || 0) + 1;
      });

      // 检查是否有过期会话
      const now = new Date();
      const expiringSoon = activeSessions.filter(
        s => new Date(s.expiresAt) - now < 24 * 60 * 60 * 1000 // 24小时内过期
      ).length;

      return {
        totalSessions: activeSessions.length,
        maxAllowedSessions: this.MAX_CONCURRENT_SESSIONS,
        canCreateMore: activeSessions.length < this.MAX_CONCURRENT_SESSIONS,
        deviceTypeStats,
        expiringSoon,
        sessions: activeSessions.map(s => ({
          id: s.id,
          deviceType: s.deviceType,
          ipAddress: s.ipAddress,
          location: s.location,
          createdAt: s.createdAt,
          lastActivityAt: s.lastActivityAt,
          expiresAt: s.expiresAt,
          isCurrentSession: false // 由调用方设置
        }))
      };
    } catch (error) {
      this.logger.error('获取会话统计信息失败', { error: error.message });
      return {
        totalSessions: 0,
        maxAllowedSessions: this.MAX_CONCURRENT_SESSIONS,
        canCreateMore: true,
        deviceTypeStats: {},
        expiringSoon: 0,
        sessions: []
      };
    }
  }

  /**
   * 获取单个会话详情（用于会话管理功能）
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object|null>} 会话详情，如果不存在则返回null
   */
  async getSession(sessionId) {
    try {
      const db = await getDb();

      // 查询会话基本信息
      const result = await db.execute(
        sql`SELECT id, user_id, username, device_type, ip_address, location, created_at, last_activity_at, expires_at, is_active
           FROM user_login_sessions
           WHERE id = ${sessionId} AND is_active = true
           LIMIT 1`
      );

      if (result.rows && result.rows.length > 0) {
        const session = {
          id: result.rows[0].id,
          userId: result.rows[0].user_id,
          username: result.rows[0].username,
          deviceType: result.rows[0].device_type,
          ipAddress: result.rows[0].ip_address,
          location: result.rows[0].location,
          createdAt: result.rows[0].created_at,
          lastActivityAt: result.rows[0].last_activity_at,
          expiresAt: result.rows[0].expires_at,
          isActive: result.rows[0].is_active
        };
        return session;
      }

      return null;
    } catch (error) {
      this.logger.error('获取会话详情失败', { sessionId, error: error.message });
      return null;
    }
  }

  /**
   * 人工接管会话
   * @param {string} sessionId - 会话ID
   * @param {string} operator - 操作员
   * @returns {Promise<Object>} 更新后的会话信息
   */
  async takeOverByHuman(sessionId, operator) {
    try {
      // 这个方法在当前实现中不适用，因为我们处理的是用户登录会话
      // 实际的会话接管应该在 session_messages 表中处理
      this.logger.info('人工接管会话', { sessionId, operator });
      
      // 返回一个模拟的会话对象，实际实现应该根据业务需求调整
      return {
        sessionId,
        status: 'manual',
        operator,
        takeoverAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('人工接管会话失败', { sessionId, operator, error: error.message });
      throw error;
    }
  }

  /**
   * 切换回自动模式
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 更新后的会话信息
   */
  async switchToAuto(sessionId) {
    try {
      // 这个方法在当前实现中不适用
      // 实际的切换应该在 session_messages 表中处理
      this.logger.info('切换回自动模式', { sessionId });
      
      // 返回一个模拟的会话对象
      return {
        sessionId,
        status: 'auto',
        switchedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('切换回自动模式失败', { sessionId, error: error.message });
      throw error;
    }
  }

  /**
   * 为会话填充机器人信息
   * @param {Object} session - 会话对象
   * @returns {Promise<Object>} 填充后的会话对象
   */
  async enrichSessionWithRobotInfo(session) {
    try {
      if (!session.robotId) {
        return session;
      }

      // 这里可以根据 robotId 查询机器人详细信息
      // 目前只返回基本字段
      return session;
    } catch (error) {
      this.logger.error('填充机器人信息失败', { error: error.message });
      return session;
    }
  }
}

const sessionService = new SessionService();

module.exports = sessionService;
