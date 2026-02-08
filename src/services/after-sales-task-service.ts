import { db } from '../lib/db';
import { afterSalesTasks, NewAfterSalesTask, AfterSalesTask } from '../storage/database/new-schemas/after-sales-tasks';
import { eq, and, sql } from 'drizzle-orm';

/**
 * 售后任务状态类型（用于API）
 */
export type TaskStatus = 'pending' | 'in_progress' | 'waiting_response' | 'completed' | 'cancelled';

/**
 * 售后任务优先级类型（用于API）
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 售后任务状态枚举
 */
export enum AfterSalesTaskStatus {
  PENDING = 'pending',              // 待处理
  WAITING_STAFF = 'waiting_staff',   // 等待售后人员
  WAITING_USER = 'waiting_response', // 等待用户确认（API使用waiting_response）
  PROCESSING = 'in_progress',        // 处理中（API使用in_progress）
  COMPLETED = 'completed',           // 已完成
  CANCELLED = 'cancelled',           // 已取消
}

/**
 * 超时提醒级别枚举
 */
export enum TimeoutReminderLevel {
  NONE = 0,
  LEVEL_1 = 1,  // 6小时
  LEVEL_2 = 2,  // 12小时
  LEVEL_3 = 3,  // 24小时
}

/**
 * 售后任务优先级枚举
 */
export enum AfterSalesTaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 售后任务服务
 */
export class AfterSalesTaskService {
  /**
   * 创建售后任务
   */
  async createTask(data: NewAfterSalesTask): Promise<string | null> {
    try {
      const [task] = await db
        .insert(afterSalesTasks)
        .values({
          ...data,
          updatedAt: new Date().toISOString(),
          timeoutReminderLevel: TimeoutReminderLevel.NONE,
        })
        .returning();

      console.log('[AfterSalesTaskService] 创建售后任务成功:', task.id);
      return task.id;
    } catch (error) {
      console.error('[AfterSalesTaskService] 创建售后任务失败:', error);
      return null;
    }
  }

