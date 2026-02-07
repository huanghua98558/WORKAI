CREATE TABLE "alert_batch_operations" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"batch_id" varchar(36) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"error_message" text,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alert_dedup_records" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_hash" varchar(64) NOT NULL,
	"alert_level" varchar(20) NOT NULL,
	"intent_type" varchar(50),
	"user_id" varchar(255),
	"group_chat_id" varchar(255),
	"first_alert_id" varchar(36),
	"last_alert_id" varchar(36),
	"count" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_dedup_records_alert_hash_key" UNIQUE("alert_hash")
);
--> statement-breakpoint
CREATE TABLE "alert_groups" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_name" varchar(255) NOT NULL,
	"group_code" varchar(50) NOT NULL,
	"group_color" varchar(7),
	"description" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_groups_group_name_key" UNIQUE("group_name"),
	CONSTRAINT "alert_groups_group_code_key" UNIQUE("group_code")
);
--> statement-breakpoint
CREATE TABLE "alert_history" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255),
	"rule_ref" varchar(36) NOT NULL,
	"intent_type" varchar(50) NOT NULL,
	"alert_level" varchar(20) NOT NULL,
	"group_ref" varchar(255),
	"group_name" varchar(255),
	"alert_group_ref" varchar(36),
	"user_id" varchar(255),
	"user_name" varchar(255),
	"group_chat_id" varchar(255),
	"message_content" text,
	"alert_message" text NOT NULL,
	"notification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notification_result" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"is_handled" boolean DEFAULT false NOT NULL,
	"handled_by" varchar(36),
	"handled_at" timestamp with time zone,
	"handled_note" text,
	"escalation_level" integer DEFAULT 0,
	"escalation_count" integer DEFAULT 0,
	"escalation_history" jsonb DEFAULT '[]'::jsonb,
	"parent_alert_id" varchar(36),
	"batch_id" varchar(36),
	"batch_size" integer DEFAULT 1,
	"robot_id" varchar(64),
	"assignee" varchar(36),
	"confidence" integer,
	"need_reply" boolean,
	"need_human" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_notifications" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" varchar(36) NOT NULL,
	"notification_method_id" varchar(36),
	"method_type" varchar(50) NOT NULL,
	"recipient_config" jsonb,
	"message" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_recipients" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" varchar(36) NOT NULL,
	"recipient_type" varchar(50) NOT NULL,
	"recipient_id" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"notification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_type" varchar(50) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"alert_level" varchar(20) NOT NULL,
	"threshold" integer DEFAULT 1,
	"cooldown_period" integer DEFAULT 300,
	"message_template" text,
	"keywords" text,
	"group_id" varchar(36),
	"enable_escalation" boolean DEFAULT false,
	"escalation_level" integer DEFAULT 0,
	"escalation_threshold" integer DEFAULT 3,
	"escalation_interval" integer DEFAULT 1800,
	"escalation_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_stats_snapshots" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_count" integer DEFAULT 0,
	"pending_count" integer DEFAULT 0,
	"handled_count" integer DEFAULT 0,
	"ignored_count" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"critical_count" integer DEFAULT 0,
	"warning_count" integer DEFAULT 0,
	"info_count" integer DEFAULT 0,
	"escalated_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_stats_snapshots_snapshot_date_key" UNIQUE("snapshot_date")
);
--> statement-breakpoint
CREATE TABLE "alert_upgrades" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_alert_id" varchar(36) NOT NULL,
	"escalation_level" integer NOT NULL,
	"escalated_alert_id" varchar(36) NOT NULL,
	"escalation_rule_id" varchar(36),
	"escalation_reason" text,
	"escalated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_decision_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"message_id" varchar(255),
	"robot_id" varchar(255),
	"should_ai_reply" boolean,
	"ai_action" varchar(50),
	"staff_action" varchar(50),
	"priority" varchar(20),
	"reason" varchar(255),
	"staff_context" text,
	"info_context" text,
	"strategy" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "flow_definitions" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"version" varchar(50) DEFAULT '1.0',
	"is_active" boolean DEFAULT true NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"timeout" integer DEFAULT 30000,
	"retry_config" jsonb DEFAULT '{"maxRetries":3,"retryInterval":1000}'::jsonb,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_execution_logs" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_instance_id" varchar(36) NOT NULL,
	"flow_definition_id" varchar(36),
	"node_id" varchar(36) NOT NULL,
	"node_type" varchar(50) NOT NULL,
	"node_name" varchar(255),
	"status" varchar(50) NOT NULL,
	"input_data" jsonb DEFAULT '{}'::jsonb,
	"output_data" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"processing_time" integer,
	"retry_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_instances" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_definition_id" varchar(36) NOT NULL,
	"flow_name" varchar(255),
	"status" varchar(50) DEFAULT 'running' NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_data" jsonb DEFAULT '{}'::jsonb,
	"current_node_id" varchar(36),
	"execution_path" jsonb DEFAULT '[]'::jsonb,
	"context" jsonb DEFAULT '{}'::jsonb,
	"result" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"error_stack" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"processing_time" integer,
	"retry_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "info_detection_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"has_risk" boolean DEFAULT false,
	"risk_level" varchar(20),
	"risk_score" numeric(3, 2),
	"satisfaction_level" varchar(20),
	"satisfaction_score" numeric(3, 2),
	"sentiment" varchar(20),
	"sentiment_confidence" numeric(3, 2),
	"urgency_level" varchar(20),
	"urgency_score" numeric(3, 2),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "info_detection_history_message_id_key" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "intent_configs" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_type" varchar(50) NOT NULL,
	"intent_name" varchar(100) NOT NULL,
	"intent_description" text,
	"system_prompt" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intent_configs_intent_type_key" UNIQUE("intent_type")
);
--> statement-breakpoint
CREATE TABLE "notification_methods" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_rule_id" varchar(36) NOT NULL,
	"method_type" varchar(50) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"recipient_config" jsonb,
	"message_template" text,
	"priority" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_handling_logs" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risk_id" varchar(36) NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor" varchar(100) NOT NULL,
	"content" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_messages" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar(36) NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"user_id" varchar(100),
	"user_name" varchar(100),
	"group_name" varchar(200),
	"content" text NOT NULL,
	"ai_reply" text,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"resolved_by" varchar(100),
	"resolved_at" timestamp with time zone,
	"handled_by_staff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_messages_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "robot_command_queue" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"command_id" varchar(255) NOT NULL,
	"robot_id" varchar(255) NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(255),
	"retry_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robot_commands" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" varchar(255) NOT NULL,
	"command_type" varchar(50) NOT NULL,
	"command_data" jsonb NOT NULL,
	"priority" integer DEFAULT 10,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"error_message" text,
	"sent_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"result" jsonb,
	"executed_at" timestamp,
	"message_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "robot_groups" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" varchar(50),
	"priority" integer DEFAULT 10,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robot_groups_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "robot_load_balancing" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" varchar(255) NOT NULL,
	"current_sessions" integer DEFAULT 0 NOT NULL,
	"max_sessions" integer DEFAULT 100 NOT NULL,
	"cpu_usage" numeric(5, 2),
	"memory_usage" numeric(5, 2),
	"avg_response_time" integer,
	"success_rate" numeric(5, 4),
	"error_count" integer DEFAULT 0,
	"health_score" numeric(5, 2) DEFAULT '100' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robot_load_balancing_robot_id_key" UNIQUE("robot_id")
);
--> statement-breakpoint
CREATE TABLE "robot_roles" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"permissions" jsonb,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robot_roles_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session_messages" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"message_id" varchar(255),
	"user_id" varchar(255),
	"group_ref" varchar(255),
	"user_name" varchar(255),
	"group_name" varchar(255),
	"robot_id" varchar(64),
	"robot_name" varchar(255),
	"content" text NOT NULL,
	"is_from_user" boolean DEFAULT false NOT NULL,
	"is_from_bot" boolean DEFAULT false NOT NULL,
	"is_human" boolean DEFAULT false NOT NULL,
	"intent" varchar(50),
	"confidence" integer,
	"timestamp" timestamp with time zone NOT NULL,
	"extra_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"robot_nickname" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "session_staff_status" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"has_staff_participated" boolean DEFAULT false,
	"current_staff_user_id" varchar(255),
	"staff_join_time" timestamp,
	"staff_leave_time" timestamp,
	"staff_message_count" integer DEFAULT 0,
	"last_staff_activity" timestamp,
	"collaboration_mode" varchar(50) DEFAULT 'adaptive',
	"ai_reply_strategy" varchar(50) DEFAULT 'normal',
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "session_staff_status_session_id_key" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "staff_activities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"staff_user_id" varchar(255) NOT NULL,
	"staff_name" varchar(255),
	"activity_type" varchar(50) NOT NULL,
	"activity_detail" text,
	"message_id" varchar(255),
	"risk_id" varchar(36),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"staff_user_id" varchar(255) NOT NULL,
	"staff_name" varchar(255),
	"content" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'reply',
	"is_handling_command" boolean DEFAULT false,
	"linked_risk_id" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"timestamp" timestamp,
	CONSTRAINT "staff_messages_message_id_key" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"level" varchar(20) NOT NULL,
	"module" varchar(100) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"timestamp" timestamp with time zone NOT NULL,
	"environment" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(128) NOT NULL,
	"value" text NOT NULL,
	"category" varchar(64),
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at_by" varchar(36),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(64) NOT NULL,
	"email" varchar(255),
	"password" text NOT NULL,
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"robot_id" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"content_type" varchar(20) DEFAULT 'text',
	"sender_id" varchar(100) NOT NULL,
	"sender_type" varchar(20) NOT NULL,
	"sender_name" varchar(200),
	"message_type" varchar(20) DEFAULT 'message',
	"ai_model" varchar(100),
	"ai_provider" varchar(50),
	"ai_response_time" integer,
	"ai_tokens_used" integer,
	"ai_cost" numeric(10, 4),
	"ai_confidence" numeric(3, 2),
	"intent_ref" varchar(36),
	"intent_confidence" numeric(3, 2),
	"emotion" varchar(50),
	"emotion_score" numeric(3, 2),
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" varchar(36) NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"user_name" varchar(200),
	"user_avatar_url" varchar(500),
	"user_source" varchar(50),
	"status" varchar(20) DEFAULT 'active',
	"session_type" varchar(20) DEFAULT 'private',
	"message_count" integer DEFAULT 0,
	"user_message_count" integer DEFAULT 0,
	"staff_message_count" integer DEFAULT 0,
	"ai_message_count" integer DEFAULT 0,
	"staff_intervened" boolean DEFAULT false,
	"staff_id" varchar(36),
	"staff_intervention_count" integer DEFAULT 0,
	"first_intervention_at" timestamp with time zone,
	"satisfaction_score" integer,
	"satisfaction_reason" varchar(1000),
	"satisfaction_inferred_at" timestamp with time zone,
	"satisfaction_inferred_score" numeric(3, 2),
	"issue_category" varchar(100),
	"issue_subcategory" varchar(100),
	"issue_resolved" boolean DEFAULT false,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"duration_seconds" integer,
	"metadata" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "robots" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"avatar_url" varchar(500),
	"robot_type" varchar(50) NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"callback_url" varchar(1000) NOT NULL,
	"callback_secret" varchar(255),
	"callback_enabled" boolean DEFAULT true,
	"ai_enabled" boolean DEFAULT true,
	"ai_config" jsonb DEFAULT '{}',
	"status" varchar(20) DEFAULT 'active',
	"last_heartbeat_at" timestamp with time zone,
	"total_messages" integer DEFAULT 0,
	"total_sessions" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"avatar_url" varchar(500),
	"phone" varchar(50),
	"role" varchar(50) DEFAULT 'staff',
	"permissions" jsonb DEFAULT '[]',
	"status" varchar(20) DEFAULT 'offline',
	"status_message" varchar(500),
	"current_sessions" integer DEFAULT 0,
	"max_sessions" integer DEFAULT 10,
	"work_schedule" jsonb DEFAULT '{}',
	"timezone" varchar(50) DEFAULT 'Asia/Shanghai',
	"total_interventions" integer DEFAULT 0,
	"total_messages" integer DEFAULT 0,
	"avg_response_time" integer,
	"satisfaction_rate" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "intents" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"intent_type" varchar(50) NOT NULL,
	"keywords" jsonb DEFAULT '[]',
	"examples" jsonb DEFAULT '[]',
	"priority" integer DEFAULT 0,
	"ai_model" varchar(100),
	"embedding_model" varchar(100),
	"total_messages" integer DEFAULT 0,
	"confidence_threshold" numeric(3, 2) DEFAULT '0.7',
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_alert_groups_group_code" ON "alert_groups" USING btree ("group_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_history_alert_level" ON "alert_history" USING btree ("alert_level" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_history_rule_ref" ON "alert_history" USING btree ("rule_ref" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_history_created_at" ON "alert_history" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_history_intent_type" ON "alert_history" USING btree ("intent_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_history_session_id" ON "alert_history" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_history_status" ON "alert_history" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_rules_intent_type" ON "alert_rules" USING btree ("intent_type" text_ops);--> statement-breakpoint
CREATE INDEX "flow_definitions_created_at_idx" ON "flow_definitions" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "flow_definitions_is_active_idx" ON "flow_definitions" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "flow_definitions_trigger_type_idx" ON "flow_definitions" USING btree ("trigger_type" text_ops);--> statement-breakpoint
CREATE INDEX "flow_execution_logs_created_at_idx" ON "flow_execution_logs" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "flow_execution_logs_flow_definition_id_idx" ON "flow_execution_logs" USING btree ("flow_definition_id" text_ops);--> statement-breakpoint
CREATE INDEX "flow_execution_logs_flow_instance_id_idx" ON "flow_execution_logs" USING btree ("flow_instance_id" text_ops);--> statement-breakpoint
CREATE INDEX "flow_execution_logs_node_id_idx" ON "flow_execution_logs" USING btree ("node_id" text_ops);--> statement-breakpoint
CREATE INDEX "flow_execution_logs_started_at_idx" ON "flow_execution_logs" USING btree ("started_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "flow_execution_logs_status_idx" ON "flow_execution_logs" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "flow_instances_created_at_idx" ON "flow_instances" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "flow_instances_current_node_id_idx" ON "flow_instances" USING btree ("current_node_id" text_ops);--> statement-breakpoint
CREATE INDEX "flow_instances_flow_definition_id_idx" ON "flow_instances" USING btree ("flow_definition_id" text_ops);--> statement-breakpoint
CREATE INDEX "flow_instances_started_at_idx" ON "flow_instances" USING btree ("started_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "flow_instances_status_idx" ON "flow_instances" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_notification_methods_alert_rule_id" ON "notification_methods" USING btree ("alert_rule_id" text_ops);--> statement-breakpoint
CREATE INDEX "risk_handling_logs_action_idx" ON "risk_handling_logs" USING btree ("action" text_ops);--> statement-breakpoint
CREATE INDEX "risk_handling_logs_created_at_idx" ON "risk_handling_logs" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "risk_handling_logs_risk_id_idx" ON "risk_handling_logs" USING btree ("risk_id" text_ops);--> statement-breakpoint
CREATE INDEX "risk_messages_created_at_idx" ON "risk_messages" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "risk_messages_session_id_idx" ON "risk_messages" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "risk_messages_status_idx" ON "risk_messages" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_robot_commands_robot_id" ON "robot_commands" USING btree ("robot_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_robot_commands_status" ON "robot_commands" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "robot_commands_message_id_idx" ON "robot_commands" USING btree ("message_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_robot_load_balancing_health_score" ON "robot_load_balancing" USING btree ("health_score" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_robot_load_balancing_robot_id" ON "robot_load_balancing" USING btree ("robot_id" text_ops);--> statement-breakpoint
CREATE INDEX "session_messages_group_ref_idx" ON "session_messages" USING btree ("group_ref" text_ops);--> statement-breakpoint
CREATE INDEX "session_messages_intent_idx" ON "session_messages" USING btree ("intent" text_ops);--> statement-breakpoint
CREATE INDEX "session_messages_robot_id_idx" ON "session_messages" USING btree ("robot_id" text_ops);--> statement-breakpoint
CREATE INDEX "session_messages_session_id_idx" ON "session_messages" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "session_messages_timestamp_idx" ON "session_messages" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "session_messages_user_id_idx" ON "session_messages" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "system_logs_level_idx" ON "system_logs" USING btree ("level" text_ops);--> statement-breakpoint
CREATE INDEX "system_logs_module_idx" ON "system_logs" USING btree ("module" text_ops);--> statement-breakpoint
CREATE INDEX "system_logs_timestamp_idx" ON "system_logs" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "system_settings_category_idx" ON "system_settings" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "system_settings_key_idx" ON "system_settings" USING btree ("key" text_ops);--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "messages_session_id_idx" ON "messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "messages_robot_id_idx" ON "messages" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_intent_ref_idx" ON "messages" USING btree ("intent_ref");--> statement-breakpoint
CREATE INDEX "messages_sender_type_idx" ON "messages" USING btree ("sender_type");--> statement-breakpoint
CREATE INDEX "sessions_robot_id_idx" ON "sessions" USING btree ("robot_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "sessions_last_message_at_idx" ON "sessions" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "sessions_staff_intervened_idx" ON "sessions" USING btree ("staff_intervened");--> statement-breakpoint
CREATE INDEX "sessions_staff_id_idx" ON "sessions" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "robots_status_idx" ON "robots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "robots_robot_type_idx" ON "robots" USING btree ("robot_type");--> statement-breakpoint
CREATE INDEX "robots_callback_enabled_idx" ON "robots" USING btree ("callback_enabled");--> statement-breakpoint
CREATE INDEX "staff_status_idx" ON "staff" USING btree ("status");--> statement-breakpoint
CREATE INDEX "staff_role_idx" ON "staff" USING btree ("role");--> statement-breakpoint
CREATE INDEX "staff_email_idx" ON "staff" USING btree ("email");--> statement-breakpoint
CREATE INDEX "intents_intent_type_idx" ON "intents" USING btree ("intent_type");--> statement-breakpoint
CREATE INDEX "intents_status_idx" ON "intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "intents_priority_idx" ON "intents" USING btree ("priority");