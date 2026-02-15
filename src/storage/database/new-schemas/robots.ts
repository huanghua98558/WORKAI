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
    
    // API Key 验证字段
    robotId: varchar("robot_id", { length: 64 }).unique(), // WorkTool Robot ID
    apiKeyHash: varchar("api_key_hash", { length: 64 }), // API Key 哈希值（SHA256）
    apiKeyGeneratedAt: timestamp("api_key_generated_at", { withTimezone: true }), // API Key 生成时间
    deviceToken: varchar("device_token", { length: 32 }), // 设备绑定 Token
    deviceBoundAt: timestamp("device_bound_at", { withTimezone: true }), // 设备绑定时间
    lastWsConnectionAt: timestamp("last_ws_connection_at", { withTimezone: true }), // 最后 WebSocket 连接时间
    wsConnectionCount: integer("ws_connection_count").default(0), // WebSocket 连接次数
    isActive: boolean("is_active").default(true), // 是否激活
    isValid: boolean("is_valid").default(true), // 是否有效
    expiresAt: timestamp("expires_at", { withTimezone: true }), // 到期时间
    
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
    robotIdIdx: index("robots_robot_id_idx").on(table.robotId),
    apiKeyHashIdx: index("robots_api_key_hash_idx").on(table.apiKeyHash),
  })
);

// TypeScript types
export type Robot = typeof robots.$inferSelect;
export type NewRobot = typeof robots.$inferInsert;
