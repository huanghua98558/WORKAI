import { db } from '@/lib/db';
import { collaborationDecisionLogs } from '@/storage/database/shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface RecordDecisionInput {
  /** 会话ID */
  sessionId: string;
  /** 消息ID（用户消息ID） */
  messageId: string;
  /** 机器人ID */
  robotId: string;
  /** AI是否应该回复 */
  shouldAiReply: boolean;
  /** AI动作 */
  aiAction?: 'replied' | 'skipped' | 'transferred' | 'none' | 'processing';
  /** 员工动作 */
  staffAction?: 'replied' | 'handled' | 'ignored' | 'none';
  /** 优先级 */
  priority?: 'high' | 'medium' | 'low';
  /** 决策原因 */
  reason?: string;
  /** 员工上下文 */
  staffContext?: string;
  /** 信息上下文 */
  infoContext?: string;
  /** 决策策略 */
  strategy?: string;
  /** 员工ID（如果有） */
  staffId?: string;
  /** 员工名称（如果有） */
  staffName?: string;
  /** 员工类型（可选） */
  staffType?: 'management' | 'community' | 'after_sales' | 'conversion';
  /** 消息类型（可选） */
  messageType?: 'user' | 'staff' | 'system' | 'notification';
}

export interface DecisionResult {
  success: boolean;
  decision?: any;
  error?: string;
}

export interface ReplyStatusResult {
  success: boolean;
  status?: Record<string, {
    isReplied: boolean;
    replyType: 'ai' | 'human' | 'none';
    decisionAt?: string;
    aiAction?: string;
    staffAction?: string;
    priority?: string;
    reason?: string;
  }>;
  error?: string;
}

/**
 * 协同决策服务
 * 负责记录AI和人工回复的决策过程
 */
