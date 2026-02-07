/**
 * 视频号转化系统数据库 Schema
 */

const { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// 视频号用户表
exports.videoChannelUsers = pgTable(
  'video_channel_users',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id', { length: 255 }).notNull().unique(),
    userName: varchar('user_name', { length: 255 }),
    robotId: varchar('robot_id', { length: 255 }),
    robotName: varchar('robot_name', { length: 255 }),
    status: varchar('status', { length: 50 }).default('new'),
    source: varchar('source', { length: 50 }).default('worktool'),
    metadata: jsonb('metadata').default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true })
  },
  (table) => ({
    userIdIdx: index('idx_video_channel_users_user_id').on(table.userId),
    robotIdIdx: index('idx_video_channel_users_robot_id').on(table.robotId),
    statusIdx: index('idx_video_channel_users_status').on(table.status),
    createdAtIdx: index('idx_video_channel_users_created_at').on(table.createdAt)
  })
);

// 视频号二维码表
exports.videoChannelQrcodes = pgTable(
  'video_channel_qrcodes',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id', { length: 255 }).notNull().unique(),
    qrcodeId: varchar('qrcode_id', { length: 255 }).notNull().unique(),
    qrcodePath: varchar('qrcode_path', { length: 500 }),
    qrcodeUrl: varchar('qrcode_url', { length: 500 }),
    ossObjectName: varchar('oss_object_name', { length: 255 }),
    status: varchar('status', { length: 50 }).default('created'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    scannedAt: timestamp('scanned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    userIdIdx: index('idx_video_channel_qrcodes_user_id').on(table.userId),
    qrcodeIdIdx: index('idx_video_channel_qrcodes_qrcode_id').on(table.qrcodeId),
    statusIdx: index('idx_video_channel_qrcodes_status').on(table.status),
    expiresAtIdx: index('idx_video_channel_qrcodes_expires_at').on(table.expiresAt)
  })
);

// 视频号Cookie表
exports.videoChannelCookies = pgTable(
  'video_channel_cookies',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id', { length: 255 }).notNull().unique(),
    cookieData: jsonb('cookie_data').notNull(),
    cookieCount: integer('cookie_count').default(0),
    shopAccessible: boolean('shop_accessible').default(false),
    assistantAccessible: boolean('assistant_accessible').default(false),
    shopStatusCode: integer('shop_status_code'),
    assistantStatusCode: integer('assistant_status_code'),
    permissionStatus: varchar('permission_status', { length: 50 }).default('unknown'),
    extractedAt: timestamp('extracted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    status: varchar('status', { length: 50 }).default('active'),
    auditStatus: varchar('audit_status', { length: 50 }).default('pending'),
    auditNotes: text('audit_notes'),
    auditedBy: varchar('audited_by', { length: 255 }),
    auditedAt: timestamp('audited_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    userIdIdx: index('idx_video_channel_cookies_user_id').on(table.userId),
    statusIdx: index('idx_video_channel_cookies_status').on(table.status),
    permissionStatusIdx: index('idx_video_channel_cookies_permission_status').on(table.permissionStatus),
    auditStatusIdx: index('idx_video_channel_cookies_audit_status').on(table.auditStatus),
    createdAtIdx: index('idx_video_channel_cookies_created_at').on(table.createdAt)
  })
);

// 视频号消息记录表
exports.videoChannelMessageLogs = pgTable(
  'video_channel_message_logs',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id', { length: 255 }).notNull(),
    robotId: varchar('robot_id', { length: 255 }).notNull(),
    messageType: varchar('message_type', { length: 50 }).notNull(),
    templateCode: varchar('template_code', { length: 100 }),
    messageContent: text('message_content'),
    status: varchar('status', { length: 50 }).default('sent'),
    sentAt: timestamp('sent_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    userIdIdx: index('idx_video_channel_message_logs_user_id').on(table.userId),
    robotIdIdx: index('idx_video_channel_message_logs_robot_id').on(table.robotId),
    messageTypeIdx: index('idx_video_channel_message_logs_message_type').on(table.messageType),
    statusIdx: index('idx_video_channel_message_logs_status').on(table.status),
    sentAtIdx: index('idx_video_channel_message_logs_sent_at').on(table.sentAt)
  })
);

// 视频号消息模板表
exports.videoChannelMessageTemplates = pgTable(
  'video_channel_message_templates',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    templateContent: text('template_content').notNull(),
    variables: jsonb('variables').default('[]'),
    category: varchar('category', { length: 50 }),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    priority: integer('priority').default(10),
    createdBy: varchar('created_by', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    codeIdx: index('idx_video_channel_message_templates_code').on(table.code),
    categoryIdx: index('idx_video_channel_message_templates_category').on(table.category),
    isEnabledIdx: index('idx_video_channel_message_templates_is_enabled').on(table.isEnabled)
  })
);

// 视频号人工审核记录表
exports.videoChannelAuditRecords = pgTable(
  'video_channel_audit_records',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id', { length: 255 }).notNull(),
    cookieId: varchar('cookie_id', { length: 36 }).notNull(),
    shopScreenshotPath: varchar('shop_screenshot_path', { length: 500 }),
    shopScreenshotUrl: varchar('shop_screenshot_url', { length: 500 }),
    assistantScreenshotPath: varchar('assistant_screenshot_path', { length: 500 }),
    assistantScreenshotUrl: varchar('assistant_screenshot_url', { length: 500 }),
    shopAccessible: boolean('shop_accessible'),
    assistantAccessible: boolean('assistant_accessible'),
    shopStatusCode: integer('shop_status_code'),
    assistantStatusCode: integer('assistant_status_code'),
    auditResult: varchar('audit_result', { length: 50 }).default('pending'),
    complianceScore: integer('compliance_score'),
    auditNotes: text('audit_notes'),
    auditedBy: varchar('audited_by', { length: 255 }),
    auditedAt: timestamp('audited_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    userIdIdx: index('idx_video_channel_audit_records_user_id').on(table.userId),
    cookieIdIdx: index('idx_video_channel_audit_records_cookie_id').on(table.cookieId),
    auditResultIdx: index('idx_video_channel_audit_records_audit_result').on(table.auditResult),
    auditedAtIdx: index('idx_video_channel_audit_records_audited_at').on(table.auditedAt)
  })
);
