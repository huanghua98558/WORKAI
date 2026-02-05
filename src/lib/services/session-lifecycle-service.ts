import { sessions, NewSession } from '@/storage/database/new-schemas';
import { userSessions } from '@/storage/database/new-schemas/user-sessions';
import { staff } from '@/storage/database/new-schemas/staff';
import { db } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';

export interface EndSessionInput {
  sessionId: string;
  reason?: string;
  endedBy?: string; // staff_id 或 'system'
  satisfactionScore?: number; // 1-5
  satisfactionReason?: string;
  feedback?: string;
  issueResolved?: boolean;
}

export interface EndSessionResult {
  success: boolean;
  session?: NewSession;
  error?: string;
}

/**
 * 会话生命周期服务
 * 负责会话的结束、统计和管理
 */
export class SessionLifecycleService {
  /**
   * 结束会话
   */
  async endSession(input: EndSessionInput): Promise<EndSessionResult> {
    try {
      // 1. 获取会话
      const currentSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (currentSessions.length === 0) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      const session = currentSessions[0];

      // 2. 验证会话状态
      if (session.status === 'ended' || session.status === 'archived') {
        return {
          success: false,
          error: 'Session already ended',
        };
      }

      // 3. 计算会话时长
      const startTime = session.startedAt ? new Date(session.startedAt) : new Date(session.createdAt);
      const endTime = new Date();
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // 4. 准备更新数据
      const updateData: any = {
        status: 'ended',
        endedAt: endTime,
        durationSeconds,
      };

      if (input.reason) {
        updateData.satisfactionReason = input.reason;
      }

      if (input.satisfactionScore !== undefined) {
        updateData.satisfactionScore = input.satisfactionScore;
      }

      if (input.feedback) {
        updateData.satisfactionReason = input.feedback;
      }

      if (input.issueResolved !== undefined) {
        updateData.issueResolved = input.issueResolved;
      }

      // 5. 更新会话
      const result = await db
        .update(sessions)
        .set(updateData)
        .where(eq(sessions.id, input.sessionId))
        .returning();

      // 6. 更新工作人员状态（如果有工作人员介入）
      if (session.staffId) {
        await db
          .update(staff)
          .set({
            currentSessions: sql`${staff.currentSessions} - 1`,
          })
          .where(eq(staff.id, session.staffId));

        // 检查是否需要更新工作人员状态为online
        const staffResult = await db
          .select()
          .from(staff)
          .where(eq(staff.id, session.staffId))
          .limit(1);

        if (staffResult.length > 0 && staffResult[0].currentSessions === 0) {
          await db
            .update(staff)
            .set({
              status: 'online',
            })
            .where(eq(staff.id, session.staffId));
        }
      }

      // 7. 更新用户会话统计
      if (session.userSessionId) {
        await db
          .update(userSessions)
          .set({
            totalServiceCount: sql`${userSessions.totalServiceCount} + 1`,
            lastServiceSessionId: input.sessionId,
          })
          .where(eq(userSessions.id, session.userSessionId));
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
   * 获取会话统计信息
   */
  async getSessionStats(sessionId: string) {
    try {
      const sessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (sessions.length === 0) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      const session = sessions[0];

      // 计算会话时长（如果已结束）
      let durationSeconds = session.durationSeconds;
      if (session.endedAt && session.startedAt) {
        const start = new Date(session.startedAt);
        const end = new Date(session.endedAt);
        durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      }

      return {
        success: true,
        stats: {
          messageCount: session.messageCount,
          userMessageCount: session.userMessageCount,
          staffMessageCount: session.staffMessageCount,
          aiMessageCount: session.aiMessageCount,
          durationSeconds,
          staffIntervened: session.staffIntervened,
          staffInterventionCount: session.staffInterventionCount,
          satisfactionScore: session.satisfactionScore,
          issueResolved: session.issueResolved,
        },
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 自动结束超时会话
   */
  async autoEndInactiveSessions(timeoutMinutes: number = 30) {
    try {
      const timeoutSeconds = timeoutMinutes * 60;
      const timeoutDate = new Date(Date.now() - timeoutSeconds * 1000);

      // 查找超时的活跃会话
      const inactiveSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.status, 'active'))
        .where(sql`${sessions.lastMessageAt} < ${timeoutDate}`);

      const results = [];

      // 结束每个超时会话
      for (const session of inactiveSessions) {
        const result = await this.endSession({
          sessionId: session.id,
          reason: '自动结束：超时无响应',
          endedBy: 'system',
        });

        results.push({
          sessionId: session.id,
          userId: session.userId,
          result: result.success ? 'success' : 'failed',
        });
      }

      return {
        success: true,
        autoEnded: results.length,
        sessions: results,
      };
    } catch (error) {
      console.error('Error auto ending inactive sessions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 导出单例
export const sessionLifecycleService = new SessionLifecycleService();
