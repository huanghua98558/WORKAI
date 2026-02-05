import { pgTable, varchar, timestamp, text, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { sessions } from './sessions';
import { staff } from './staff';

// 介入记录表
export const interventions = pgTable(
  "interventions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // 会话关联
    sessionId: varchar("session_id", { length: 36 })
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    
    // 工作人员信息
    staffId: varchar("staff_id", { length: 36 })
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    staffName: varchar("staff_name", { length: 200 }).notNull(),
    
    // 触发消息
    messageId: varchar("message_id", { length: 36 }), // 触发介入的消息ID
    
    // 介入信息
    interventionType: varchar("intervention_type", { length: 50 })
      .notNull()
      .default("manual"), // manual: 手动介入, automatic: 自动介入, escalation: 升级介入
    reason: text("reason"), // 介入原因
    
    // 介入内容
    interventionContent: text("intervention_content"), // 介入内容（工作人员的回复或操作）
    
    // 上下文信息
    messageSnapshot: jsonb("message_snapshot"), // 触发消息的快照
    sessionSnapshot: jsonb("session_snapshot"), // 会话状态快照
    
    // 状态
    status: varchar("status", { length: 20 })
      .notNull()
      .default("active"), // active: 活跃中, resolved: 已解决, closed: 已关闭, transferred: 已转移
    
    // 解决信息
    resolvedAt: timestamp("resolved_at", { withTimezone: true }), // 解决时间
    resolvedBy: varchar("resolved_by", { length: 36 }), // 解决者ID
    resolutionNote: text("resolution_note"), // 解决备注
    
    // 时间信息
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }), // 关闭时间
    durationSeconds: integer("duration_seconds"), // 介入时长（秒）
    
    // 元数据
    metadata: jsonb("metadata").default("{}"),
  },
  (table) => ({
    sessionIdIdx: index("interventions_session_id_idx").on(table.sessionId),
    staffIdIdx: index("interventions_staff_id_idx").on(table.staffId),
    statusIdx: index("interventions_status_idx").on(table.status),
    interventionTypeIdx: index("interventions_intervention_type_idx").on(table.interventionType),
    createdAtIdx: index("interventions_created_at_idx").on(table.createdAt),
    messageIdIdx: index("interventions_message_id_idx").on(table.messageId),
  })
);

// TypeScript types
export type Intervention = typeof interventions.$inferSelect;
export type NewIntervention = typeof interventions.$inferInsert;
