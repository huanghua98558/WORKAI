import { sessions, NewSession } from '@/storage/database/new-schemas';
import { db } from '@/lib/db';
import { eq, desc, and, sql, isNull } from 'drizzle-orm';

export interface CreateSessionInput {
  robotId: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  userSource?: string;
  sessionType?: 'private' | 'group';
  metadata?: Record<string, any>;
}

export interface UpdateSessionInput {
  status?: 'active' | 'ended' | 'transferred' | 'archived';
  satisfactionScore?: number;
  satisfactionReason?: string;
  issueCategory?: string;
  issueSubcategory?: string;
  issueResolved?: boolean;
  metadata?: Record<string, any>;
}

export interface SessionResult {
  success: boolean;
  session?: NewSession;
  error?: string;
}

/**
 * 会话服务
 * 负责会话的创建、更新、统计和管理
 */
export class SessionService {
  /**
   * 创建或获取会话
   */
  async getOrCreateSession(input: CreateSessionInput): Promise<SessionResult> {
    try {
      // 检查是否已存在活跃会话
      const existingSessions = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, input.userId),
            eq(sessions.robotId, input.robotId),
            eq(sessions.status, 'active')
          )
        )
        .limit(1);

      if (existingSessions.length > 0) {
        return {
          success: true,
          session: existingSessions[0],
        };
      }

      // 创建新会话
      const newSession: NewSession = {
        robotId: input.robotId,
        userId: input.userId,
        userName: input.userName,
        userAvatarUrl: input.userAvatarUrl,
        userSource: input.userSource || 'unknown',
        status: 'active',
        sessionType: input.sessionType || 'private',
        messageCount: 0,
        userMessageCount: 0,
        staffMessageCount: 0,
        aiMessageCount: 0,
        staffIntervened: false,
        staffInterventionCount: 0,
        issueResolved: false,
        metadata: input.metadata || {},
      };

      const result = await db.insert(sessions).values(newSession).returning();

      return {
        success: true,
        session: result[0],
      };
    } catch (error) {
      console.error('Error creating/getting session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 更新会话
   */
  async updateSession(sessionId: string, updates: UpdateSessionInput): Promise<SessionResult> {
    try {
      const result = await db
        .update(sessions)
        .set(updates)
        .where(eq(sessions.id, sessionId))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      return {
        success: true,
        session: result[0],
      };
    } catch (error) {
      console.error('Error updating session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 更新会话统计
   */
  async updateSessionStats(sessionId: string, senderType: 'user' | 'staff' | 'system' | 'ai'): Promise<void> {
    try {
      const updateData: any = {
        messageCount: sql`${sessions.messageCount} + 1`,
        lastMessageAt: new Date(),
      };

      // 根据发送者类型更新对应的计数
      switch (senderType) {
        case 'user':
          updateData.userMessageCount = sql`${sessions.userMessageCount} + 1`;
          break;
        case 'staff':
          updateData.staffMessageCount = sql`${sessions.staffMessageCount} + 1`;
          break;
        case 'ai':
          updateData.aiMessageCount = sql`${sessions.aiMessageCount} + 1`;
          break;
      }

      await db
        .update(sessions)
        .set(updateData)
        .where(eq(sessions.id, sessionId));
    } catch (error) {
      console.error('Error updating session stats:', error);
    }
  }

  /**
   * 记录工作人员介入
   */
  async recordStaffIntervention(sessionId: string, staffId: string): Promise<void> {
    try {
      // 获取当前会话
      const currentSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (currentSessions.length === 0) {
        return;
      }

      const currentSession = currentSessions[0];

      // 更新会话
      const updateData: any = {
        staffIntervened: true,
        staffInterventionCount: sql`${sessions.staffInterventionCount} + 1`,
      };

      // 如果是第一次介入，记录时间
      if (!currentSession.firstInterventionAt) {
        updateData.firstInterventionAt = new Date();
      }

      // 如果还没有staffId，设置它
      if (!currentSession.staffId) {
        updateData.staffId = staffId;
      }

      await db
        .update(sessions)
        .set(updateData)
        .where(eq(sessions.id, sessionId));
    } catch (error) {
      console.error('Error recording staff intervention:', error);
    }
  }

  /**
   * 结束会话
   */
  async endSession(sessionId: string): Promise<SessionResult> {
    try {
      const result = await db
        .update(sessions)
        .set({
          status: 'ended',
          endedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      // 计算会话时长
      const session = result[0];
      if (session.startedAt && session.endedAt) {
        const duration = Math.floor(
          (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
        );

        await db
          .update(sessions)
          .set({ durationSeconds: duration })
          .where(eq(sessions.id, sessionId));
      }

      return {
        success: true,
        session: result[0],
      };
    } catch (error) {
      console.error('Error ending session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取会话列表
   */
  async getSessions(params: {
    robotId?: string;
    userId?: string;
    status?: 'active' | 'ended' | 'transferred' | 'archived';
    staffIntervened?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      const conditions = [];
      
      if (params.robotId) {
        conditions.push(eq(sessions.robotId, params.robotId));
      }
      if (params.userId) {
        conditions.push(eq(sessions.userId, params.userId));
      }
      if (params.status) {
        conditions.push(eq(sessions.status, params.status));
      }
      if (params.staffIntervened !== undefined) {
        conditions.push(eq(sessions.staffIntervened, params.staffIntervened));
      }

      const query = db
        .select()
        .from(sessions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sessions.lastMessageAt))
        .limit(params.limit || 100)
        .offset(params.offset || 0);

      const result = await query;
      
      return {
        success: true,
        sessions: result,
      };
    } catch (error) {
      console.error('Error getting sessions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sessions: [],
      };
    }
  }

  /**
   * 获取活跃会话
   */
  async getActiveSessions(params?: { robotId?: string; limit?: number }) {
    return this.getSessions({
      ...params,
      status: 'active',
    });
  }

  /**
   * 获取会话详情
   */
  async getSessionById(sessionId: string) {
    try {
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Session not found',
          session: null,
        };
      }

      return {
        success: true,
        session: result[0],
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        session: null,
      };
    }
  }

  /**
   * 超时会话处理
   * 查找超过指定时间未活跃的会话并自动结束
   */
  async checkAndCloseTimeoutSessions(timeoutSeconds: number = 3600): Promise<number> {
    try {
      const timeoutDate = new Date();
      timeoutDate.setSeconds(timeoutDate.getSeconds() - timeoutSeconds);

      const result = await db
        .update(sessions)
        .set({
          status: 'ended',
          endedAt: new Date(),
        })
        .where(
          and(
            eq(sessions.status, 'active'),
            sql`${sessions.lastMessageAt} < ${timeoutDate}`
          )
        )
        .returning();

      // 计算会话时长
      for (const session of result) {
        if (session.startedAt && session.endedAt) {
          const duration = Math.floor(
            (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
          );

          await db
            .update(sessions)
            .set({ durationSeconds: duration })
            .where(eq(sessions.id, session.id));
        }
      }

      return result.length;
    } catch (error) {
      console.error('Error checking timeout sessions:', error);
      return 0;
    }
  }
}

// 导出单例
export const sessionService = new SessionService();
