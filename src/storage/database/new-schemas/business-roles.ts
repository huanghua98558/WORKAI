import { pgTable, varchar, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * 业务角色表
 * 定义机器人的业务定位和行为规则
 */
export const businessRoles = pgTable(
  "business_roles",
  {
    // 主键
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // 基本信息
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(), // community_ops, conversion_staff, after_sales
    description: text("description"),

    // 行为规则
    aiBehavior: varchar("ai_behavior", { length: 20 }).notNull().default("semi_auto"), // full_auto, semi_auto, record_only
    staffEnabled: boolean("staff_enabled").notNull().default(true),
    staffTypeFilter: jsonb("staff_type_filter").default("[]"), // 识别的工作人员类型列表，如 ["community_ops"]
    keywords: jsonb("keywords").default("[]"), // 关键词数组，如 ["需要你", "配合", "扫脸"]

    // 任务配置
    defaultTaskPriority: varchar("default_task_priority", { length: 20 }).default("normal"), // low, normal, high
    enableTaskCreation: boolean("enable_task_creation").notNull().default(false),

    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeIdx: index("business_roles_code_idx").on(table.code),
    aiBehaviorIdx: index("business_roles_ai_behavior_idx").on(table.aiBehavior),
  })
);

// TypeScript types
export type BusinessRole = typeof businessRoles.$inferSelect;
export type NewBusinessRole = typeof businessRoles.$inferInsert;

// AI 行为类型
export type AIBehavior = 'full_auto' | 'semi_auto' | 'record_only';

// 任务优先级类型
export type TaskPriority = 'low' | 'normal' | 'high';

// 业务角色编码类型
export type BusinessRoleCode = 'community_ops' | 'conversion_staff' | 'after_sales';
