import { pgTable, index, unique, varchar, text, timestamp, boolean, integer, jsonb, numeric, date, foreignKey, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const systemSettings = pgTable("system_settings", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	key: varchar({ length: 128 }).notNull(),
	value: text().notNull(),
	category: varchar({ length: 64 }),
	description: text(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAtBy: varchar("updated_at_by", { length: 36 }),
}, (table) => [
	index("system_settings_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("system_settings_key_idx").using("btree", table.key.asc().nullsLast().op("text_ops")),
	unique("system_settings_key_unique").on(table.key),
]);

export const users = pgTable("users", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	username: varchar({ length: 64 }).notNull(),
	email: varchar({ length: 255 }),
	password: text().notNull(),
	role: varchar({ length: 20 }).default('admin').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const alertRules = pgTable("alert_rules", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	intentType: varchar("intent_type", { length: 50 }).notNull(),
	ruleName: varchar("rule_name", { length: 255 }).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	alertLevel: varchar("alert_level", { length: 20 }).notNull(),
	threshold: integer().default(1),
	cooldownPeriod: integer("cooldown_period").default(300),
	messageTemplate: text("message_template"),
	keywords: text(),
	groupId: varchar("group_id", { length: 36 }),
	enableEscalation: boolean("enable_escalation").default(false),
	escalationLevel: integer("escalation_level").default(0),
	escalationThreshold: integer("escalation_threshold").default(3),
	escalationInterval: integer("escalation_interval").default(1800),
	escalationConfig: jsonb("escalation_config").default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_alert_rules_intent_type").using("btree", table.intentType.asc().nullsLast().op("text_ops")),
]);

export const intentConfigs = pgTable("intent_configs", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	intentType: varchar("intent_type", { length: 50 }).notNull(),
	intentName: varchar("intent_name", { length: 100 }).notNull(),
	intentDescription: text("intent_description"),
	systemPrompt: text("system_prompt").notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("intent_configs_intent_type_key").on(table.intentType),
]);

export const alertGroups = pgTable("alert_groups", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	groupName: varchar("group_name", { length: 255 }).notNull(),
	groupCode: varchar("group_code", { length: 50 }).notNull(),
	groupColor: varchar("group_color", { length: 7 }),
	description: text(),
	sortOrder: integer("sort_order").default(0),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_alert_groups_group_code").using("btree", table.groupCode.asc().nullsLast().op("text_ops")),
	unique("alert_groups_group_name_key").on(table.groupName),
	unique("alert_groups_group_code_key").on(table.groupCode),
]);

export const notificationMethods = pgTable("notification_methods", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	alertRuleId: varchar("alert_rule_id", { length: 36 }).notNull(),
	methodType: varchar("method_type", { length: 50 }).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	recipientConfig: jsonb("recipient_config"),
	messageTemplate: text("message_template"),
	priority: integer().default(10).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notification_methods_alert_rule_id").using("btree", table.alertRuleId.asc().nullsLast().op("text_ops")),
]);

