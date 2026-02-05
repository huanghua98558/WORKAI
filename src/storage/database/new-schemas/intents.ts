import { pgTable, varchar, text, timestamp, integer, decimal, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 意图表
export const intents = pgTable(
  "intents",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // 基本信息
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    intentType: varchar("intent_type", { length: 50 }).notNull(), // user, system, custom
    
    // 意图配置
    keywords: jsonb("keywords").default("[]"), // 关键词列表
    examples: jsonb("examples").default("[]"), // 示例句
    priority: integer("priority").default(0), // 优先级
    
    // AI配置
    aiModel: varchar("ai_model", { length: 100 }),
    embeddingModel: varchar("embedding_model", { length: 100 }),
    
    // 统计
    totalMessages: integer("total_messages").default(0),
    confidenceThreshold: decimal("confidence_threshold", { precision: 3, scale: 2 }).default("0.7"), // 置信度阈值
    
    // 状态
    status: varchar("status", { length: 20 }).default("active"), // active, disabled
    
    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    intentTypeIdx: index("intents_intent_type_idx").on(table.intentType),
    statusIdx: index("intents_status_idx").on(table.status),
    priorityIdx: index("intents_priority_idx").on(table.priority),
  })
);

// TypeScript types
export type Intent = typeof intents.$inferSelect;
export type NewIntent = typeof intents.$inferInsert;
