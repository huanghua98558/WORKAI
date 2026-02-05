import { pgTable, varchar, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 机器人表
export const robots = pgTable(
  "robots",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // 基本信息
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    robotType: varchar("robot_type", { length: 50 }).notNull(), // wechat, telegram, discord等
    
    // 配置
    config: jsonb("config").notNull().default("{}"), // 机器人配置
    
    // 回调配置
    callbackUrl: varchar("callback_url", { length: 1000 }).notNull(),
    callbackSecret: varchar("callback_secret", { length: 255 }),
    callbackEnabled: boolean("callback_enabled").default(true),
    
    // AI配置
    aiEnabled: boolean("ai_enabled").default(true),
    aiConfig: jsonb("ai_config").default("{}"), // AI配置
    
    // 状态
    status: varchar("status", { length: 20 }).default("active"), // active, disabled, error
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    
    // 统计
    totalMessages: integer("total_messages").default(0),
    totalSessions: integer("total_sessions").default(0),
    
    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusIdx: index("robots_status_idx").on(table.status),
    robotTypeIdx: index("robots_robot_type_idx").on(table.robotType),
    callbackEnabledIdx: index("robots_callback_enabled_idx").on(table.callbackEnabled),
  })
);

// TypeScript types
export type Robot = typeof robots.$inferSelect;
export type NewRobot = typeof robots.$inferInsert;
