import { userSessions, NewUserSession } from '@/storage/database/new-schemas/user-sessions';
import { db } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface CreateUserSessionInput {
  userId: string;
  robotId: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserSessionInput {
  status?: 'active' | 'archived';
  totalMessageCount?: number;
  totalServiceCount?: number;
  firstServiceSessionId?: string;
  lastServiceSessionId?: string;
  metadata?: Record<string, any>;
}

export interface UserSessionResult {
  success: boolean;
  userSession?: NewUserSession;
  error?: string;
}

/**
 * 用户会话服务
 * 负责用户会话的创建、查询和更新
 */
export class UserSessionService {
  /**
   * 获取或创建用户会话
   */
  async getOrCreateUserSession(
    userId: string,
    robotId: string
  ): Promise<UserSessionResult> {
    try {
      // 检查是否已存在用户会话
      const existingSessions = await db
        .select()
        .from(userSessions)
        .where(and(eq(userSessions.userId, userId), eq(userSessions.robotId, robotId)))
        .limit(1);

      if (existingSessions.length > 0) {
        return {
          success: true,
          userSession: existingSessions[0],
        };
      }

      // 创建新用户会话
      const newUserSession: NewUserSession = {
        userId,
        robotId,
        status: 'active',
        totalMessageCount: 0,
        totalServiceCount: 0,
        metadata: {},
      };

      const result = await db.insert(userSessions).values(newUserSession).returning();

      return {
        success: true,
        userSession: result[0],
      };
    } catch (error) {
      console.error('Error creating/getting user session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 根据ID获取用户会话
   */
  async getUserSessionById(userSessionId: string): Promise<UserSessionResult> {
    try {
      const result = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.id, userSessionId))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'User session not found',
        };
      }

      return {
        success: true,
        userSession: result[0],
      };
    } catch (error) {
      console.error('Error getting user session by id:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 根据用户ID获取用户会话
   */
  async getUserSessionByUserId(
    userId: string,
    robotId: string
  ): Promise<UserSessionResult> {
    try {
      const result = await db
        .select()
        .from(userSessions)
        .where(and(eq(userSessions.userId, userId), eq(userSessions.robotId, robotId)))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'User session not found',
        };
      }

      return {
        success: true,
        userSession: result[0],
      };
    } catch (error) {
      console.error('Error getting user session by user id:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 更新用户会话
   */
  async updateUserSession(
    userSessionId: string,
    updates: UpdateUserSessionInput
  ): Promise<UserSessionResult> {
    try {
      const result = await db
        .update(userSessions)
        .set(updates)
        .where(eq(userSessions.id, userSessionId))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'User session not found',
        };
      }

      return {
        success: true,
        userSession: result[0],
      };
    } catch (error) {
      console.error('Error updating user session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 增加用户会话的消息计数
   */
  async incrementMessageCount(userSessionId: string): Promise<void> {
    try {
      await db
        .update(userSessions)
        .set({
          totalMessageCount: sql`${userSessions.totalMessageCount} + 1`,
          lastMessageAt: new Date(),
        })
        .where(eq(userSessions.id, userSessionId));
    } catch (error) {
      console.error('Error incrementing message count:', error);
    }
  }

  /**
   * 增加用户会话的服务次数
   */
  async incrementServiceCount(
    userSessionId: string,
    serviceSessionId: string
  ): Promise<void> {
    try {
      await db
        .update(userSessions)
        .set({
          totalServiceCount: sql`${userSessions.totalServiceCount} + 1`,
          lastServiceSessionId: serviceSessionId,
        })
        .where(eq(userSessions.id, userSessionId));
    } catch (error) {
      console.error('Error incrementing service count:', error);
    }
  }

  /**
   * 设置第一次服务会话
   */
  async setFirstServiceSession(
    userSessionId: string,
    serviceSessionId: string
  ): Promise<void> {
    try {
      // 只在第一次设置
      const currentSession = await this.getUserSessionById(userSessionId);
      if (currentSession.success && currentSession.userSession) {
        if (!currentSession.userSession.firstServiceSessionId) {
          await db
            .update(userSessions)
            .set({
              firstServiceSessionId: serviceSessionId,
            })
            .where(eq(userSessions.id, userSessionId));
        }
      }
    } catch (error) {
      console.error('Error setting first service session:', error);
    }
  }

  /**
   * 归档用户会话
   */
  async archiveUserSession(userSessionId: string): Promise<UserSessionResult> {
    try {
      const result = await db
        .update(userSessions)
        .set({
          status: 'archived',
        })
        .where(eq(userSessions.id, userSessionId))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'User session not found',
        };
      }

      return {
        success: true,
        userSession: result[0],
      };
    } catch (error) {
      console.error('Error archiving user session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取用户会话统计
   */
  async getUserSessionStats(userSessionId: string) {
    try {
      const userSession = await this.getUserSessionById(userSessionId);

      if (!userSession.success) {
        return {
          success: false,
          error: 'User session not found',
        };
      }

      return {
        success: true,
        stats: {
          totalMessageCount: userSession.userSession?.totalMessageCount || 0,
          totalServiceCount: userSession.userSession?.totalServiceCount || 0,
          createdAt: userSession.userSession?.createdAt,
          lastMessageAt: userSession.userSession?.lastMessageAt,
          status: userSession.userSession?.status,
        },
      };
    } catch (error) {
      console.error('Error getting user session stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 导出单例
export const userSessionService = new UserSessionService();
