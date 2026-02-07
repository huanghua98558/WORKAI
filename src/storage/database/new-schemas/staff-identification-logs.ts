import { pgTable, index, varchar, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

/**
 * 工作人员识别日志表
 * 用于记录工作人员识别过程、识别结果和识别方法
 */
export const staffIdentificationLogs = pgTable("staff_identification_logs", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	messageId: varchar("message_id", { length: 255 }).notNull(),
	senderUserId: varchar("sender_user_id", { length: 255 }),
	senderName: varchar("sender_name", { length: 255 }),
	isIdentifiedAsStaff: boolean("is_identified_as_staff").notNull(),
	staffType: varchar("staff_type", { length: 50 }), // management, community, after_sales, conversion
	confidence: integer(), // 识别置信度 0-100
	identificationMethod: varchar("identification_method", { length: 50 }), // whitelist, keyword, pattern, ai, manual_override
	matchedKeywords: text("matched_keywords"),
	matchedPattern: varchar("matched_pattern", { length: 255 }),
	manualOverrideBy: varchar("manual_override_by", { length: 36 }),
	manualOverrideReason: text("manual_override_reason"),
	originalIdentification: jsonb("original_identification"), // 覆盖前的识别信息
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_staff_identification_logs_session_id").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_staff_identification_logs_message_id").using("btree", table.messageId.asc().nullsLast().op("text_ops")),
	index("idx_staff_identification_logs_sender_user_id").using("btree", table.senderUserId.asc().nullsLast().op("text_ops")),
	index("idx_staff_identification_logs_is_identified_as_staff").using("btree", table.isIdentifiedAsStaff.asc().nullsLast().op("bool_ops")),
	index("idx_staff_identification_logs_staff_type").using("btree", table.staffType.asc().nullsLast().op("text_ops")),
	index("idx_staff_identification_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

export type StaffIdentificationLog = typeof staffIdentificationLogs.$inferSelect;
export type NewStaffIdentificationLog = typeof staffIdentificationLogs.$inferInsert;
