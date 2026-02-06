import { eq, and, SQL, like, desc, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { robotCommands, robots } from "./shared/schema";

// TypeScript types
export type RobotCommand = typeof robotCommands.$inferSelect;
export type InsertRobotCommand = typeof robotCommands.$inferInsert;
export type Robot = typeof robots.$inferSelect;

export interface MessageHistoryFilter {
  robotId?: string;
  commandType?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

export interface MessageHistoryItem extends RobotCommand {
  robotName: string | null;
  robotNickname: string | null;
  robotCompany: string | null;
}

export class RobotCommandManager {
  /**
   * 获取消息发送历史（带分页和筛选）
   */
  async getMessageHistory(filters: MessageHistoryFilter = {}): Promise<{
    data: MessageHistoryItem[];
    total: number;
    stats: { status: string; count: string }[];
  }> {
    const {
      robotId,
      commandType,
      status,
      startTime,
      endTime,
      limit = 50,
      offset = 0,
    } = filters;

    const db = await getDb();

    // 构建查询条件
    const conditions: SQL[] = [];
    
    // 只查询消息类型的指令
    conditions.push(
      sql`(${robotCommands.commandType} IN ('send_group_message', 'send_private_message', 'send_message', 'batch_send_message'))`
    );

    if (robotId) {
      conditions.push(eq(robotCommands.robotId, robotId));
    }

    if (commandType) {
      conditions.push(eq(robotCommands.commandType, commandType));
    }

    if (status) {
      conditions.push(eq(robotCommands.status, status));
    }

    if (startTime) {
      conditions.push(sql`${robotCommands.createdAt} >= ${startTime}`);
    }

    if (endTime) {
      conditions.push(sql`${robotCommands.createdAt} <= ${endTime}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 查询数据（带机器人信息）
    const data = await db
      .select({
        // robotCommands 字段
        id: robotCommands.id,
        robotId: robotCommands.robotId,
        commandType: robotCommands.commandType,
        commandData: robotCommands.commandData,
        priority: robotCommands.priority,
        status: robotCommands.status,
        retryCount: robotCommands.retryCount,
        maxRetries: robotCommands.maxRetries,
        errorMessage: robotCommands.errorMessage,
        sentAt: robotCommands.sentAt,
        completedAt: robotCommands.completedAt,
        createdAt: robotCommands.createdAt,
        updatedAt: robotCommands.updatedAt,
        result: robotCommands.result,
        executedAt: robotCommands.executedAt,
        messageId: robotCommands.messageId,
        // robots 字段
        robotName: robots.name,
        robotNickname: robots.nickname,
        robotCompany: robots.company,
      })
      .from(robotCommands)
      .leftJoin(robots, eq(robotCommands.robotId, robots.robotId))
      .where(whereClause)
      .orderBy(desc(robotCommands.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(robotCommands)
      .where(whereClause);

    // 获取统计信息
    const stats = await db
      .select({
        status: robotCommands.status,
        count: sql<string>`count(*)`,
      })
      .from(robotCommands)
      .where(
        and(
          sql`(${robotCommands.commandType} IN ('send_group_message', 'send_private_message', 'send_message', 'batch_send_message'))`
        )
      )
      .groupBy(robotCommands.status);

    return {
      data: data as MessageHistoryItem[],
      total: parseInt(String(countResult[0]?.count ?? 0)),
      stats,
    };
  }

  /**
   * 根据 ID 获取指令
   */
  async getCommandById(id: string): Promise<RobotCommand | null> {
    const db = await getDb();
    const [command] = await db.select().from(robotCommands).where(eq(robotCommands.id, id));
    return command || null;
  }

  /**
   * 根据 commandId 获取指令
   */
  async getCommandByCommandId(commandId: string): Promise<RobotCommand | null> {
    const db = await getDb();
    const [command] = await db.select().from(robotCommands).where(eq(robotCommands.id, commandId));
    return command || null;
  }

  /**
   * 创建指令
   */
  async createCommand(data: InsertRobotCommand): Promise<RobotCommand> {
    const db = await getDb();
    const [command] = await db.insert(robotCommands).values(data).returning();
    return command;
  }

  /**
   * 更新指令状态
   */
  async updateCommandStatus(
    id: string,
    updates: {
      status?: string;
      result?: any;
      errorMessage?: string;
      executedAt?: Date | string | null;
      completedAt?: Date | string | null;
      retryCount?: number;
    }
  ): Promise<RobotCommand | null> {
    const db = await getDb();
    const [command] = await db
      .update(robotCommands)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(robotCommands.id, id))
      .returning();
    return command || null;
  }

  /**
   * 重试指令
   */
  async retryCommand(id: string): Promise<RobotCommand | null> {
    const db = await getDb();
    const [command] = await db
      .update(robotCommands)
      .set({
        status: 'pending',
        retryCount: sql`${robotCommands.retryCount} + 1`,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(robotCommands.id, id))
      .returning();
    return command || null;
  }

  /**
   * 删除指令
   */
  async deleteCommand(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(robotCommands).where(eq(robotCommands.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 获取待处理的指令列表
   */
  async getPendingCommands(robotId?: string): Promise<RobotCommand[]> {
    const db = await getDb();
    const conditions: SQL[] = [eq(robotCommands.status, 'pending')];
    
    if (robotId) {
      conditions.push(eq(robotCommands.robotId, robotId));
    }

    return db
      .select()
      .from(robotCommands)
      .where(and(...conditions))
      .orderBy(robotCommands.priority, robotCommands.createdAt);
  }

  /**
   * 获取最近的指令列表（用于"最近指令"显示）
   */
  async getRecentCommands(limit: number = 20): Promise<RobotCommand[]> {
    const db = await getDb();
    return db
      .select()
      .from(robotCommands)
      .orderBy(desc(robotCommands.createdAt))
      .limit(limit);
  }
}

export const robotCommandManager = new RobotCommandManager();
