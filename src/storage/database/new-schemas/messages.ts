import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { sessions } from './sessions';
import { robots } from './robots';
import { intents } from './intents';

// 消息表
export const messages = pgTable(
  "messages",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // 会话和机器人关联
    sessionId: varchar("session_id", { length: 36 })
      .notNull(),
    robotId: varchar("robot_id", { length: 36 })
      .notNull(),
    
    // 消息内容
    content: text("content").notNull(),
    contentType: varchar("content_type", { length: 20 }).default("text"), // text, image, audio, video, file
    
    // 发送者信息
    senderId: varchar("sender_id", { length: 100 }).notNull(),
    senderType: varchar("sender_type", { length: 20 }).notNull(), // user, staff, system, ai
    senderName: varchar("sender_name", { length: 200 }),
    
    // 消息类型
    messageType: varchar("message_type", { length: 20 }).default("message"), // message, system, notification
    
    // AI相关信息
    aiModel: varchar("ai_model", { length: 100 }),
    aiProvider: varchar("ai_provider", { length: 50 }), // doubao, openai
    aiResponseTime: integer("ai_response_time"), // 响应时间（毫秒）
    aiTokensUsed: integer("ai_tokens_used"),
    aiCost: decimal("ai_cost", { precision: 10, scale: 4 }),
    aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }), // AI置信度 0-1
    
    // 意图识别
    intentRef: varchar("intent_ref", { length: 36 }),
    intentConfidence: decimal("intent_confidence", { precision: 3, scale: 2 }),
    emotion: varchar("emotion", { length: 50 }), // positive, neutral, negative
    emotionScore: decimal("emotion_score", { precision: 3, scale: 2 }),
    
    // 元数据
    metadata: jsonb("metadata").default("{}"),
    
    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionIdIdx: index("messages_session_id_idx").on(table.sessionId),
    robotIdIdx: index("messages_robot_id_idx").on(table.robotId),
    senderIdIdx: index("messages_sender_id_idx").on(table.senderId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
    intentRefIdx: index("messages_intent_ref_idx").on(table.intentRef),
    senderTypeIdx: index("messages_sender_type_idx").on(table.senderType),
  })
);

// TypeScript types
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
