import { db } from '../lib/db';
import { staffMessages } from '../storage/database/shared/schema';
import { collaborationDecisionLogs } from '../storage/database/shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { StaffType } from './staff-type-service';

// 确保 crypto 可用
const crypto = require('crypto');

/**
 * 工作人员消息上下文接口
 */
export interface StaffMessageContext {
  sessionId: string;
  messageContent: string;
  timestamp: Date;
  staffUserId: string;
  staffName: string;
  messageType: string;
  isHandlingCommand: boolean;
  nearbyMessages: Array<{
    content: string;
    timestamp: Date;
    sender: string;
    direction: 'before' | 'after';
  }>;
}

/**
 * 工作人员消息上下文服务
 * 用于收集工作人员消息前后的上下文信息
 */
export class StaffMessageContextService {
  /**
   * 记录工作人员消息
   */
  async recordStaffMessage(data: {
    messageId: string;
    sessionId: string;
    staffUserId: string;
    staffName: string;
    staffType: StaffType;
    content: string;
    relatedUserId?: string;
    isMention?: boolean;
    metadata?: any;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await db.insert(staffMessages).values({
        id: crypto.randomUUID(),
        sessionId: data.sessionId,
        messageId: data.messageId,
        staffUserId: data.staffUserId,
        staffName: data.staffName,
        content: data.content,
        messageType: 'reply',
        isHandlingCommand: false,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('[StaffMessageContextService] 记录工作人员消息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取工作人员消息上下文
   * @param messageId 消息ID
   * @param beforeCount 前面消息数量
   * @param afterCount 后面消息数量
   */
  async getMessageContext(
    messageId: string,
    beforeCount: number = 3,
    afterCount: number = 3
  ): Promise<StaffMessageContext | null> {
    try {
      // 获取目标消息
      const [targetMessage] = await db
        .select()
        .from(staffMessages)
        .where(eq(staffMessages.messageId, messageId))
        .limit(1);

      if (!targetMessage) {
        return null;
      }

      // 获取附近的消息（这里简化处理，实际应该从messages表获取）
      const context: StaffMessageContext = {
        sessionId: targetMessage.sessionId,
        messageContent: targetMessage.content,
        timestamp: new Date(targetMessage.createdAt || targetMessage.timestamp || Date.now()),
        staffUserId: targetMessage.staffUserId,
        staffName: targetMessage.staffName ?? '',
        messageType: targetMessage.messageType || 'reply',
        isHandlingCommand: targetMessage.isHandlingCommand ?? false,
        nearbyMessages: [],
      };

      return context;
    } catch (error) {
      console.error('[StaffMessageContextService] 获取消息上下文失败:', error);
      return null;
    }
  }

  /**
   * 获取会话中的所有工作人员消息
   */
  async getSessionStaffMessages(sessionId: string): Promise<Array<{
    messageId: string;
    staffUserId: string;
    staffName: string;
    content: string;
    timestamp: Date;
  }>> {
    try {
      const messages = await db
        .select({
          messageId: staffMessages.messageId,
          staffUserId: staffMessages.staffUserId,
          staffName: staffMessages.staffName,
          content: staffMessages.content,
          timestamp: sql<Date>`COALESCE(${staffMessages.timestamp}, ${staffMessages.createdAt})`,
        })
        .from(staffMessages)
        .where(eq(staffMessages.sessionId, sessionId))
        .orderBy(desc(sql`COALESCE(${staffMessages.timestamp}, ${staffMessages.createdAt})`));

      return messages.map(m => ({
        messageId: m.messageId,
        staffUserId: m.staffUserId,
        staffName: m.staffName ?? '',
        content: m.content,
        timestamp: new Date(m.timestamp || Date.now()),
      }));
    } catch (error) {
      console.error('[StaffMessageContextService] 获取会话工作人员消息失败:', error);
      return [];
    }
  }

  /**
   * 检查是否有工作人员介入
   */
  async hasStaffIntervention(sessionId: string): Promise<boolean> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(staffMessages)
        .where(eq(staffMessages.sessionId, sessionId));

      return Number(result?.count || 0) > 0;
    } catch (error) {
      console.error('[StaffMessageContextService] 检查工作人员介入失败:', error);
      return false;
    }
  }

  /**
   * 获取最后一次工作人员操作
   */
  async getLastStaffAction(sessionId: string): Promise<{
    messageId: string;
    staffUserId: string;
    staffName: string;
    content: string;
    timestamp: Date;
  } | null> {
    try {
      const [message] = await db
        .select({
          messageId: staffMessages.messageId,
          staffUserId: staffMessages.staffUserId,
          staffName: staffMessages.staffName,
          content: staffMessages.content,
          timestamp: sql<Date>`COALESCE(${staffMessages.timestamp}, ${staffMessages.createdAt})`,
        })
        .from(staffMessages)
        .where(eq(staffMessages.sessionId, sessionId))
        .orderBy(desc(sql`COALESCE(${staffMessages.timestamp}, ${staffMessages.createdAt})`))
        .limit(1);

      if (!message) {
        return null;
      }

      return {
        messageId: message.messageId,
        staffUserId: message.staffUserId,
        staffName: message.staffName ?? '',
        content: message.content,
        timestamp: new Date(message.timestamp || Date.now()),
      };
    } catch (error) {
      console.error('[StaffMessageContextService] 获取最后一次工作人员操作失败:', error);
      return null;
    }
  }

  /**
   * 分析工作人员消息上下文
   * 判断工作人员是否在处理某个特定问题
   */
  async analyzeStaffMessageContext(
    sessionId: string,
    currentMessage: string
  ): Promise<{
    isContinuing: boolean;
    relatedIssue: string | null;
    confidence: number;
  }> {
    try {
      // 获取最近的决策日志
      const [decision] = await db
        .select()
        .from(collaborationDecisionLogs)
        .where(eq(collaborationDecisionLogs.sessionId, sessionId))
        .orderBy(desc(collaborationDecisionLogs.createdAt))
        .limit(1);

      if (!decision) {
        return {
          isContinuing: false,
          relatedIssue: null,
          confidence: 0,
        };
      }

      // 分析当前消息是否与之前的上下文相关
      const isContinuing = this.isMessageRelated(currentMessage, decision.reason || '');
      const relatedIssue = isContinuing ? decision.reason : null;
      const confidence = isContinuing ? 0.8 : 0.2;

      return {
        isContinuing,
        relatedIssue,
        confidence,
      };
    } catch (error) {
      console.error('[StaffMessageContextService] 分析工作人员消息上下文失败:', error);
      return {
        isContinuing: false,
        relatedIssue: null,
        confidence: 0,
      };
    }
  }

  /**
   * 判断消息是否相关
   */
  private isMessageRelated(message1: string, message2: string): boolean {
    // 简化的相关度判断，实际可以使用更复杂的NLP算法
    const keywords1 = new Set(message1.toLowerCase().split(/\s+/));
    const keywords2 = new Set(message2.toLowerCase().split(/\s+/));

    let commonCount = 0;
    for (const keyword of keywords1) {
      if (keywords2.has(keyword)) {
        commonCount++;
      }
    }

    const similarity = commonCount / Math.max(keywords1.size, keywords2.size);
    return similarity > 0.3;
  }

  /**
   * 获取会话统计
   */
  async getSessionStats(sessionId: string): Promise<{
    staffMessageCount: number;
    lastStaffActivity: Date | null;
    staffUserIds: string[];
  }> {
    try {
      const [stats] = await db
        .select({
          count: sql<number>`count(*)`,
          lastActivity: sql<Date>`MAX(COALESCE(${staffMessages.timestamp}, ${staffMessages.createdAt}))`,
        })
        .from(staffMessages)
        .where(eq(staffMessages.sessionId, sessionId));

      const staffIds = await db
        .select({ staffUserId: staffMessages.staffUserId })
        .from(staffMessages)
        .where(eq(staffMessages.sessionId, sessionId))
        .groupBy(staffMessages.staffUserId);

      return {
        staffMessageCount: Number(stats?.count || 0),
        lastStaffActivity: stats?.lastActivity ? new Date(stats.lastActivity) : null,
        staffUserIds: staffIds.map(s => s.staffUserId),
      };
    } catch (error) {
      console.error('[StaffMessageContextService] 获取会话统计失败:', error);
      return {
        staffMessageCount: 0,
        lastStaffActivity: null,
        staffUserIds: [],
      };
    }
  }
}

// 导出单例
export const staffMessageContextService = new StaffMessageContextService();
