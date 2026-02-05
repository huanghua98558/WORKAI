import { pgTable, varchar, timestamp, integer, decimal, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { robots } from './robots';
import { staff } from './staff';

// 会话表
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // 机器人关联
    robotId: varchar("robot_id", { length: 36 })
      .notNull()
      .references(() => robots.id, { onDelete: "cascade" }),
    
    // 用户信息
    userId: varchar("user_id", { length: 100 }).notNull(),
    userName: varchar("user_name", { length: 200 }),
    userAvatarUrl: varchar("user_avatar_url", { length: 500 }),
    userSource: varchar("user_source", { length: 50 }), // wechat, telegram, discord等
    
    // 会话状态
    status: varchar("status", { length: 20 }).default("active"), // active, ended, transferred, archived
    sessionType: varchar("session_type", { length: 20 }).default("private"), // private, group
    
    // 统计数据
    messageCount: integer("message_count").default(0),
    userMessageCount: integer("user_message_count").default(0),
    staffMessageCount: integer("staff_message_count").default(0),
    aiMessageCount: integer("ai_message_count").default(0),
    
    // 介入信息
    staffIntervened: boolean("staff_intervened").default(false),
    staffId: varchar("staff_id", { length: 36 }).references(() => staff.id),
    staffInterventionCount: integer("staff_intervention_count").default(0),
    firstInterventionAt: timestamp("first_intervention_at", { withTimezone: true }),
    
    // 满意度
    satisfactionScore: integer("satisfaction_score"), // 1-5分
    satisfactionReason: varchar("satisfaction_reason", { length: 1000 }),
    satisfactionInferredAt: timestamp("satisfaction_inferred_at", { withTimezone: true }),
    satisfactionInferredScore: decimal("satisfaction_inferred_score", { precision: 3, scale: 2 }), // 推断的满意度 0-1
    
    // 问题信息
    issueCategory: varchar("issue_category", { length: 100 }),
    issueSubcategory: varchar("issue_subcategory", { length: 100 }),
    issueResolved: boolean("issue_resolved").default(false),
    
    // 时间信息
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"), // 会话时长（秒）
    
    // 元数据
    metadata: jsonb("metadata").default("{}"),
  },
  (table) => ({
    robotIdIdx: index("sessions_robot_id_idx").on(table.robotId),
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    statusIdx: index("sessions_status_idx").on(table.status),
    startedAtIdx: index("sessions_started_at_idx").on(table.startedAt),
    lastMessageAtIdx: index("sessions_last_message_at_idx").on(table.lastMessageAt),
    staffIntervenedIdx: index("sessions_staff_intervened_idx").on(table.staffIntervened),
    staffIdIdx: index("sessions_staff_id_idx").on(table.staffId),
  })
);

// TypeScript types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
