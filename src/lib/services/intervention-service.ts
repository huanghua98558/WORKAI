import { interventions, NewIntervention } from '@/storage/database/new-schemas';
import { db } from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';

export interface CreateInterventionInput {
  sessionId: string;
  staffId: string;
  staffName: string;
  messageId?: string;
  interventionType?: 'manual' | 'automatic' | 'escalation';
  reason?: string;
  interventionContent?: string;
  messageSnapshot?: Record<string, any>;
  sessionSnapshot?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateInterventionInput {
  status?: 'active' | 'resolved' | 'closed' | 'transferred';
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
  closedAt?: Date;
  durationSeconds?: number;
  metadata?: Record<string, any>;
}

export interface InterventionResult {
  success: boolean;
  intervention?: NewIntervention;
  error?: string;
}

/**
 * 介入记录服务
 * 负责工作人员介入记录的创建、查询和更新
 */
export class InterventionService {
  /**
   * 创建介入记录
   */
  async createIntervention(input: CreateInterventionInput): Promise<InterventionResult> {
    try {
      // 验证必填字段
      if (!input.sessionId || !input.staffId || !input.staffName) {
        return {
          success: false,
          error: 'Missing required fields: sessionId, staffId, staffName',
        };
      }

      // 创建介入记录数据
      const newIntervention: NewIntervention = {
        sessionId: input.sessionId,
        staffId: input.staffId,
        staffName: input.staffName,
        messageId: input.messageId,
        interventionType: input.interventionType || 'manual',
        reason: input.reason,
        interventionContent: input.interventionContent,
        messageSnapshot: input.messageSnapshot || {},
        sessionSnapshot: input.sessionSnapshot || {},
        status: 'active',
        metadata: input.metadata || {},
      };

      // 保存到数据库
      const result = await db.insert(interventions).values(newIntervention).returning();

      return {
        success: true,
        intervention: result[0],
      };
    } catch (error) {
      console.error('Error creating intervention:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取介入记录列表
   */
  async getInterventions(params: {
    sessionId?: string;
    staffId?: string;
    status?: string;
    interventionType?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const conditions = [];

      if (params.sessionId) {
        conditions.push(eq(interventions.sessionId, params.sessionId));
      }
      if (params.staffId) {
        conditions.push(eq(interventions.staffId, params.staffId));
      }
      if (params.status) {
        conditions.push(eq(interventions.status, params.status));
      }
      if (params.interventionType) {
        conditions.push(eq(interventions.interventionType, params.interventionType));
      }

      let query = db.select().from(interventions);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // 按创建时间倒序
      query = query.orderBy(desc(interventions.createdAt)) as any;

      // 分页
      if (params.limit) {
        query = query.limit(params.limit) as any;
      }
      if (params.offset) {
        query = query.offset(params.offset) as any;
      }

      const results = await query;

      return {
        success: true,
        interventions: results,
      };
    } catch (error) {
      console.error('Error getting interventions:', error);
      return {
        success: false,
        interventions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 根据ID获取介入记录
   */
  async getInterventionById(id: string): Promise<InterventionResult> {
    try {
      const result = await db
        .select()
        .from(interventions)
        .where(eq(interventions.id, id))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Intervention not found',
        };
      }

      return {
        success: true,
        intervention: result[0],
      };
    } catch (error) {
      console.error('Error getting intervention by id:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 更新介入记录
   */
  async updateIntervention(
    id: string,
    input: UpdateInterventionInput
  ): Promise<InterventionResult> {
    try {
      // 准备更新数据
      const updateData: any = {};

      if (input.status) updateData.status = input.status;
      if (input.resolvedAt) updateData.resolvedAt = input.resolvedAt;
      if (input.resolvedBy) updateData.resolvedBy = input.resolvedBy;
      if (input.resolutionNote) updateData.resolutionNote = input.resolutionNote;
      if (input.closedAt) updateData.closedAt = input.closedAt;
      if (input.durationSeconds) updateData.durationSeconds = input.durationSeconds;
      if (input.metadata) updateData.metadata = input.metadata;

      // 更新记录
      const result = await db
        .update(interventions)
        .set(updateData)
        .where(eq(interventions.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Intervention not found',
        };
      }

      return {
        success: true,
        intervention: result[0],
      };
    } catch (error) {
      console.error('Error updating intervention:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 解决介入记录
   */
  async resolveIntervention(
    id: string,
    resolvedBy: string,
    resolutionNote?: string
  ): Promise<InterventionResult> {
    try {
      const result = await db
        .update(interventions)
        .set({
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNote,
        })
        .where(eq(interventions.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Intervention not found',
        };
      }

      return {
        success: true,
        intervention: result[0],
      };
    } catch (error) {
      console.error('Error resolving intervention:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 关闭介入记录
   */
  async closeIntervention(id: string, durationSeconds?: number): Promise<InterventionResult> {
    try {
      const updateData: any = {
        status: 'closed',
        closedAt: new Date(),
      };

      if (durationSeconds) {
        updateData.durationSeconds = durationSeconds;
      } else {
        // 如果没有提供时长，自动计算
        const intervention = await this.getInterventionById(id);
        if (intervention.success && intervention.intervention && intervention.intervention.createdAt) {
          const createdAt = new Date(intervention.intervention.createdAt);
          const now = new Date();
          updateData.durationSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
        }
      }

      const result = await db
        .update(interventions)
        .set(updateData)
        .where(eq(interventions.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Intervention not found',
        };
      }

      return {
        success: true,
        intervention: result[0],
      };
    } catch (error) {
      console.error('Error closing intervention:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取会话的介入记录统计
   */
  async getSessionInterventionStats(sessionId: string) {
    try {
      const stats = await db
        .select({
          totalCount: sql<number>`count(*)`,
          activeCount: sql<number>`count(*) filter (where status = 'active')`,
          resolvedCount: sql<number>`count(*) filter (where status = 'resolved')`,
          closedCount: sql<number>`count(*) filter (where status = 'closed')`,
          manualCount: sql<number>`count(*) filter (where intervention_type = 'manual')`,
          automaticCount: sql<number>`count(*) filter (where intervention_type = 'automatic')`,
          escalationCount: sql<number>`count(*) filter (where intervention_type = 'escalation')`,
        })
        .from(interventions)
        .where(eq(interventions.sessionId, sessionId));

      return {
        success: true,
        stats: stats[0] || {},
      };
    } catch (error) {
      console.error('Error getting session intervention stats:', error);
      return {
        success: false,
        stats: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 删除介入记录
   */
  async deleteIntervention(id: string): Promise<InterventionResult> {
    try {
      const result = await db
        .delete(interventions)
        .where(eq(interventions.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Intervention not found',
        };
      }

      return {
        success: true,
        intervention: result[0],
      };
    } catch (error) {
      console.error('Error deleting intervention:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 导出单例
export const interventionService = new InterventionService();
