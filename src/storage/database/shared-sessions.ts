import { pgTable, varchar, timestamp, integer, jsonb, doublePrecision, boolean, index, sql } from 'drizzle-orm/pg-core';

/**
 * 会话表（shared schema）
 * 匹配数据库中的实际结构
 */
export const sharedSessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }),
  groupId: varchar('group_id', { length: 255 }),
  userName: varchar('user_name', { length: 255 }),
  groupName: varchar('group_name', { length: 255 }),
  roomType: integer('room_type'),
  status: varchar({ length: 50 }).default('auto'),
  context: jsonb().default([]),
  messageCount: integer('message_count').default(0),
  lastIntent: varchar('last_intent', { length: 100 }),
  intentConfidence: doublePrecision('intent_confidence'),
  lastProcessedAt: timestamp('last_processed_at', { mode: 'string' }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  robotId: varchar('robot_id', { length: 255 }),
  robotName: varchar('robot_name', { length: 255 }),
  userSessionId: varchar('user_session_id', { length: 36 }),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
  endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
  durationSeconds: integer('duration_seconds'),
  satisfactionScore: integer('satisfaction_score'),
  satisfactionReason: varchar('satisfaction_reason', { length: 1000 }),
  issueCategory: varchar('issue_category', { length: 100 }),
  issueSubcategory: varchar('issue_subcategory', { length: 100 }),
  issueResolved: boolean('issue_resolved').default(false),
  staffId: varchar('staff_id', { length: 36 }),
  staffIntervened: boolean('staff_intervened').default(false),
  staffInterventionCount: integer('staff_intervention_count').default(0),
  firstInterventionAt: timestamp('first_intervention_at', { withTimezone: true, mode: 'string' }),
  sessionType: varchar('session_type', { length: 20 }).default('private'),
}, (table) => ({
  sessionIdIdx: index('idx_sessions_session_id').on(table.sessionId),
  userIdIdx: index('idx_sessions_user_id').on(table.userId),
  statusIdx: index('idx_sessions_status').on(table.status),
  lastMessageAtIdx: index('sessions_last_message_at_idx').on(table.lastMessageAt),
  robotIdIdx: index('sessions_robot_id_idx').on(table.robotId),
  staffIdIdx: index('sessions_staff_id_idx').on(table.staffId),
  uniqueSessionId: index('sessions_session_id_key').on(table.sessionId),
}));
