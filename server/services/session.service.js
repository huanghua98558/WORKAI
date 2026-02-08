/**
 * 会话管理服务
 * 管理用户会话和Token
 */

const { eq, and, sql } = require('drizzle-orm');
const { getDb } = require('coze-coding-dev-sdk');
const { userSessions, users } = require('../database/schema');
const { getLogger } = require('./logger');
const { verifyToken, generateTokenPair } = require('./jwt');

class SessionService {
  constructor() {
    this.logger = getLogger('SESSION');
  }

  /**
   * 创建会话
   * @param {Object} user - 用户信息
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<Object>} 会话信息和Token
   */
  async createSession(user, sessionData = {}) {
    const db = await getDb();
    const { v4: uuidv4 } = require('uuid');

    // 生成Token对
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // 计算过期时间
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天后过期

    // 创建会话记录
    const session = {
      id: uuidv4(),
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ip_address: sessionData.ip || null,
      user_agent: sessionData.userAgent || null,
      device_type: sessionData.deviceType || 'unknown',
      location: sessionData.location || null,
      is_active: true,
      expires_at: expiresAt,
      created_at: now,
      last_activity_at: now
    };

    const [createdSession] = await db.insert(userSessions).values(session).returning();

    this.logger.info('创建会话成功', {
      sessionId: createdSession.id,
      userId: user.id,
      username: user.username,
      ip: session.ip_address,
      device: session.device_type
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      },
      session: {
        id: createdSession.id,
        expiresAt: expiresAt,
        deviceType: session.device_type,
        ipAddress: session.ip_address
      },
      ...tokens
    };
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
        .from(userSessions)
        .where(
          and(
            eq(userSessions.token, token),
            eq(userSessions.isActive, true)
          )
        );

      if (!session) {
        return null;
      }

      // 检查是否过期
      if (new Date() > new Date(session.expiresAt)) {
        // 标记会话为非活跃
        await db
          .update(userSessions)
          .set({ isActive: false })
          .where(eq(userSessions.id, session.id));

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
        .update(userSessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(userSessions.id, session.id));

      return {
        session,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl
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
        .from(userSessions)
        .where(
          and(
            eq(userSessions.refreshToken, refreshToken),
            eq(userSessions.isActive, true)
          )
        );

      if (!session) {
        return null;
      }

      // 检查是否过期
      if (new Date() > new Date(session.expiresAt)) {
        await db
          .update(userSessions)
          .set({ isActive: false })
          .where(eq(userSessions.id, session.id));

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
        .update(userSessions)
        .set({
          token: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastActivityAt: new Date()
        })
        .where(eq(userSessions.id, session.id));

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
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.token, token));

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
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.userId, userId));

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
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true)
          )
        )
        .orderBy(userSessions.lastActivityAt);

      // 清理过期的会话
      const now = new Date();
      for (const session of sessions) {
        if (new Date(session.expiresAt) < now) {
          await db
            .update(userSessions)
            .set({ isActive: false })
            .where(eq(userSessions.id, session.id));
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
        .update(userSessions)
        .set({ isActive: false })
        .where(sql`${userSessions.expiresAt} < NOW()`);

      this.logger.info('清理过期会话完成', { count: result.rowCount });
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('清理过期会话失败', { error: error.message });
      return 0;
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
}

const sessionService = new SessionService();

module.exports = sessionService;