  /**
   * 获取任务详情
   */
  async getTaskById(taskId: string): Promise<{
    success: boolean;
    task?: AfterSalesTask;
    error?: string;
  }> {
    try {
      const [task] = await db
        .select()
        .from(afterSalesTasks)
        .where(eq(afterSalesTasks.id, taskId))
        .limit(1);

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      return {
        success: true,
        task,
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 获取任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  /**
   * 根据会话ID获取任务
   */
  async getTasksBySessionId(sessionId: string): Promise<AfterSalesTask[]> {
    try {
      const tasks = await db
        .select()
        .from(afterSalesTasks)
        .where(eq(afterSalesTasks.sessionId, sessionId))
        .orderBy(afterSalesTasks.createdAt);

      return tasks;
    } catch (error) {
      console.error('[AfterSalesTaskService] 获取会话任务失败:', error);
      return [];
    }
  }

  /**
   * 根据工作人员ID获取任务
   */
  async getTasksByStaffId(staffUserId: string): Promise<AfterSalesTask[]> {
    try {
      const tasks = await db
        .select()
        .from(afterSalesTasks)
        .where(eq(afterSalesTasks.staffUserId, staffUserId))
        .orderBy(afterSalesTasks.createdAt);

      return tasks;
    } catch (error) {
      console.error('[AfterSalesTaskService] 获取工作人员任务失败:', error);
      return [];
    }
  }

  /**
   * 获取超时任务
   */
  async getTimeoutTasks(): Promise<AfterSalesTask[]> {
    try {
      const now = new Date();
      const tasks = await db
        .select()
        .from(afterSalesTasks)
        .where(
          and(
            eq(afterSalesTasks.status, AfterSalesTaskStatus.WAITING_STAFF),
            sql`${afterSalesTasks.expectedResponseTime} < ${now}`
          )
        );

      return tasks;
    } catch (error) {
      console.error('[AfterSalesTaskService] 获取超时任务失败:', error);
      return [];
    }
  }

  /**
   * 检查并提醒超时任务
   */
  async checkTimeoutReminders(): Promise<{ reminded: number; escalated: number }> {
    const timeoutTasks = await this.getTimeoutTasks();
    let reminded = 0;
    let escalated = 0;

    for (const task of timeoutTasks) {
      const hoursSinceCreation = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
      const currentReminderLevel = task.timeoutReminderLevel ?? TimeoutReminderLevel.NONE;
      let newReminderLevel = currentReminderLevel;

      // 检查是否需要升级提醒级别
      if (hoursSinceCreation >= 24 && currentReminderLevel < TimeoutReminderLevel.LEVEL_3) {
        newReminderLevel = TimeoutReminderLevel.LEVEL_3;
        // 24小时超时，升级为高优先级
        await this.updateTaskPriority(task.id, AfterSalesTaskPriority.URGENT);
        escalated++;
      } else if (hoursSinceCreation >= 12 && currentReminderLevel < TimeoutReminderLevel.LEVEL_2) {
        newReminderLevel = TimeoutReminderLevel.LEVEL_2;
        reminded++;
      } else if (hoursSinceCreation >= 6 && currentReminderLevel < TimeoutReminderLevel.LEVEL_1) {
        newReminderLevel = TimeoutReminderLevel.LEVEL_1;
        reminded++;
      }

      if (newReminderLevel !== currentReminderLevel) {
        await db
          .update(afterSalesTasks)
          .set({
            timeoutReminderLevel: newReminderLevel,
            lastReminderSentAt: new Date().toISOString(),
          })
          .where(eq(afterSalesTasks.id, task.id));
      }
    }

    return { reminded, escalated };
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: {
    status?: TaskStatus;
    priority?: TaskPriority;
    description?: string;
    assignedTo?: string;
  }): Promise<{
    success: boolean;
    task?: AfterSalesTask;
    error?: string;
  }> {
    try {
      const updateData: Partial<AfterSalesTask> = {
        updatedAt: new Date().toISOString(),
      };

      // 映射 API 状态到数据库状态
      if (updates.status) {
        const statusMapping: Record<TaskStatus, AfterSalesTaskStatus> = {
          'pending': AfterSalesTaskStatus.PENDING,
          'in_progress': AfterSalesTaskStatus.PROCESSING,
          'waiting_response': AfterSalesTaskStatus.WAITING_USER,
          'completed': AfterSalesTaskStatus.COMPLETED,
          'cancelled': AfterSalesTaskStatus.CANCELLED,
        };
        updateData.status = statusMapping[updates.status] as any;
      }

      // 映射 API 优先级到数据库优先级
      if (updates.priority) {
        updateData.priority = updates.priority as any;
      }

      if (updates.description) {
        updateData.description = updates.description;
      }

      if (updates.assignedTo) {
        updateData.assignedTo = updates.assignedTo;
      }

      const [task] = await db
        .update(afterSalesTasks)
        .set(updateData)
        .where(eq(afterSalesTasks.id, taskId))
        .returning();

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      return {
        success: true,
        task,
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 更新任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: string, status: AfterSalesTaskStatus, note?: string): Promise<boolean> {
    try {
      const updateData: Partial<AfterSalesTask> = {
        status,
        updatedAt: new Date().toISOString(),
      };

      if (status === AfterSalesTaskStatus.COMPLETED) {
        updateData.completedAt = new Date().toISOString();
        updateData.completionNote = note;
      }

      await db
        .update(afterSalesTasks)
        .set(updateData)
        .where(eq(afterSalesTasks.id, taskId));

      console.log('[AfterSalesTaskService] 更新任务状态成功:', taskId, status);
      return true;
    } catch (error) {
      console.error('[AfterSalesTaskService] 更新任务状态失败:', error);
      return false;
    }
  }

  /**
   * 更新任务优先级
   */
  async updateTaskPriority(taskId: string, priority: AfterSalesTaskPriority): Promise<boolean> {
    try {
      await db
        .update(afterSalesTasks)
        .set({
          priority,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(afterSalesTasks.id, taskId));

      console.log('[AfterSalesTaskService] 更新任务优先级成功:', taskId, priority);
      return true;
    } catch (error) {
      console.error('[AfterSalesTaskService] 更新任务优先级失败:', error);
      return false;
    }
  }

  /**
   * 分配任务给工作人员
   */
  async assignTask(taskId: string, staffUserId: string): Promise<{
    success: boolean;
    task?: AfterSalesTask;
    error?: string;
  }> {
    try {
      const [task] = await db
        .update(afterSalesTasks)
        .set({
          assignedTo: staffUserId,
          assignedAt: new Date().toISOString(),
          status: AfterSalesTaskStatus.PROCESSING,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(afterSalesTasks.id, taskId))
        .returning();

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      console.log('[AfterSalesTaskService] 分配任务成功:', taskId, staffUserId);
      return {
        success: true,
        task,
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 分配任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string, reason?: string): Promise<{
    success: boolean;
    task?: AfterSalesTask;
    error?: string;
  }> {
    try {
      const [task] = await db
        .update(afterSalesTasks)
        .set({
          status: AfterSalesTaskStatus.CANCELLED,
          completionNote: reason,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(afterSalesTasks.id, taskId))
        .returning();

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      console.log('[AfterSalesTaskService] 取消任务成功:', taskId);
      return {
        success: true,
        task,
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 取消任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  /**
   * 完成任务
   */
  async completeTask(
    taskId: string,
    completedBy: string,
    completionNote?: string
  ): Promise<{
    success: boolean;
    task?: AfterSalesTask;
    error?: string;
  }> {
    try {
      const [task] = await db
        .update(afterSalesTasks)
        .set({
          status: AfterSalesTaskStatus.COMPLETED,
          completedBy,
          completedAt: new Date().toISOString(),
          completionNote,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(afterSalesTasks.id, taskId))
        .returning();

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      console.log('[AfterSalesTaskService] 完成任务成功:', taskId);
      return {
        success: true,
        task,
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 完成任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  /**
   * 升级任务优先级
   */
  async escalateTask(
    taskId: string,
    priority: TaskPriority,
    escalationReason?: string
  ): Promise<{
    success: boolean;
    task?: AfterSalesTask;
    error?: string;
  }> {
    try {
      const [task] = await db
        .update(afterSalesTasks)
        .set({
          priority,
          escalationReason,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(afterSalesTasks.id, taskId))
        .returning();

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      console.log('[AfterSalesTaskService] 升级任务成功:', taskId, priority);
      return {
        success: true,
        task,
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 升级任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await db
        .delete(afterSalesTasks)
        .where(eq(afterSalesTasks.id, taskId));

      console.log('[AfterSalesTaskService] 删除任务成功:', taskId);
      return {
        success: true,
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 删除任务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  /**
   * 获取任务列表
   */
  async getTasks(filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    staffUserId?: string;
    sessionId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    success: boolean;
    tasks?: AfterSalesTask[];
    total?: number;
    error?: string;
  }> {
    try {
      const conditions: Array<any> = [];

      if (filters?.status) {
        const statusMapping: Record<TaskStatus, AfterSalesTaskStatus> = {
          'pending': AfterSalesTaskStatus.PENDING,
          'in_progress': AfterSalesTaskStatus.PROCESSING,
          'waiting_response': AfterSalesTaskStatus.WAITING_USER,
          'completed': AfterSalesTaskStatus.COMPLETED,
          'cancelled': AfterSalesTaskStatus.CANCELLED,
        };
        conditions.push(eq(afterSalesTasks.status, statusMapping[filters.status]));
      }

      if (filters?.priority) {
        conditions.push(eq(afterSalesTasks.priority, filters.priority));
      }

      if (filters?.staffUserId) {
        conditions.push(eq(afterSalesTasks.staffUserId, filters.staffUserId));
      }

      if (filters?.sessionId) {
        conditions.push(eq(afterSalesTasks.sessionId, filters.sessionId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // 获取总数
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(afterSalesTasks)
        .where(whereClause);

      // 获取列表
      const tasks = await db
        .select()
        .from(afterSalesTasks)
        .where(whereClause)
        .orderBy(afterSalesTasks.createdAt)
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0);

      return {
        success: true,
        tasks,
        total: Number(countResult?.count || 0),
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 获取任务列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      };
    }
  }

  /**
   * 获取任务统计
   */
  async getTaskStats(): Promise<{
    total: number;
    pending: number;
    waitingStaff: number;
    waitingUser: number;
    processing: number;
    completed: number;
    cancelled: number;
  }> {
    try {
      const [result] = await db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`count(*) FILTER (WHERE ${afterSalesTasks.status} = ${AfterSalesTaskStatus.PENDING})`,
          waitingStaff: sql<number>`count(*) FILTER (WHERE ${afterSalesTasks.status} = ${AfterSalesTaskStatus.WAITING_STAFF})`,
          waitingUser: sql<number>`count(*) FILTER (WHERE ${afterSalesTasks.status} = ${AfterSalesTaskStatus.WAITING_USER})`,
          processing: sql<number>`count(*) FILTER (WHERE ${afterSalesTasks.status} = ${AfterSalesTaskStatus.PROCESSING})`,
          completed: sql<number>`count(*) FILTER (WHERE ${afterSalesTasks.status} = ${AfterSalesTaskStatus.COMPLETED})`,
          cancelled: sql<number>`count(*) FILTER (WHERE ${afterSalesTasks.status} = ${AfterSalesTaskStatus.CANCELLED})`,
        })
        .from(afterSalesTasks);

      return {
        total: Number(result.total),
        pending: Number(result.pending),
        waitingStaff: Number(result.waitingStaff),
        waitingUser: Number(result.waitingUser),
        processing: Number(result.processing),
        completed: Number(result.completed),
        cancelled: Number(result.cancelled),
      };
    } catch (error) {
      console.error('[AfterSalesTaskService] 获取任务统计失败:', error);
      return {
        total: 0,
        pending: 0,
        waitingStaff: 0,
        waitingUser: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
      };
    }
  }
}

// 导出单例
export const afterSalesTaskService = new AfterSalesTaskService();
