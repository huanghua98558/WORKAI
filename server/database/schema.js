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