export const alertHistory = pgTable("alert_history", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }),
	ruleRef: varchar("rule_ref", { length: 36 }).notNull(),
	intentType: varchar("intent_type", { length: 50 }).notNull(),
	alertLevel: varchar("alert_level", { length: 20 }).notNull(),
	groupRef: varchar("group_ref", { length: 255 }),
	groupName: varchar("group_name", { length: 255 }),
	alertGroupRef: varchar("alert_group_ref", { length: 36 }),
	userId: varchar("user_id", { length: 255 }),
	userName: varchar("user_name", { length: 255 }),
	groupChatId: varchar("group_chat_id", { length: 255 }),
	messageContent: text("message_content"),
	alertMessage: text("alert_message").notNull(),
	notificationStatus: varchar("notification_status", { length: 20 }).default('pending').notNull(),
	notificationResult: jsonb("notification_result"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	isHandled: boolean("is_handled").default(false).notNull(),
	handledBy: varchar("handled_by", { length: 36 }),
	handledAt: timestamp("handled_at", { withTimezone: true, mode: 'string' }),
	handledNote: text("handled_note"),
	escalationLevel: integer("escalation_level").default(0),
	escalationCount: integer("escalation_count").default(0),
	escalationHistory: jsonb("escalation_history").default([]),
	parentAlertId: varchar("parent_alert_id", { length: 36 }),
	batchId: varchar("batch_id", { length: 36 }),
	batchSize: integer("batch_size").default(1),
	robotId: varchar("robot_id", { length: 64 }),
	assignee: varchar({ length: 36 }),
	confidence: integer(),
	needReply: boolean("need_reply"),
	needHuman: boolean("need_human"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_alert_history_alert_level").using("btree", table.alertLevel.asc().nullsLast().op("text_ops")),
	index("idx_alert_history_rule_ref").using("btree", table.ruleRef.asc().nullsLast().op("text_ops")),
	index("idx_alert_history_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_alert_history_intent_type").using("btree", table.intentType.asc().nullsLast().op("text_ops")),
	index("idx_alert_history_session_id").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_alert_history_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const alertDedupRecords = pgTable("alert_dedup_records", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	alertHash: varchar("alert_hash", { length: 64 }).notNull(),
	alertLevel: varchar("alert_level", { length: 20 }).notNull(),
	intentType: varchar("intent_type", { length: 50 }),
	userId: varchar("user_id", { length: 255 }),
	groupChatId: varchar("group_chat_id", { length: 255 }),
	firstAlertId: varchar("first_alert_id", { length: 36 }),
	lastAlertId: varchar("last_alert_id", { length: 36 }),
	count: integer().default(1),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("alert_dedup_records_alert_hash_key").on(table.alertHash),
]);

export const systemLogs = pgTable("system_logs", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	level: varchar({ length: 20 }).notNull(),
	module: varchar({ length: 100 }).notNull(),
	message: text().notNull(),
	data: jsonb(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	environment: varchar({ length: 50 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("system_logs_level_idx").using("btree", table.level.asc().nullsLast().op("text_ops")),
	index("system_logs_module_idx").using("btree", table.module.asc().nullsLast().op("text_ops")),
	index("system_logs_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
]);

export const alertUpgrades = pgTable("alert_upgrades", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	originalAlertId: varchar("original_alert_id", { length: 36 }).notNull(),
	escalationLevel: integer("escalation_level").notNull(),
	escalatedAlertId: varchar("escalated_alert_id", { length: 36 }).notNull(),
	escalationRuleId: varchar("escalation_rule_id", { length: 36 }),
	escalationReason: text("escalation_reason"),
	escalatedAt: timestamp("escalated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const alertNotifications = pgTable("alert_notifications", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	alertId: varchar("alert_id", { length: 36 }).notNull(),
	notificationMethodId: varchar("notification_method_id", { length: 36 }),
	methodType: varchar("method_type", { length: 50 }).notNull(),
	recipientConfig: jsonb("recipient_config"),
	message: text(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const staffMessages = pgTable("staff_messages", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	messageId: varchar("message_id", { length: 255 }).notNull(),
	staffUserId: varchar("staff_user_id", { length: 255 }).notNull(),
	staffName: varchar("staff_name", { length: 255 }),
	content: text().notNull(),
	messageType: varchar("message_type", { length: 50 }).default('reply'),
	isHandlingCommand: boolean("is_handling_command").default(false),
	linkedRiskId: varchar("linked_risk_id", { length: 36 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	timestamp: timestamp({ mode: 'string' }),
}, (table) => [
	unique("staff_messages_message_id_key").on(table.messageId),
]);

export const staffActivities = pgTable("staff_activities", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	staffUserId: varchar("staff_user_id", { length: 255 }).notNull(),
	staffName: varchar("staff_name", { length: 255 }),
	activityType: varchar("activity_type", { length: 50 }).notNull(),
	activityDetail: text("activity_detail"),
	messageId: varchar("message_id", { length: 255 }),
	riskId: varchar("risk_id", { length: 36 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const sessionStaffStatus = pgTable("session_staff_status", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	hasStaffParticipated: boolean("has_staff_participated").default(false),
	currentStaffUserId: varchar("current_staff_user_id", { length: 255 }),
	staffJoinTime: timestamp("staff_join_time", { mode: 'string' }),
	staffLeaveTime: timestamp("staff_leave_time", { mode: 'string' }),
	staffMessageCount: integer("staff_message_count").default(0),
	lastStaffActivity: timestamp("last_staff_activity", { mode: 'string' }),
	collaborationMode: varchar("collaboration_mode", { length: 50 }).default('adaptive'),
	aiReplyStrategy: varchar("ai_reply_strategy", { length: 50 }).default('normal'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("session_staff_status_session_id_key").on(table.sessionId),
]);

export const infoDetectionHistory = pgTable("info_detection_history", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	messageId: varchar("message_id", { length: 255 }).notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	hasRisk: boolean("has_risk").default(false),
	riskLevel: varchar("risk_level", { length: 20 }),
	riskScore: numeric("risk_score", { precision: 3, scale:  2 }),
	satisfactionLevel: varchar("satisfaction_level", { length: 20 }),
	satisfactionScore: numeric("satisfaction_score", { precision: 3, scale:  2 }),
	sentiment: varchar({ length: 20 }),
	sentimentConfidence: numeric("sentiment_confidence", { precision: 3, scale:  2 }),
	urgencyLevel: varchar("urgency_level", { length: 20 }),
	urgencyScore: numeric("urgency_score", { precision: 3, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("info_detection_history_message_id_key").on(table.messageId),
]);

export const collaborationDecisionLogs = pgTable("collaboration_decision_logs", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	messageId: varchar("message_id", { length: 255 }),
	robotId: varchar("robot_id", { length: 255 }),
	shouldAiReply: boolean("should_ai_reply"),
	aiAction: varchar("ai_action", { length: 50 }),
	staffAction: varchar("staff_action", { length: 50 }),
	priority: varchar({ length: 20 }),
	reason: varchar({ length: 255 }),
	staffContext: text("staff_context"),
	infoContext: text("info_context"),
	strategy: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const alertRecipients = pgTable("alert_recipients", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	alertId: varchar("alert_id", { length: 36 }).notNull(),
	recipientType: varchar("recipient_type", { length: 50 }).notNull(),
	recipientId: varchar("recipient_id", { length: 255 }).notNull(),
	recipientName: varchar("recipient_name", { length: 255 }),
	notificationStatus: varchar("notification_status", { length: 20 }).default('pending').notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const alertBatchOperations = pgTable("alert_batch_operations", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	operationType: varchar("operation_type", { length: 50 }).notNull(),
	batchId: varchar("batch_id", { length: 36 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	totalCount: integer("total_count").default(0),
	successCount: integer("success_count").default(0),
	failureCount: integer("failure_count").default(0),
	errorMessage: text("error_message"),
	createdBy: varchar("created_by", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
});

export const alertStatsSnapshots = pgTable("alert_stats_snapshots", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	snapshotDate: date("snapshot_date").notNull(),
	totalCount: integer("total_count").default(0),
	pendingCount: integer("pending_count").default(0),
	handledCount: integer("handled_count").default(0),
	ignoredCount: integer("ignored_count").default(0),
	sentCount: integer("sent_count").default(0),
	criticalCount: integer("critical_count").default(0),
	warningCount: integer("warning_count").default(0),
	infoCount: integer("info_count").default(0),
	escalatedCount: integer("escalated_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("alert_stats_snapshots_snapshot_date_key").on(table.snapshotDate),
]);

export const sessionMessages = pgTable("session_messages", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	messageId: varchar("message_id", { length: 255 }),
	userId: varchar("user_id", { length: 255 }),
	groupRef: varchar("group_ref", { length: 255 }),
	userName: varchar("user_name", { length: 255 }),
	groupName: varchar("group_name", { length: 255 }),
	robotId: varchar("robot_id", { length: 64 }),
	robotName: varchar("robot_name", { length: 255 }),
	content: text().notNull(),
	isFromUser: boolean("is_from_user").default(false).notNull(),
	isFromBot: boolean("is_from_bot").default(false).notNull(),
	isHuman: boolean("is_human").default(false).notNull(),
	intent: varchar({ length: 50 }),
	confidence: integer(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	extraData: jsonb("extra_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	robotNickname: varchar("robot_nickname", { length: 255 }),
}, (table) => [
	index("session_messages_group_ref_idx").using("btree", table.groupRef.asc().nullsLast().op("text_ops")),
	index("session_messages_intent_idx").using("btree", table.intent.asc().nullsLast().op("text_ops")),
	index("session_messages_robot_id_idx").using("btree", table.robotId.asc().nullsLast().op("text_ops")),
	index("session_messages_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("session_messages_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	index("session_messages_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const robotGroups = pgTable("robot_groups", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	color: varchar({ length: 7 }),
	icon: varchar({ length: 50 }),
	priority: integer().default(10),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("robot_groups_name_key").on(table.name),
]);

export const robotRoles = pgTable("robot_roles", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	permissions: jsonb(),
	isSystem: boolean("is_system").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("robot_roles_name_key").on(table.name),
]);

export const flowDefinitions = pgTable("flow_definitions", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	version: varchar({ length: 50 }).default('1.0'),
	isActive: boolean("is_active").default(true).notNull(),
	triggerType: varchar("trigger_type", { length: 50 }).notNull(),
	triggerConfig: jsonb("trigger_config").default({}),
	nodes: jsonb().default([]).notNull(),
	edges: jsonb().default([]).notNull(),
	variables: jsonb().default({}),
	timeout: integer().default(30000),
	retryConfig: jsonb("retry_config").default({"maxRetries":3,"retryInterval":1000}),
	createdBy: varchar("created_by", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("flow_definitions_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("flow_definitions_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("flow_definitions_trigger_type_idx").using("btree", table.triggerType.asc().nullsLast().op("text_ops")),
]);

export const flowInstances = pgTable("flow_instances", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	flowDefinitionId: varchar("flow_definition_id", { length: 36 }).notNull(),
	flowName: varchar("flow_name", { length: 255 }),
	status: varchar({ length: 50 }).default('running').notNull(),
	triggerType: varchar("trigger_type", { length: 50 }).notNull(),
	triggerData: jsonb("trigger_data").default({}),
	currentNodeId: varchar("current_node_id", { length: 36 }),
	executionPath: jsonb("execution_path").default([]),
	context: jsonb().default({}),
	result: jsonb().default({}),
	errorMessage: text("error_message"),
	errorStack: text("error_stack"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	processingTime: integer("processing_time"),
	retryCount: integer("retry_count").default(0),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("flow_instances_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("flow_instances_current_node_id_idx").using("btree", table.currentNodeId.asc().nullsLast().op("text_ops")),
	index("flow_instances_flow_definition_id_idx").using("btree", table.flowDefinitionId.asc().nullsLast().op("text_ops")),
	index("flow_instances_started_at_idx").using("btree", table.startedAt.asc().nullsLast().op("timestamptz_ops")),
	index("flow_instances_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const flowExecutionLogs = pgTable("flow_execution_logs", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	flowInstanceId: varchar("flow_instance_id", { length: 36 }).notNull(),
	flowDefinitionId: varchar("flow_definition_id", { length: 36 }),
	nodeId: varchar("node_id", { length: 36 }).notNull(),
	nodeType: varchar("node_type", { length: 50 }).notNull(),
	nodeName: varchar("node_name", { length: 255 }),
	status: varchar({ length: 50 }).notNull(),
	inputData: jsonb("input_data").default({}),
	outputData: jsonb("output_data").default({}),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	processingTime: integer("processing_time"),
	retryCount: integer("retry_count").default(0),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("flow_execution_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("flow_execution_logs_flow_definition_id_idx").using("btree", table.flowDefinitionId.asc().nullsLast().op("text_ops")),
	index("flow_execution_logs_flow_instance_id_idx").using("btree", table.flowInstanceId.asc().nullsLast().op("text_ops")),
	index("flow_execution_logs_node_id_idx").using("btree", table.nodeId.asc().nullsLast().op("text_ops")),
	index("flow_execution_logs_started_at_idx").using("btree", table.startedAt.asc().nullsLast().op("timestamptz_ops")),
	index("flow_execution_logs_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const robotCommands = pgTable("robot_commands", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	robotId: varchar("robot_id", { length: 255 }).notNull(),
	commandType: varchar("command_type", { length: 50 }).notNull(),
	commandData: jsonb("command_data").notNull(),
	priority: integer().default(10),
	status: varchar({ length: 20 }).default('pending').notNull(),
	retryCount: integer("retry_count").default(0),
	maxRetries: integer("max_retries").default(3),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	result: jsonb(),
	executedAt: timestamp("executed_at", { mode: 'string' }),
	messageId: varchar("message_id", { length: 100 }),
}, (table) => [
	index("idx_robot_commands_robot_id").using("btree", table.robotId.asc().nullsLast().op("text_ops")),
	index("idx_robot_commands_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("robot_commands_message_id_idx").using("btree", table.messageId.asc().nullsLast().op("text_ops")),
]);

export const robotLoadBalancing = pgTable("robot_load_balancing", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	robotId: varchar("robot_id", { length: 255 }).notNull(),
	currentSessions: integer("current_sessions").default(0).notNull(),
	maxSessions: integer("max_sessions").default(100).notNull(),
	cpuUsage: numeric("cpu_usage", { precision: 5, scale:  2 }),
	memoryUsage: numeric("memory_usage", { precision: 5, scale:  2 }),
	avgResponseTime: integer("avg_response_time"),
	successRate: numeric("success_rate", { precision: 5, scale:  4 }),
	errorCount: integer("error_count").default(0),
	healthScore: numeric("health_score", { precision: 5, scale:  2 }).default('100').notNull(),
	isAvailable: boolean("is_available").default(true).notNull(),
	lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_robot_load_balancing_health_score").using("btree", table.healthScore.asc().nullsLast().op("numeric_ops")),
	index("idx_robot_load_balancing_robot_id").using("btree", table.robotId.asc().nullsLast().op("text_ops")),
	unique("robot_load_balancing_robot_id_key").on(table.robotId),
]);

export const robotCommandQueue = pgTable("robot_command_queue", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	commandId: varchar("command_id", { length: 255 }).notNull(),
	robotId: varchar("robot_id", { length: 255 }).notNull(),
	priority: integer().default(5).notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lockedAt: timestamp("locked_at", { withTimezone: true, mode: 'string' }),
	lockedBy: varchar("locked_by", { length: 255 }),
	retryCount: integer("retry_count").default(0).notNull(),
});

export const riskMessages = pgTable("risk_messages", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	messageId: varchar("message_id", { length: 36 }).notNull(),
	sessionId: varchar("session_id", { length: 36 }).notNull(),
	userId: varchar("user_id", { length: 100 }),
	userName: varchar("user_name", { length: 100 }),
	groupName: varchar("group_name", { length: 200 }),
	content: text().notNull(),
	aiReply: text("ai_reply"),
	status: varchar({ length: 20 }).default('processing').notNull(),
	resolvedBy: varchar("resolved_by", { length: 100 }),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	handledByStaff: jsonb("handled_by_staff"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("risk_messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("risk_messages_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("risk_messages_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("risk_messages_message_id_unique").on(table.messageId),
]);

export const riskHandlingLogs = pgTable("risk_handling_logs", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	riskId: varchar("risk_id", { length: 36 }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	actor: varchar({ length: 100 }).notNull(),
	content: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("risk_handling_logs_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("risk_handling_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("risk_handling_logs_risk_id_idx").using("btree", table.riskId.asc().nullsLast().op("text_ops")),
]);

