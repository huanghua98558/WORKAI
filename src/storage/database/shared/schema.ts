import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 用户表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 255 }).unique(),
    password: text("password").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("admin"), // admin, operator
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    emailIdx: index("users_email_idx").on(table.email),
  })
);

// 系统设置表
export const systemSettings = pgTable(
  "system_settings",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: varchar("key", { length: 128 }).notNull().unique(),
    value: text("value").notNull(),
    category: varchar("category", { length: 64 }), // ai, alert, monitor, callback, etc.
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAtBy: varchar("updated_at_by", { length: 36 }), // userId
  },
  (table) => ({
    keyIdx: index("system_settings_key_idx").on(table.key),
    categoryIdx: index("system_settings_category_idx").on(table.category),
  })
);

// 使用 createSchemaFactory 配置 date coercion
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Zod schemas for validation
export const insertUserSchema = createCoercedInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
  isActive: true,
});

export const updateUserSchema = createCoercedInsertSchema(users)
  .pick({
    username: true,
    email: true,
    password: true,
    role: true,
    isActive: true,
    lastLoginAt: true,
  })
  .partial();

export const insertSystemSettingSchema = createCoercedInsertSchema(systemSettings).pick({
  key: true,
  value: true,
  category: true,
  description: true,
  updatedAtBy: true,
});

export const updateSystemSettingSchema = createCoercedInsertSchema(systemSettings)
  .pick({
    value: true,
    description: true,
    updatedAtBy: true,
  })
  .partial();

// 风险消息表
export const riskMessages = pgTable(
  "risk_messages",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    messageId: varchar("message_id", { length: 36 }).notNull().unique(),
    sessionId: varchar("session_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 100 }),
    userName: varchar("user_name", { length: 100 }),
    groupName: varchar("group_name", { length: 200 }),
    content: text("content").notNull(),
    aiReply: text("ai_reply"),
    status: varchar("status", { length: 20 }).notNull().default("processing"), // 'processing' | 'resolved' | 'escalated'
    resolvedBy: varchar("resolved_by", { length: 100 }), // 'AI' or userId
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    handledByStaff: jsonb("handled_by_staff"), // string[]: 处理过的工作人员列表
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdIdx: index("risk_messages_session_id_idx").on(table.sessionId),
    statusIdx: index("risk_messages_status_idx").on(table.status),
    createdAtIdx: index("risk_messages_created_at_idx").on(table.createdAt),
  })
);

// 风险处理记录表
export const riskHandlingLogs = pgTable(
  "risk_handling_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    riskId: varchar("risk_id", { length: 36 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(), // 'ai_reply' | 'staff_reply' | 'manual_intervention' | 'auto_resolved' | 'notification_sent'
    actor: varchar("actor", { length: 100 }).notNull(), // 'AI' or userId
    content: text("content"),
    metadata: jsonb("metadata"), // 额外的元数据
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    riskIdIdx: index("risk_handling_logs_risk_id_idx").on(table.riskId),
    actionIdx: index("risk_handling_logs_action_idx").on(table.action),
    createdAtIdx: index("risk_handling_logs_created_at_idx").on(table.createdAt),
  })
);

// Zod schemas for risk tables
export const insertRiskMessageSchema = createCoercedInsertSchema(riskMessages).pick({
  messageId: true,
  sessionId: true,
  userId: true,
  userName: true,
  groupName: true,
  content: true,
  aiReply: true,
  status: true,
});

export const updateRiskMessageSchema = createCoercedInsertSchema(riskMessages)
  .pick({
    aiReply: true,
    status: true,
    resolvedBy: true,
    resolvedAt: true,
    handledByStaff: true,
  })
  .partial();

export const insertRiskHandlingLogSchema = createCoercedInsertSchema(riskHandlingLogs).pick({
  riskId: true,
  action: true,
  actor: true,
  content: true,
  metadata: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type UpdateSystemSetting = z.infer<typeof updateSystemSettingSchema>;

export type RiskMessage = typeof riskMessages.$inferSelect;
export type InsertRiskMessage = z.infer<typeof insertRiskMessageSchema>;
export type UpdateRiskMessage = z.infer<typeof updateRiskMessageSchema>;

export type RiskHandlingLog = typeof riskHandlingLogs.$inferSelect;
export type InsertRiskHandlingLog = z.infer<typeof insertRiskHandlingLogSchema>;




