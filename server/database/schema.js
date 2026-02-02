const { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { z } = require('zod');

// 用户表
exports.users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 255 }).unique(),
    password: text("password").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("admin"), // admin, operator
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    emailIdx: index("users_email_idx").on(table.email),
  })
);

// 系统设置表
exports.systemSettings = pgTable(
  "system_settings",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: varchar("key", { length: 128 }).notNull().unique(),
    value: text("value").notNull(),
    category: varchar("category", { length: 64 }), // ai, alert, monitor, callback, etc.
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAtBy: varchar("updated_at_by", { length: 36 }), // userId
  },
  (table) => ({
    keyIdx: index("system_settings_key_idx").on(table.key),
    categoryIdx: index("system_settings_category_idx").on(table.category),
  })
);

// QA 问答库表
exports.qaDatabase = pgTable(
  "qa_database",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    keyword: text("keyword").notNull(), // 匹配关键词
    reply: text("reply").notNull(), // 回复内容
    receiverType: varchar("receiver_type", { length: 20 }).notNull().default("all"), // 适用场景: all=全部/user=私聊/group=群聊
    priority: integer("priority").notNull().default(5), // 匹配优先级: 1-10（1最高）
    isExactMatch: boolean("is_exact_match").notNull().default(false), // 是否精确匹配
    relatedKeywords: text("related_keywords"), // 关联关键词（逗号分隔）
    groupName: varchar("group_name", { length: 255 }), // 限制群名（可选，不填则所有群都可用）
    isActive: boolean("is_active").notNull().default(true), // 是否启用
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    keywordIdx: index("qa_database_keyword_idx").on(table.keyword),
    priorityIdx: index("qa_database_priority_idx").on(table.priority),
    groupIdx: index("qa_database_group_idx").on(table.groupName),
    isActiveIdx: index("qa_database_is_active_idx").on(table.is_active),
  })
);

// 机器人管理表
exports.robots = pgTable(
  "robots",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(), // 机器人名称
    robotId: varchar("robot_id", { length: 64 }).notNull().unique(), // WorkTool Robot ID
    apiBaseUrl: varchar("api_base_url", { length: 255 }).notNull(), // API Base URL
    description: text("description"), // 描述
    isActive: boolean("is_active").notNull().default(true), // 是否启用
    status: varchar("status", { length: 20 }).notNull().default("unknown"), // 状态: online, offline, unknown, error
    lastCheckAt: timestamp("last_check_at", { withTimezone: true }), // 最后检查时间
    lastError: text("last_error"), // 最后错误信息
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    robotIdIdx: index("robots_robot_id_idx").on(table.robotId),
    isActiveIdx: index("robots_is_active_idx").on(table.isActive),
    statusIdx: index("robots_status_idx").on(table.status),
  })
);

// 回调历史记录表
exports.callbackHistory = pgTable(
  "callback_history",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    robotId: varchar("robot_id", { length: 64 }).notNull(), // WorkTool Robot ID
    messageId: varchar("message_id", { length: 128 }).notNull(), // 消息ID
    callbackType: integer("callback_type").notNull(), // 回调类型: 0=群二维码, 1=指令结果, 5=上线, 6=下线, 11=消息
    errorCode: integer("error_code").notNull(), // 错误码: 0=成功
    errorReason: text("error_reason").notNull(), // 错误原因
    runTime: integer("run_time"), // 执行时间戳（毫秒）
    timeCost: integer("time_cost"), // 指令执行耗时（毫秒）
    commandType: integer("command_type"), // 指令类型
    rawMsg: text("raw_msg"), // 原始指令
    extraData: jsonb("extra_data"), // 额外数据（JSON格式，包含 successList, failList, groupName, qrCode 等）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    robotIdIdx: index("callback_history_robot_id_idx").on(table.robotId),
    messageIdIdx: index("callback_history_message_id_idx").on(table.messageId),
    callbackTypeIdx: index("callback_history_callback_type_idx").on(table.callbackType),
    errorCodeIdx: index("callback_history_error_code_idx").on(table.errorCode),
    createdAtIdx: index("callback_history_created_at_idx").on(table.createdAt),
  })
);

// Zod schemas for validation
exports.insertUserSchema = z.object({
  username: z.string().min(1).max(64),
  email: z.string().email().nullable(),
  password: z.string().min(1),
  role: z.enum(['admin', 'operator']),
  isActive: z.boolean().optional()
});

exports.updateUserSchema = z.object({
  username: z.string().min(1).max(64).optional(),
  email: z.string().email().nullable().optional(),
  password: z.string().min(1).optional(),
  role: z.enum(['admin', 'operator']).optional(),
  isActive: z.boolean().optional(),
  lastLoginAt: z.date().optional()
}).partial();

exports.insertSystemSettingSchema = z.object({
  key: z.string().min(1).max(128),
  value: z.string().min(1),
  category: z.string().max(64).optional(),
  description: z.string().optional(),
  updatedAtBy: z.string().length(36).optional()
});

exports.updateSystemSettingSchema = z.object({
  value: z.string().min(1).optional(),
  description: z.string().optional(),
  updatedAtBy: z.string().length(36).optional()
}).partial();

exports.insertQADatabaseSchema = z.object({
  keyword: z.string().min(1),
  reply: z.string().min(1),
  receiverType: z.enum(['all', 'user', 'group']).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  isExactMatch: z.boolean().optional(),
  relatedKeywords: z.string().optional(),
  groupName: z.string().max(255).optional(),
  isActive: z.boolean().optional()
});

exports.updateQADatabaseSchema = z.object({
  keyword: z.string().min(1).optional(),
  reply: z.string().min(1).optional(),
  receiverType: z.enum(['all', 'user', 'group']).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  isExactMatch: z.boolean().optional(),
  relatedKeywords: z.string().optional(),
  groupName: z.string().max(255).optional(),
  isActive: z.boolean().optional()
}).partial();

exports.insertRobotSchema = z.object({
  name: z.string().min(1).max(255),
  robotId: z.string().min(1).max(64),
  apiBaseUrl: z.string().min(1).max(255),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

exports.updateRobotSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  robotId: z.string().min(1).max(64).optional(),
  apiBaseUrl: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['online', 'offline', 'unknown', 'error']).optional(),
  lastError: z.string().optional()
}).partial();

exports.insertCallbackHistorySchema = z.object({
  robotId: z.string().min(1).max(64),
  messageId: z.string().min(1).max(128),
  callbackType: z.number().int(),
  errorCode: z.number().int(),
  errorReason: z.string(),
  runTime: z.number().int().optional(),
  timeCost: z.number().int().optional(),
  commandType: z.number().int().optional(),
  rawMsg: z.string().optional(),
  extraData: z.any().optional(),
});
