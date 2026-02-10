/**
 * Robot AI Config Schema
 * 机器人 AI 配置表的 Drizzle ORM 定义
 */

const { pgTable, varchar, text, numeric, boolean, integer, jsonb, timestamp, index } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// 机器人AI配置表
exports.robotAIConfigs = pgTable(
  "robot_ai_configs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    robotId: varchar("robot_id", { length: 255 }).notNull().unique(),
    robotName: varchar("robot_name", { length: 255 }).notNull(),

    // 意图识别配置
    intentModelId: varchar("intent_model_id", { length: 36 }),
    intentSystemPrompt: text("intent_system_prompt"),
    intentTemperature: numeric("intent_temperature", { precision: 5, scale: 2 }).default(0.5),
    intentConfidenceThreshold: numeric("intent_confidence_threshold", { precision: 5, scale: 2 }).default(0.6),

    // 情感分析配置
    sentimentModelId: varchar("sentiment_model_id", { length: 36 }),
    sentimentSystemPrompt: text("sentiment_system_prompt"),
    sentimentTemperature: numeric("sentiment_temperature", { precision: 5, scale: 2 }).default(0.3),

    // 通用配置
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(10),

    // 元数据
    metadata: jsonb("metadata").default('{}'),
    description: text("description"),

    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    robotIdIdx: index("robot_ai_configs_robot_id_idx").on(table.robotId),
    intentModelIdIdx: index("robot_ai_configs_intent_model_id_idx").on(table.intentModelId),
    sentimentModelIdIdx: index("robot_ai_configs_sentiment_model_id_idx").on(table.sentimentModelId),
    enabledIdx: index("robot_ai_configs_enabled_idx").on(table.enabled),
  })
);

// 机器人AI分析历史表
exports.robotAIAnalysisHistory = pgTable(
  "robot_ai_analysis_history",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    robotId: varchar("robot_id", { length: 255 }).notNull(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    messageId: varchar("message_id", { length: 255 }).notNull(),

    // 分析结果
    intent: varchar("intent", { length: 100 }),
    intentConfidence: numeric("intent_confidence", { precision: 5, scale: 2 }),
    sentiment: varchar("sentiment", { length: 50 }),
    sentimentScore: numeric("sentiment_score", { precision: 5, scale: 2 }),

    // 上下文信息
    contextType: varchar("context_type", { length: 50 }),
    contextCount: integer("context_count").default(0),
    userSatisfaction: numeric("user_satisfaction", { precision: 5, scale: 2 }),
    hasPendingTask: boolean("has_pending_task").default(false),

    // 决策信息
    hasActionSuggestion: boolean("has_action_suggestion").default(false),
    shouldTriggerAlert: boolean("should_trigger_alert").default(false),
    suggestedActions: jsonb("suggested_actions").default('[]'),

    // AI模型信息
    intentModelId: varchar("intent_model_id", { length: 36 }),
    sentimentModelId: varchar("sentiment_model_id", { length: 36 }),

    // 时间信息
    analysisTime: timestamp("analysis_time", { withTimezone: true }).defaultNow().notNull(),
    analysisDuration: integer("analysis_duration"),
  },
  (table) => ({
    robotIdIdx: index("robot_ai_analysis_history_robot_id_idx").on(table.robotId),
    sessionIdIdx: index("robot_ai_analysis_history_session_id_idx").on(table.sessionId),
    messageIdIdx: index("robot_ai_analysis_history_message_id_idx").on(table.messageId),
    intentIdx: index("robot_ai_analysis_history_intent_idx").on(table.intent),
    sentimentIdx: index("robot_ai_analysis_history_sentiment_idx").on(table.sentiment),
    shouldTriggerAlertIdx: index("robot_ai_analysis_history_should_trigger_alert_idx").on(table.shouldTriggerAlert),
    analysisTimeIdx: index("robot_ai_analysis_history_analysis_time_idx").on(table.analysisTime),
  })
);
