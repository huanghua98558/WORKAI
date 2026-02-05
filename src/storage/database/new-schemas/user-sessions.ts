import { pgTable, varchar, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { robots } from './robots';

// 用户会话表
// 用于记录用户的长期会话（双层会话架构）
export const userSessions = pgTable(
  "user_sessions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // 用户标识
    userId: varchar("user_id", { length: 100 })
      .notNull()
      .unique(),
    robotId: varchar("robot_id", { length: 36 })
      .notNull()
      .references(() => robots.id, { onDelete: "cascade" }),

    // 状态
    status: varchar("status", { length: 20 })
      .notNull()
      .default("active"), // active, archived

    // 时间信息
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),

    // 统计数据
    totalMessageCount: integer("total_message_count").notNull().default(0),
    totalServiceCount: integer("total_service_count").notNull().default(0),

    // 关联的服务会话
    firstServiceSessionId: varchar("first_service_session_id", { length: 36 }),
    lastServiceSessionId: varchar("last_service_session_id", { length: 36 }),

    // 元数据
    metadata: jsonb("metadata").default("{}"),
  },
  (table) => ({
    userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
    robotIdIdx: index("user_sessions_robot_id_idx").on(table.robotId),
    statusIdx: index("user_sessions_status_idx").on(table.status),
    createdAtIdx: index("user_sessions_created_at_idx").on(table.createdAt),
    lastMessageAtIdx: index("user_sessions_last_message_at_idx").on(table.lastMessageAt),
  })
);

// TypeScript types
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
