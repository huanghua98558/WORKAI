import { pgTable, varchar, text, timestamp, integer, decimal, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 工作人员表
export const staff = pgTable(
  "staff",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // 基本信息
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    phone: varchar("phone", { length: 50 }),
    
    // 权限
    role: varchar("role", { length: 50 }).default("staff"), // admin, manager, staff
    permissions: jsonb("permissions").default("[]"), // 权限列表
    
    // 工作状态
    status: varchar("status", { length: 20 }).default("offline"), // online, busy, offline
    statusMessage: varchar("status_message", { length: 500 }),
    
    // 工作负载
    currentSessions: integer("current_sessions").default(0),
    maxSessions: integer("max_sessions").default(10),
    
    // 工作时间
    workSchedule: jsonb("work_schedule").default("{}"), // 工作时间配置
    timezone: varchar("timezone", { length: 50 }).default("Asia/Shanghai"),
    
    // 统计
    totalInterventions: integer("total_interventions").default(0),
    totalMessages: integer("total_messages").default(0),
    avgResponseTime: integer("avg_response_time"), // 平均响应时间（秒）
    satisfactionRate: decimal("satisfaction_rate", { precision: 3, scale: 2 }), // 满意率 0-1
    
    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("staff_status_idx").on(table.status),
    roleIdx: index("staff_role_idx").on(table.role),
    emailIdx: index("staff_email_idx").on(table.email),
  })
);

// TypeScript types
export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
