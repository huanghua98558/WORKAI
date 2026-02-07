import { pgTable, varchar, text, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 业务角色表
export const businessRoles = pgTable(
  "business_roles",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // 基本信息
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),

    // AI 行为配置
    aiBehavior: varchar("ai_behavior", { length: 20 })
      .notNull()
      .default("semi_auto"), // full_auto, semi_auto, record_only

    // 工作人员识别配置
    staffEnabled: boolean("staff_enabled").notNull().default(true),
    staffTypeFilter: jsonb("staff_type_filter").$type<string[]>().default(sql`'[]'::jsonb`), // 过滤的工作人员类型

    // 关键词配置
    keywords: jsonb("keywords").$type<string[]>().default(sql`'[]'::jsonb`), // 触发关键词

    // 任务配置
    enableTaskCreation: boolean("enable_task_creation").notNull().default(false),
    defaultTaskPriority: varchar("default_task_priority", { length: 20 })
      .notNull()
      .default("normal"), // low, normal, high

    // 机器人关联
    robotId: varchar("robot_id", { length: 36 }), // 关联到机器人，可选

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
    robotIdIdx: index("business_roles_robot_id_idx").on(table.robotId),
    aiBehaviorIdx: index("business_roles_ai_behavior_idx").on(table.aiBehavior),
  })
);

// TypeScript types
export type BusinessRole = typeof businessRoles.$inferSelect;
export type NewBusinessRole = typeof businessRoles.$inferInsert;

// AI 行为模式
export type AIBehavior = 'full_auto' | 'semi_auto' | 'record_only';

// 任务优先级
export type TaskPriority = 'low' | 'normal' | 'high';
