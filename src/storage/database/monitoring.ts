import { pgTable, varchar, text, timestamp, integer, jsonb, index, doublePrecision } from 'drizzle-orm/pg-core';

/**
 * 执行追踪表
 * 用于监控消息处理的执行状态
 */
export const executionTracking = pgTable('execution_tracking', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  processingId: varchar('processing_id', { length: 255 }).notNull(),
  robotId: varchar('robot_id', { length: 255 }),
  robotName: varchar('robot_name', { length: 255 }),
  messageId: varchar('message_id', { length: 255 }),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }),
  groupId: varchar('group_id', { length: 255 }),
  status: varchar({ length: 50 }).notNull(),
  steps: jsonb(),
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  processingTime: integer('processing_time'),
  decision: jsonb(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('execution_tracking_session_id_idx').on(table.sessionId),
  index('execution_tracking_created_at_idx').on(table.createdAt),
  index('execution_tracking_status_idx').on(table.status),
]);

/**
 * AI IO日志表
 * 用于记录AI的输入输出
 */
export const aiIoLogs = pgTable('ai_io_logs', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: varchar('session_id', { length: 255 }),
  messageId: varchar('message_id', { length: 255 }),
  robotId: varchar('robot_id', { length: 255 }),
  robotName: varchar('robot_name', { length: 255 }),
  operationType: varchar('operation_type', { length: 100 }),
  aiInput: text('ai_input'),
  aiOutput: text('ai_output'),
  modelId: varchar('model_id', { length: 100 }),
  temperature: doublePrecision(),
  requestDuration: integer('request_duration'),
  status: varchar({ length: 50 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
}, (table) => [
  index('ai_io_logs_session_id_idx').on(table.sessionId),
  index('ai_io_logs_created_at_idx').on(table.createdAt),
]);
