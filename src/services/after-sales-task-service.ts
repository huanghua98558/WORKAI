import { db } from '../storage/database';
import { afterSalesTasks, NewAfterSalesTask } from '../storage/database/new-schemas/after-sales-tasks';
import { eq, and, gte, lt, sql } from 'drizzle-orm';

/**
 * 售后任务状态枚举
 */
export enum AfterSalesTaskStatus {
  PENDING = 'pending',              // 待处理
  WAITING_STAFF = 'waiting_staff',   // 等待售后人员
  WAITING_USER = 'waiting_user',     // 等待用户确认
  PROCESSING = 'processing',         // 处理中
  COMPLETED = 'completed',           // 已完成
  CANCELLED = 'cancelled',           // 已取消
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
 * 售后任务类型枚举
 */
export enum AfterSalesTaskType {
  GENERAL = 'general',
  COMPLAINT = 'complaint',
  REFUND = 'refund',
  TECHNICAL = 'technical',
  INQUIRY = 'inquiry',
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
 * 售后任务状态类型（用于API）
 */
export type TaskStatus = 'pending' | 'waiting_staff' | 'waiting_user' | 'processing' | 'completed' | 'cancelled';

/**
 * 售后任务优先级类型（用于API）
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

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
          createdAt: new Date(),
          updatedAt: new Date(),
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
  async getTaskById(taskId: string): Promise<AfterSalesTask | null> {
    try {
      const [task] = await db
        .select()
        .from(afterSalesTasks)
        .where(eq(afterSalesTasks.id, taskId))
        .limit(1);

      return task || null;
    } catch (error) {
      console.error('[AfterSalesTaskService] 获取任务失败:', error);
      return null;
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
      let newReminderLevel = task.timeoutReminderLevel;

      // 检查是否需要升级提醒级别
      if (hoursSinceCreation >= 24 && task.timeoutReminderLevel < TimeoutReminderLevel.LEVEL_3) {
        newReminderLevel = TimeoutReminderLevel.LEVEL_3;
        // 24小时超时，升级为高优先级
        await this.updateTaskPriority(task.id, AfterSalesTaskPriority.URGENT);
        escalated++;
      } else if (hoursSinceCreation >= 12 && task.timeoutReminderLevel < TimeoutReminderLevel.LEVEL_2) {
        newReminderLevel = TimeoutReminderLevel.LEVEL_2;
        reminded++;
      } else if (hoursSinceCreation >= 6 && task.timeoutReminderLevel < TimeoutReminderLevel.LEVEL_1) {
        newReminderLevel = TimeoutReminderLevel.LEVEL_1;
        reminded++;
      }

      if (newReminderLevel !== task.timeoutReminderLevel) {
        await db
          .update(afterSalesTasks)
          .set({
            timeoutReminderLevel: newReminderLevel,
            lastReminderSentAt: new Date(),
          })
          .where(eq(afterSalesTasks.id, task.id));
      }
    }

    return { reminded, escalated };
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: string, status: AfterSalesTaskStatus, note?: string): Promise<boolean> {
    try {
      const updateData: Partial<AfterSalesTask> = {
        status,
        updatedAt: new Date(),
      };

      if (status === AfterSalesTaskStatus.COMPLETED) {
        updateData.completedAt = new Date();
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
          updatedAt: new Date(),
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
  async assignTask(taskId: string, staffUserId: string): Promise<boolean> {
    try {
      await db
        .update(afterSalesTasks)
        .set({
          assignedTo: staffUserId,
          assignedAt: new Date(),
          status: AfterSalesTaskStatus.PROCESSING,
          updatedAt: new Date(),
        })
        .where(eq(afterSalesTasks.id, taskId));

      console.log('[AfterSalesTaskService] 分配任务成功:', taskId, staffUserId);
      return true;
    } catch (error) {
      console.error('[AfterSalesTaskService] 分配任务失败:', error);
      return false;
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string, reason?: string): Promise<boolean> {
    try {
      await db
        .update(afterSalesTasks)
        .set({
          status: AfterSalesTaskStatus.CANCELLED,
          completionNote: reason,
          updatedAt: new Date(),
        })
        .where(eq(afterSalesTasks.id, taskId));

      console.log('[AfterSalesTaskService] 取消任务成功:', taskId);
      return true;
    } catch (error) {
      console.error('[AfterSalesTaskService] 取消任务失败:', error);
      return false;
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