export class CollaborationDecisionService {
  /**
   * 记录决策日志
   */
  async recordDecision(input: RecordDecisionInput): Promise<DecisionResult> {
    try {
      // 验证必填字段
      if (!input.sessionId || !input.messageId || !input.robotId) {
        return {
          success: false,
          error: 'Missing required fields: sessionId, messageId, robotId',
        };
      }

      // 创建决策记录
      const decisionId = uuidv4();
      
      const decisionData = {
        id: decisionId,
        sessionId: input.sessionId,
        messageId: input.messageId,
        robotId: input.robotId,
        shouldAiReply: input.shouldAiReply ?? false,
        aiAction: input.aiAction || 'none',
        staffAction: input.staffAction || 'none',
        priority: input.priority || 'medium',
        reason: input.reason || '',
        staffContext: input.staffContext || '',
        infoContext: input.infoContext || '',
        strategy: input.strategy || '',
        staffType: input.staffType || null,
        messageType: input.messageType || null,
        createdAt: new Date().toISOString(),
      };
      
      // 保存到数据库
      await db.insert(collaborationDecisionLogs).values(decisionData);

      console.log(`[CollaborationDecisionService] 决策记录成功: ${decisionId}`, {
        sessionId: input.sessionId,
        messageId: input.messageId,
        aiAction: input.aiAction,
        staffAction: input.staffAction,
      });

      return {
        success: true,
        decision: decisionData,
      };
    } catch (error) {
      console.error('[CollaborationDecisionService] 记录决策失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 批量记录决策日志
   */
  async recordDecisionsBatch(inputs: RecordDecisionInput[]): Promise<DecisionResult> {
    try {
      if (inputs.length === 0) {
        return {
          success: true,
          decision: [],
        };
      }

      const decisions = inputs.map(input => ({
        id: uuidv4(),
        sessionId: input.sessionId,
        messageId: input.messageId,
        robotId: input.robotId,
        shouldAiReply: input.shouldAiReply ?? false,
        aiAction: input.aiAction || 'none',
        staffAction: input.staffAction || 'none',
        priority: input.priority || 'medium',
        reason: input.reason || '',
        staffContext: input.staffContext || '',
        infoContext: input.infoContext || '',
        strategy: input.strategy || '',
        staffType: input.staffType || null,
        messageType: input.messageType || null,
        createdAt: new Date().toISOString(),
      }));

      await db.insert(collaborationDecisionLogs).values(decisions);

      console.log(`[CollaborationDecisionService] 批量记录决策成功: ${decisions.length} 条`);

      return {
        success: true,
        decision: decisions,
      };
    } catch (error) {
      console.error('[CollaborationDecisionService] 批量记录决策失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取会话的回复状态
   */
  async getReplyStatus(sessionId: string): Promise<ReplyStatusResult> {
    try {
      // 查询该会话的所有决策日志
      const decisions = await db
        .select()
        .from(collaborationDecisionLogs)
        .where(eq(collaborationDecisionLogs.sessionId, sessionId))
        .orderBy(desc(collaborationDecisionLogs.createdAt));

      // 构建消息回复状态映射
      const replyStatusMap: Record<string, {
        isReplied: boolean;
        replyType: 'ai' | 'human' | 'none';
        decisionAt?: string;
        aiAction?: string;
        staffAction?: string;
        priority?: string;
        reason?: string;
      }> = {};

      for (const decision of decisions) {
        if (!decision.messageId) continue;

        const hasAiReply = decision.aiAction === 'replied';
        const hasStaffReply = decision.staffAction === 'replied';

        replyStatusMap[decision.messageId] = {
          isReplied: hasAiReply || hasStaffReply,
          replyType: hasAiReply ? 'ai' : (hasStaffReply ? 'human' : 'none'),
          decisionAt: decision.createdAt || undefined,
          aiAction: decision.aiAction || undefined,
          staffAction: decision.staffAction || undefined,
          priority: decision.priority || undefined,
          reason: decision.reason || undefined,
        };
      }

      return {
        success: true,
        status: replyStatusMap,
      };
    } catch (error) {
      console.error('[CollaborationDecisionService] 获取回复状态失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取单条消息的回复状态
   */
  async getMessageReplyStatus(messageId: string): Promise<{
    success: boolean;
    isReplied: boolean;
    replyType: 'ai' | 'human' | 'none';
    decisionAt?: string;
    aiAction?: string;
    staffAction?: string;
    error?: string;
  }> {
    try {
      const decision = await db
        .select()
        .from(collaborationDecisionLogs)
        .where(eq(collaborationDecisionLogs.messageId, messageId))
        .orderBy(desc(collaborationDecisionLogs.createdAt))
        .limit(1);

      if (!decision || decision.length === 0) {
        return {
          success: true,
          isReplied: false,
          replyType: 'none',
        };
      }

      const hasAiReply = decision[0].aiAction === 'replied';
      const hasStaffReply = decision[0].staffAction === 'replied';

      return {
        success: true,
        isReplied: hasAiReply || hasStaffReply,
        replyType: hasAiReply ? 'ai' : (hasStaffReply ? 'human' : 'none'),
        decisionAt: decision[0].createdAt || undefined,
        aiAction: decision[0].aiAction || undefined,
        staffAction: decision[0].staffAction || undefined,
      };
    } catch (error) {
      console.error('[CollaborationDecisionService] 获取消息回复状态失败:', error);
      return {
        success: false,
        isReplied: false,
        replyType: 'none',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 更新决策记录
   */
  async updateDecision(
    messageId: string,
    updates: {
      aiAction?: 'replied' | 'skipped' | 'transferred' | 'none' | 'processing';
      staffAction?: 'replied' | 'handled' | 'ignored' | 'none';
      priority?: 'high' | 'medium' | 'low';
      reason?: string;
    }
  ): Promise<DecisionResult> {
    try {
      // 查找现有的决策记录
      const existingDecision = await db
        .select()
        .from(collaborationDecisionLogs)
        .where(eq(collaborationDecisionLogs.messageId, messageId))
        .orderBy(desc(collaborationDecisionLogs.createdAt))
        .limit(1);

      if (!existingDecision || existingDecision.length === 0) {
        return {
          success: false,
          error: 'Decision record not found',
        };
      }

      // 更新决策记录
      await db
        .update(collaborationDecisionLogs)
        .set(updates)
        .where(eq(collaborationDecisionLogs.id, existingDecision[0].id));

      console.log(`[CollaborationDecisionService] 决策更新成功: ${messageId}`, updates);

      return {
        success: true,
      };
    } catch (error) {
      console.error('[CollaborationDecisionService] 更新决策失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取决策统计
   */
  async getDecisionStats(sessionId: string): Promise<{
    success: boolean;
    stats?: {
      totalDecisions: number;
      aiReplies: number;
      staffReplies: number;
      unreplied: number;
      collaborationRate: string;
    };
    error?: string;
  }> {
    try {
      const decisions = await db
        .select()
        .from(collaborationDecisionLogs)
        .where(eq(collaborationDecisionLogs.sessionId, sessionId));

      const totalDecisions = decisions.length;
      const aiReplies = decisions.filter(d => d.aiAction === 'replied').length;
      const staffReplies = decisions.filter(d => d.staffAction === 'replied').length;
      const unreplied = totalDecisions - aiReplies - staffReplies;
      const collaborationRate = totalDecisions > 0 
        ? ((aiReplies + staffReplies) / totalDecisions * 100).toFixed(2)
        : '0.00';

      return {
        success: true,
        stats: {
          totalDecisions,
          aiReplies,
          staffReplies,
          unreplied,
          collaborationRate,
        },
      };
    } catch (error) {
      console.error('[CollaborationDecisionService] 获取决策统计失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 导出单例实例
export const collaborationDecisionService = new CollaborationDecisionService();
