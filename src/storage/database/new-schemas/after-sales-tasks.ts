import { pgTable, index, varchar, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

/**
 * 售后任务表
 * 用于管理售后客服流程中的任务跟踪和状态管理
 */
export const afterSalesTasks = pgTable("after_sales_tasks", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	staffUserId: varchar("staff_user_id", { length: 255 }),
	staffName: varchar("staff_name", { length: 255 }),
	userId: varchar("user_id", { length: 255 }).notNull(),
	userName: varchar("user_name", { length: 255 }),
	taskType: varchar("task_type", { length: 50 }).default('general'), // general, complaint, refund, technical, inquiry
	priority: varchar("priority", { length: 20 }).default('normal'), // low, normal, high, urgent
	status: varchar("status", { length: 50 }).default('pending'), // pending, waiting_staff, waiting_user, processing, completed, cancelled
	title: varchar("title", { length: 255 }),
	description: text(),
	messageId: varchar("message_id", { length: 255 }),
	keyword: varchar("keyword", { length: 100 }),
	escalatedFrom: varchar("escalated_from", { length: 36 }), // 从哪个任务升级而来
	escalationReason: text("escalation_reason"),
	expectedResponseTime: timestamp("expected_response_time", { withTimezone: true, mode: 'string' }),
	timeoutReminderLevel: integer("timeout_reminder_level").default(0), // 0: 无提醒, 1: 6h, 2: 12h, 3: 24h
	lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true, mode: 'string' }),
	assignedTo: varchar("assigned_to", { length: 36 }),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	completedBy: varchar("completed_by", { length: 36 }),
	completionNote: text("completion_note"),
	metadata: jsonb("metadata").default({}),
}, (table) => [
	index("idx_after_sales_tasks_session_id").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_after_sales_tasks_staff_user_id").using("btree", table.staffUserId.asc().nullsLast().op("text_ops")),
	index("idx_after_sales_tasks_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_after_sales_tasks_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_after_sales_tasks_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_after_sales_tasks_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_after_sales_tasks_timeout_reminder").using("btree", table.timeoutReminderLevel.asc().nullsLast().op("int4_ops")),
]);

export type AfterSalesTask = typeof afterSalesTasks.$inferSelect;
export type NewAfterSalesTask = typeof afterSalesTasks.$inferInsert;
