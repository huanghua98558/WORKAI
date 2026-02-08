const { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index, numeric, decimal } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { z } = require('zod');

// 意图配置表
exports.intentConfigs = pgTable(
  "intent_configs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    intentType: varchar("intent_type", { length: 50 }).notNull().unique(), // 意图类型: service, help, chat, welcome, risk, spam, admin
    intentName: varchar("intent_name", { length: 100 }).notNull(), // 意图名称
    intentDescription: text("intent_description"), // 意图描述
    systemPrompt: text("system_prompt").notNull(), // 系统提示词（用于AI识别）
    isEnabled: boolean("is_enabled").notNull().default(true), // 是否启用
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    intentTypeIdx: index("intent_configs_intent_type_idx").on(table.intentType),
    isEnabledIdx: index("intent_configs_is_enabled_idx").on(table.isEnabled),
  })
);

// 告警规则表
exports.alertRules = pgTable(
  "alert_rules",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    intentType: varchar("intent_type", { length: 50 }).notNull(), // 关联的意图类型
    ruleName: varchar("rule_name", { length: 255 }).notNull(), // 规则名称
    isEnabled: boolean("is_enabled").notNull().default(true), // 是否启用
    alertLevel: varchar("alert_level", { length: 20 }).notNull(), // 告警级别: critical, warning, info
    threshold: integer("threshold").default(1), // 告警阈值（连续触发N次才告警）
    cooldownPeriod: integer("cooldown_period").default(300), // 冷却时间（秒），避免重复告警
    messageTemplate: text("message_template"), // 告警消息模板
    keywords: text("keywords"), // 关键词（仅 intent_type 为 keyword 时使用，逗号分隔）
    groupId: varchar("group_id", { length: 36 }), // 关联的告警分组ID
    enableEscalation: boolean("enable_escalation").default(false), // 是否启用升级
    escalationLevel: integer("escalation_level").default(0), // 当前升级级别
    escalationThreshold: integer("escalation_threshold").default(3), // 最大升级次数
    escalationInterval: integer("escalation_interval").default(1800), // 升级间隔（秒）
    escalationConfig: jsonb("escalation_config").default("{}"), // 升级配置
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    intentTypeIdx: index("alert_rules_intent_type_idx").on(table.intentType),
    alertLevelIdx: index("alert_rules_alert_level_idx").on(table.alertLevel),
    isEnabledIdx: index("alert_rules_is_enabled_idx").on(table.isEnabled),
    groupIdIdx: index("alert_rules_group_id_idx").on(table.groupId),
  })
);

// 通知方式配置表
exports.notificationMethods = pgTable(
  "notification_methods",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    alertRuleId: varchar("alert_rule_id", { length: 36 }).notNull(), // 关联的告警规则ID
    methodType: varchar("method_type", { length: 50 }).notNull(), // 通知方式: robot, email, sms, wechat, dingtalk, feishu
    isEnabled: boolean("is_enabled").notNull().default(true), // 是否启用
    recipientConfig: jsonb("recipient_config"), // 接收人配置（JSON格式，包含联系方式等）
    messageTemplate: text("message_template"), // 通知消息模板
    priority: integer("priority").notNull().default(10), // 优先级（1-10，1最高）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    alertRuleIdIdx: index("notification_methods_alert_rule_id_idx").on(table.alertRuleId),
    methodTypeIdx: index("notification_methods_method_type_idx").on(table.methodType),
    isEnabledIdx: index("notification_methods_is_enabled_idx").on(table.isEnabled),
    priorityIdx: index("notification_methods_priority_idx").on(table.priority),
  })
);

// 告警历史表
exports.alertHistory = pgTable(
  "alert_history",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }), // 关联的会话ID
    alertRuleId: varchar("alert_rule_id", { length: 36 }).notNull(), // 关联的告警规则ID
    intentType: varchar("intent_type", { length: 50 }).notNull(), // 触发告警的意图类型
    alertLevel: varchar("alert_level", { length: 20 }).notNull(), // 告警级别
    groupId: varchar("group_id", { length: 255 }), // 群组ID
    groupName: varchar("group_name", { length: 255 }), // 群组名
    alertGroupId: varchar("alert_group_id", { length: 36 }), // 关联的告警分组ID
    userId: varchar("user_id", { length: 255 }), // 触发告警的用户ID
    userName: varchar("user_name", { length: 255 }), // 触发告警的用户名
    groupChatId: varchar("group_chat_id", { length: 255 }), // 企业微信群ID
    messageContent: text("message_content"), // 触发告警的消息内容
    alertMessage: text("alert_message").notNull(), // 告警消息
    notificationStatus: varchar("notification_status", { length: 20 }).notNull().default("pending"), // 通知状态: pending, sent, failed
    notificationResult: jsonb("notification_result"), // 通知结果（JSON格式，包含各方式的发送结果）
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 状态: pending, handled, ignored, sent
    isHandled: boolean("is_handled").notNull().default(false), // 是否已处理
    handledBy: varchar("handled_by", { length: 36 }), // 处理人ID
    handledAt: timestamp("handled_at", { withTimezone: true }), // 处理时间
    handledNote: text("handled_note"), // 处理备注
    escalationLevel: integer("escalation_level").default(0), // 升级级别
    escalationCount: integer("escalation_count").default(0), // 升级次数
    escalationHistory: jsonb("escalation_history").default("[]"), // 升级历史
    parentAlertId: varchar("parent_alert_id", { length: 36 }), // 父告警ID（用于关联升级的告警）
    batchId: varchar("batch_id", { length: 36 }), // 批量操作ID
    batchSize: integer("batch_size").default(1), // 批量大小
    robotId: varchar("robot_id", { length: 64 }), // 关联的机器人ID
    assignee: varchar("assignee", { length: 36 }), // 负责人ID
    confidence: integer("confidence"), // 意图识别置信度
    needReply: boolean("need_reply"), // 是否需要回复
    needHuman: boolean("need_human"), // 是否需要人工干预
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionIdIdx: index("alert_history_session_id_idx").on(table.sessionId),
    alertRuleIdIdx: index("alert_history_alert_rule_id_idx").on(table.alertRuleId),
    intentTypeIdx: index("alert_history_intent_type_idx").on(table.intentType),
    alertLevelIdx: index("alert_history_alert_level_idx").on(table.alertLevel),
    notificationStatusIdx: index("alert_history_notification_status_idx").on(table.notificationStatus),
    createdAtIdx: index("alert_history_created_at_idx").on(table.createdAt),
    alertGroupIdIdx: index("alert_history_group_id_idx").on(table.alertGroupId),
    batchIdIdx: index("alert_history_batch_id_idx").on(table.batchId),
    parentAlertIdIdx: index("alert_history_parent_alert_id_idx").on(table.parentAlertId),
    escalationLevelIdx: index("alert_history_escalation_level_idx").on(table.escalationLevel),
  })
);

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
    role: varchar("role", { length: 20 }).notNull().default("admin"), // admin, operator, viewer
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),

    // 扩展字段
    avatarUrl: varchar("avatar_url", { length: 500 }), // 头像URL
    phone: varchar("phone", { length: 20 }), // 手机号
    fullName: varchar("full_name", { length: 255 }), // 全名

    // 两步验证字段
    mfaEnabled: boolean("mfa_enabled").default(false), // 两步验证启用
    mfaSecret: varchar("mfa_secret", { length: 32 }), // 两步验证密钥
    mfaBackupCodes: jsonb("mfa_backup_codes").default("[]"), // 两步验证备用码

    // 账户锁定字段
    failedLoginAttempts: integer("failed_login_attempts").default(0), // 失败登录次数
    lockedUntil: timestamp("locked_until", { withTimezone: true }), // 锁定到期时间

    // 密码过期字段
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }), // 密码修改时间
    passwordExpiresAt: timestamp("password_expires_at", { withTimezone: true }), // 密码过期时间

    // 邮箱验证字段
    emailVerified: boolean("email_verified").default(false), // 邮箱验证状态
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }), // 邮箱验证时间
    emailVerificationToken: varchar("email_verification_token", { length: 255 }), // 邮箱验证令牌

    // 最后活跃字段
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }), // 最后活跃时间
    lastLoginIp: varchar("last_login_ip", { length: 45 }), // 最后登录IP

    // 元数据字段
    metadata: jsonb("metadata").default("{}"), // 元数据
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    emailIdx: index("users_email_idx").on(table.email),
  })
);

// 用户表 Zod Schema
exports.insertUserSchema = z.object({
  username: z.string().min(3).max(64),
  email: z.string().email().optional().nullable(),
  password: z.string().min(8),
  role: z.enum(['admin', 'operator', 'viewer']).default('operator'),
  isActive: z.boolean().default(true),
  fullName: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

exports.updateUserSchema = z.object({
  username: z.string().min(3).max(64).optional(),
  email: z.string().email().optional().nullable(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'operator', 'viewer']).optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

// 用户审计日志表
exports.userAuditLogs = pgTable(
  "user_audit_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }), // 用户ID
    action: varchar("action", { length: 100 }).notNull(), // 操作动作: login, logout, register, update, delete, create, view, export
    actionType: varchar("action_type", { length: 50 }).notNull(), // 操作类型: auth, user, robot, session, system, export
    resourceType: varchar("resource_type", { length: 50 }), // 资源类型: user, robot, session, system, alert
    resourceId: varchar("resource_id", { length: 36 }), // 资源ID
    resourceName: varchar("resource_name", { length: 255 }), // 资源名称（冗余，便于查询）
    details: jsonb("details").default("{}"), // 操作详情（JSON格式）
    status: varchar("status", { length: 20 }).notNull().default("success"), // 状态: success, failed
    errorMessage: text("error_message"), // 错误信息
    ipAddress: varchar("ip_address", { length: 45 }), // IP地址（支持IPv6）
    userAgent: text("user_agent"), // 用户代理
    sessionId: varchar("session_id", { length: 255 }), // 会话ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("user_audit_logs_user_id_idx").on(table.userId),
    actionIdx: index("user_audit_logs_action_idx").on(table.action),
    actionTypeIdx: index("user_audit_logs_action_type_idx").on(table.actionType),
    resourceTypeIdx: index("user_audit_logs_resource_type_idx").on(table.resourceType),
    resourceIdIdx: index("user_audit_logs_resource_id_idx").on(table.resourceId),
    statusIdx: index("user_audit_logs_status_idx").on(table.status),
    createdAtIdx: index("user_audit_logs_created_at_idx").on(table.createdAt),
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
    nickname: varchar("nickname", { length: 255 }), // 机器人昵称（从WorkTool API获取）
    company: varchar("company", { length: 255 }), // 企业名称（从WorkTool API获取）
    ipAddress: varchar("ip_address", { length: 45 }), // IP地址（支持IPv6）
    isValid: boolean("is_valid").notNull().default(true), // 是否有效（从WorkTool API获取）
    activatedAt: timestamp("activated_at", { withTimezone: true }), // 启用时间（从WorkTool API获取）
    expiresAt: timestamp("expires_at", { withTimezone: true }), // 到期时间（从WorkTool API获取）
    messageCallbackEnabled: boolean("message_callback_enabled").notNull().default(false), // 消息回调是否开启（从WorkTool API获取）
    conversionMode: boolean("conversion_mode").notNull().default(false), // 是否启用转化客服模式
    robotGroup: varchar("robot_group", { length: 50 }), // 机器人分组（如：营销、服务、技术支持等）
    robotType: varchar("robot_type", { length: 50 }), // 机器人类型（如：角色、助手、客服等）
    extraData: jsonb("extra_data"), // 额外数据（JSON格式，存储其他WorkTool返回的信息）
    ownerId: varchar("owner_id", { length: 36 }), // 创建者ID（用户ID）
    ownerName: varchar("owner_name", { length: 255 }), // 创建者名称
    isSystem: boolean("is_system").default(false), // 是否为系统机器人（超管分配，不可删除）

    // 回调地址（5个）
    messageCallbackUrl: varchar("message_callback_url", { length: 500 }), // 消息回调地址
    resultCallbackUrl: varchar("result_callback_url", { length: 500 }), // 执行结果回调地址
    qrcodeCallbackUrl: varchar("qrcode_callback_url", { length: 500 }), // 群二维码回调地址
    onlineCallbackUrl: varchar("online_callback_url", { length: 500 }), // 机器人上线回调地址
    offlineCallbackUrl: varchar("offline_callback_url", { length: 500 }), // 机器人下线回调地址

    // 通讯地址（8个）
    sendMessageApi: varchar("send_message_api", { length: 500 }), // 指令消息通讯地址
    updateApi: varchar("update_api", { length: 500 }), // 机器人后端通讯加密地址
    getInfoApi: varchar("get_info_api", { length: 500 }), // 获取机器人信息地址
    onlineApi: varchar("online_api", { length: 500 }), // 查询机器人是否在线地址
    onlineInfosApi: varchar("online_infos_api", { length: 500 }), // 查询机器人登录日志地址
    listRawMessageApi: varchar("list_raw_message_api", { length: 500 }), // 指令消息API调用查询地址
    rawMsgListApi: varchar("raw_msg_list_api", { length: 500 }), // 指令执行结果查询地址
    qaLogListApi: varchar("qa_log_list_api", { length: 500 }), // 机器人消息回调日志列表查询地址

    callbackBaseUrl: varchar("callback_base_url", { length: 500 }), // 回调基础地址（用于生成回调地址）

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    robotIdIdx: index("robots_robot_id_idx").on(table.robotId),
    isActiveIdx: index("robots_is_active_idx").on(table.isActive),
    statusIdx: index("robots_status_idx").on(table.status),
    isValidIdx: index("robots_is_valid_idx").on(table.isValid),
    expiresAtIdx: index("robots_expires_at_idx").on(table.expiresAt),
    companyIdx: index("robots_company_idx").on(table.company),
    ownerIdIdx: index("robots_owner_id_idx").on(table.ownerId),
    isSystemIdx: index("robots_is_system_idx").on(table.isSystem),
  })
);

// 接口调用日志表（新增）
exports.apiCallLogs = pgTable(
  "api_call_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    robotId: varchar("robot_id", { length: 64 }).notNull(), // 关联的机器人ID
    apiType: varchar("api_type", { length: 50 }).notNull(), // 接口类型: sendMessage, update, getInfo, online, onlineInfos, listRawMessage, rawMsgList, qaLogList
    apiUrl: text("api_url").notNull(), // 完整的API地址
    httpMethod: varchar("http_method", { length: 10 }).notNull(), // HTTP方法: GET, POST
    requestParams: jsonb("request_params"), // 请求参数
    requestBody: jsonb("request_body"), // 请求体（POST请求）
    responseStatus: integer("response_status"), // 响应状态码
    responseData: jsonb("response_data"), // 响应数据
    responseTime: integer("response_time"), // 响应时间（毫秒）
    success: boolean("success").notNull().default(false), // 是否成功
    errorMessage: text("error_message"), // 错误信息
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    robotIdIdx: index("api_call_logs_robot_id_idx").on(table.robotId),
    apiTypeIdx: index("api_call_logs_api_type_idx").on(table.apiType),
    createdAtIdx: index("api_call_logs_created_at_idx").on(table.createdAt),
    successIdx: index("api_call_logs_success_idx").on(table.success),
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

// 会话消息记录表
exports.sessionMessages = pgTable(
  "session_messages",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }).notNull(), // 会话ID
    messageId: varchar("message_id", { length: 255 }), // 消息ID
    userId: varchar("user_id", { length: 255 }), // 用户ID
    groupId: varchar("group_id", { length: 255 }), // 群组ID
    userName: varchar("user_name", { length: 255 }), // 用户名
    groupName: varchar("group_name", { length: 255 }), // 群组名
    robotId: varchar("robot_id", { length: 64 }), // 机器人ID
    robotName: varchar("robot_name", { length: 255 }), // 机器人名称
    content: text("content").notNull(), // 消息内容
    isFromUser: boolean("is_from_user").notNull().default(false), // 是否来自用户
    isFromBot: boolean("is_from_bot").notNull().default(false), // 是否来自机器人
    isHuman: boolean("is_human").notNull().default(false), // 是否人工回复
    intent: varchar("intent", { length: 50 }), // 意图识别结果
    confidence: integer("confidence"), // 意图识别置信度（0-100）
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(), // 消息时间戳
    extraData: jsonb("extra_data"), // 额外数据（JSON格式）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionIdIdx: index("session_messages_session_id_idx").on(table.sessionId),
    userIdIdx: index("session_messages_user_id_idx").on(table.userId),
    groupIdIdx: index("session_messages_group_id_idx").on(table.groupId),
    robotIdIdx: index("session_messages_robot_id_idx").on(table.robotId),
    timestampIdx: index("session_messages_timestamp_idx").on(table.timestamp),
    intentIdx: index("session_messages_intent_idx").on(table.intent),
  })
);

// 会话消息记录表（下划线式导出，用于兼容）
exports.session_messages = exports.sessionMessages;

// AI IO 日志表
// ============================================
// AI 交互日志表
// ============================================

exports.ai_io_logs = pgTable(
  "ai_io_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sessionId: varchar("session_id", { length: 255 }),
    messageId: varchar("message_id", { length: 255 }),
    robotId: varchar("robot_id", { length: 255 }),
    robotName: varchar("robot_name", { length: 255 }),
    operationType: varchar("operation_type", { length: 100 }),
    aiInput: text("ai_input"),
    aiOutput: text("ai_output"),
    modelId: varchar("model_id", { length: 255 }),
    temperature: integer("temperature"),
    requestDuration: integer("request_duration"),
    status: varchar("status", { length: 50 }),
    errorMessage: text("error_message"),
    inputTokens: integer("input_tokens").default(0),
    outputTokens: integer("output_tokens").default(0),
    totalTokens: integer("total_tokens").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdIdx: index("ai_io_logs_session_id_idx").on(table.sessionId),
    messageIdIdx: index("ai_io_logs_message_id_idx").on(table.messageId),
    operationTypeIdx: index("ai_io_logs_operation_type_idx").on(table.operationType),
    createdAtIdx: index("ai_io_logs_created_at_idx").on(table.createdAt),
  })
);

// 兼容性导出：确保下划线式和驼峰式命名都可用
exports.aiIoLogs = exports.ai_io_logs;

// ============================================
// Prompt 训练相关表
// ============================================

// Prompt 模板表
exports.prompt_templates = pgTable(
  "prompt_templates",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // intentRecognition, serviceReply, report
    description: text("description"),
    systemPrompt: text("system_prompt").notNull(),
    variables: jsonb("variables").default("[]"), // 支持的变量列表
    version: varchar("version", { length: 50 }).default("1.0"),
    isActive: boolean("is_active").default(true),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    typeIdx: index("prompt_templates_type_idx").on(table.type),
    isActiveIdx: index("prompt_templates_is_active_idx").on(table.isActive),
    createdAtIdx: index("prompt_templates_created_at_idx").on(table.createdAt),
  })
);

// Prompt 模板表（驼峰式导出）
exports.promptTemplates = exports.prompt_templates;

// Prompt 测试记录表
exports.prompt_tests = pgTable(
  "prompt_tests",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    templateId: varchar("template_id", { length: 255 }).references(() => prompt_templates.id, { onDelete: "set null" }),
    testName: varchar("test_name", { length: 255 }),
    inputMessage: text("input_message").notNull(),
    variables: jsonb("variables").default("{}"),
    aiOutput: text("ai_output"),
    expectedOutput: text("expected_output"),
    actualIntent: varchar("actual_intent", { length: 50 }), // 实际识别的意图
    expectedIntent: varchar("expected_intent", { length: 50 }), // 期望识别的意图
    isCorrect: boolean("is_correct"),
    rating: integer("rating"), // 用户评分 1-5
    feedback: text("feedback"),
    modelId: varchar("model_id", { length: 255 }),
    temperature: numeric("temperature", { precision: 5, scale: 2 }),
    requestDuration: integer("request_duration"),
    status: varchar("status", { length: 50 }).default("success"), // success, error
    errorMessage: text("error_message"),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    templateIdIdx: index("prompt_tests_template_id_idx").on(table.templateId),
    createdAtIdx: index("prompt_tests_created_at_idx").on(table.createdAt),
    statusIdx: index("prompt_tests_status_idx").on(table.status),
    isCorrectIdx: index("prompt_tests_is_correct_idx").on(table.isCorrect),
  })
);

// Prompt 测试记录表（驼峰式导出）
exports.promptTests = exports.prompt_tests;

// 文档表
exports.documents = pgTable(
  "documents",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 500 }).notNull(), // 文档标题
    content: text("content"), // 文档内容（文本类型）
    fileName: varchar("file_name", { length: 500 }), // 原始文件名
    fileType: varchar("file_type", { length: 100 }), // 文件类型: txt, pdf, doc, docx, md
    fileSize: integer("file_size"), // 文件大小（字节）
    fileUrl: text("file_url"), // 文件URL（对象存储地址）
    category: varchar("category", { length: 100 }), // 文档分类
    tags: jsonb("tags").default("[]"), // 文档标签
    source: varchar("source", { length: 50 }).notNull().default("upload"), // 来源: upload, text
    isActive: boolean("is_active").notNull().default(true), // 是否启用
    uploadedBy: varchar("uploaded_by", { length: 255 }), // 上传者
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("documents_category_idx").on(table.category),
    isActiveIdx: index("documents_is_active_idx").on(table.isActive),
    createdAtIdx: index("documents_created_at_idx").on(table.createdAt),
    sourceIdx: index("documents_source_idx").on(table.source),
  })
);

// 文档表（驼峰式导出）
exports.documentsTable = exports.documents;

// ============================================
// 流程引擎相关表 (Flow Engine 2.1)
// ============================================

// 流程定义表
exports.flowDefinitions = pgTable(
  "flow_definitions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(), // 流程名称
    description: text("description"), // 流程描述
    version: varchar("version", { length: 50 }).default("1.0"), // 流程版本
    isActive: boolean("is_active").notNull().default(true), // 是否启用
    isDefault: boolean("is_default").notNull().default(false), // 是否为默认流程
    priority: integer("priority").default(0), // 优先级（数字越大优先级越高）
    triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 触发类型: webhook, manual, scheduled
    triggerConfig: jsonb("trigger_config").default("{}"), // 触发配置
    nodes: jsonb("nodes").notNull().default("[]"), // 节点配置列表（JSON数组）
    edges: jsonb("edges").notNull().default("[]"), // 边配置列表（JSON数组，定义节点间的连接关系）
    variables: jsonb("variables").default("{}"), // 流程变量（JSON对象）
    timeout: integer("timeout").default(30000), // 超时时间（毫秒）
    retryConfig: jsonb("retry_config").default("{\"maxRetries\": 3, \"retryInterval\": 1000}"), // 重试配置
    createdBy: varchar("created_by", { length: 36 }), // 创建者ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    isActiveIdx: index("flow_definitions_is_active_idx").on(table.isActive),
    isDefaultIdx: index("flow_definitions_is_default_idx").on(table.isDefault),
    priorityIdx: index("flow_definitions_priority_idx").on(table.priority),
    triggerTypeIdx: index("flow_definitions_trigger_type_idx").on(table.triggerType),
    createdAtIdx: index("flow_definitions_created_at_idx").on(table.createdAt),
  })
);

// 流程定义表（驼峰式导出）
exports.flow_definitions = exports.flowDefinitions;

// 流程实例表
exports.flowInstances = pgTable(
  "flow_instances",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    flowDefinitionId: varchar("flow_definition_id", { length: 36 }).notNull(), // 关联的流程定义ID
    flowName: varchar("flow_name", { length: 255 }), // 流程名称（冗余字段，便于查询）
    status: varchar("status", { length: 50 }).notNull().default("running"), // 状态: pending, running, completed, failed, cancelled, timeout
    triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 触发类型
    triggerData: jsonb("trigger_data").default("{}"), // 触发数据（如webhook消息内容）
    currentNodeId: varchar("current_node_id", { length: 36 }), // 当前节点ID
    executionPath: jsonb("execution_path").default("[]"), // 执行路径（节点ID列表）
    context: jsonb("context").default("{}"), // 流程上下文（变量、状态等）
    result: jsonb("result").default("{}"), // 执行结果
    errorMessage: text("error_message"), // 错误消息
    errorStack: text("error_stack"), // 错误堆栈
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(), // 开始时间
    completedAt: timestamp("completed_at", { withTimezone: true }), // 完成时间
    processingTime: integer("processing_time"), // 处理时间（毫秒）
    retryCount: integer("retry_count").default(0), // 重试次数
    metadata: jsonb("metadata").default("{}"), // 元数据（如sessionId, messageId等）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    flowDefinitionIdIdx: index("flow_instances_flow_definition_id_idx").on(table.flowDefinitionId),
    statusIdx: index("flow_instances_status_idx").on(table.status),
    currentNodeIdIdx: index("flow_instances_current_node_id_idx").on(table.currentNodeId),
    startedAtIdx: index("flow_instances_started_at_idx").on(table.startedAt),
    createdAtIdx: index("flow_instances_created_at_idx").on(table.createdAt),
  })
);

// 流程实例表（下划线式导出）
exports.flow_instances = exports.flowInstances;

// 流程执行日志表
exports.flowExecutionLogs = pgTable(
  "flow_execution_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    flowInstanceId: varchar("flow_instance_id", { length: 36 }).notNull(), // 关联的流程实例ID
    flowDefinitionId: varchar("flow_definition_id", { length: 36 }), // 关联的流程定义ID
    nodeId: varchar("node_id", { length: 36 }).notNull(), // 节点ID
    nodeType: varchar("node_type", { length: 50 }).notNull(), // 节点类型: start, end, condition, ai_chat, intent, service, human_handover, notification
    nodeName: varchar("node_name", { length: 255 }), // 节点名称
    status: varchar("status", { length: 50 }).notNull(), // 状态: pending, running, completed, failed, skipped
    inputData: jsonb("input_data").default("{}"), // 输入数据
    outputData: jsonb("output_data").default("{}"), // 输出数据
    errorMessage: text("error_message"), // 错误消息
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(), // 开始时间
    completedAt: timestamp("completed_at", { withTimezone: true }), // 完成时间
    processingTime: integer("processing_time"), // 处理时间（毫秒）
    retryCount: integer("retry_count").default(0), // 重试次数
    metadata: jsonb("metadata").default("{}"), // 元数据
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    flowInstanceIdIdx: index("flow_execution_logs_flow_instance_id_idx").on(table.flowInstanceId),
    flowDefinitionIdIdx: index("flow_execution_logs_flow_definition_id_idx").on(table.flowDefinitionId),
    nodeIdIdx: index("flow_execution_logs_node_id_idx").on(table.nodeId),
    statusIdx: index("flow_execution_logs_status_idx").on(table.status),
    startedAtIdx: index("flow_execution_logs_started_at_idx").on(table.startedAt),
    createdAtIdx: index("flow_execution_logs_created_at_idx").on(table.createdAt),
  })
);

// 流程执行日志表（下划线式导出）
exports.flow_execution_logs = exports.flowExecutionLogs;

// ============================================
// 机器人指令相关表
// ============================================

// 机器人指令表
exports.robotCommands = pgTable(
  "robot_commands",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    robotId: varchar("robot_id", { length: 255 }).notNull(),
    commandType: varchar("command_type", { length: 50 }).notNull(),
    commandData: jsonb("command_data").notNull(),
    priority: integer().default(10),
    status: varchar("status", { length: 20 }).default('pending').notNull(),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    result: jsonb(),
    executedAt: timestamp("executed_at"),
    messageId: varchar("message_id", { length: 100 }),
  },
  (table) => ({
    robotIdIdx: index("idx_robot_commands_robot_id").on(table.robotId),
    statusIdx: index("idx_robot_commands_status").on(table.status),
    messageIdIdx: index("robot_commands_message_id_idx").on(table.messageId),
  })
);

// 机器人指令队列表
exports.robotCommandQueue = pgTable(
  "robot_command_queue",
  {
    id: varchar("id", { length: 255 }).primaryKey().notNull(),
    commandId: varchar("command_id", { length: 255 }).notNull(),
    robotId: varchar("robot_id", { length: 255 }).notNull(),
    priority: integer().default(5).notNull(),
    status: varchar("status", { length: 50 }).default('pending').notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: varchar("locked_by", { length: 255 }),
    retryCount: integer("retry_count").default(0).notNull(),
  }
);

// ============================================
// AI 核心能力相关表 (AI Core 2.1)
// ============================================

// AI提供商配置表
exports.aiProviders = pgTable(
  "ai_providers",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(), // 提供商名称: alibaba, openai, claude, custom
    displayName: varchar("display_name", { length: 255 }).notNull(), // 显示名称
    type: varchar("type", { length: 50 }).notNull(), // 类型: builtin, custom
    apiKey: text("api_key"), // API密钥（加密存储）
    apiEndpoint: varchar("api_endpoint", { length: 500 }), // API端点
    apiVersion: varchar("api_version", { length: 50 }), // API版本
    config: jsonb("config").default("{}"), // 额外配置（如region, timeout等）
    isEnabled: boolean("is_enabled").notNull().default(true), // 是否启用
    priority: integer("priority").notNull().default(10), // 优先级（1-10，1最高）
    rateLimit: integer("rate_limit").default(60), // 速率限制（每分钟请求数）
    description: text("description"), // 描述
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("ai_providers_name_idx").on(table.name),
    typeIdx: index("ai_providers_type_idx").on(table.type),
    isEnabledIdx: index("ai_providers_is_enabled_idx").on(table.isEnabled),
    priorityIdx: index("ai_providers_priority_idx").on(table.priority),
  })
);

// AI提供商配置表（下划线式导出）
exports.ai_providers = exports.aiProviders;

// AI模型配置表
exports.aiModels = pgTable(
  "ai_models",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerId: varchar("provider_id", { length: 36 }).notNull(), // 关联的提供商ID
    name: varchar("name", { length: 255 }).notNull(), // 模型名称: qwen-turbo, qwen-plus, gpt-4, claude-3
    displayName: varchar("display_name", { length: 255 }).notNull(), // 显示名称
    modelId: varchar("model_id", { length: 255 }).notNull(), // 模型ID（API调用时使用）
    type: varchar("type", { length: 50 }).notNull(), // 类型: chat, embedding, image, video
    capabilities: jsonb("capabilities").default("[]"), // 能力列表（如text, image, video等）
    maxTokens: integer("max_tokens"), // 最大token数
    inputPrice: numeric("input_price", { precision: 10, scale: 6 }), // 输入价格（每1K tokens）
    outputPrice: numeric("output_price", { precision: 10, scale: 6 }), // 输出价格（每1K tokens）
    isEnabled: boolean("is_enabled").notNull().default(true), // 是否启用
    priority: integer("priority").notNull().default(10), // 优先级
    config: jsonb("config").default("{}"), // 额外配置（如temperature, top_p等）
    description: text("description"), // 描述
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    providerIdIdx: index("ai_models_provider_id_idx").on(table.providerId),
    nameIdx: index("ai_models_name_idx").on(table.name),
    typeIdx: index("ai_models_type_idx").on(table.type),
    isEnabledIdx: index("ai_models_is_enabled_idx").on(table.isEnabled),
  })
);

// AI模型配置表（下划线式导出）
exports.ai_models = exports.aiModels;

// AI角色配置表
exports.aiRoles = pgTable(
  "ai_roles",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(), // 角色名称: 社群运营, 售后处理, 转化客服等
    type: varchar("type", { length: 50 }).notNull(), // 类型: preset, custom
    category: varchar("category", { length: 50 }), // 分类: operation, service, sales, support
    description: text("description"), // 描述
    systemPrompt: text("system_prompt").notNull(), // 系统提示词
    temperature: numeric("temperature", { precision: 5, scale: 2 }).default(0.7), // 温度参数
    maxTokens: integer("max_tokens").default(2000), // 最大token数
    modelId: varchar("model_id", { length: 36 }), // 使用的模型ID
    promptTemplateId: varchar("prompt_template_id", { length: 36 }), // 关联的话术模板ID
    variables: jsonb("variables").default("{}"), // 支持的变量列表
    isActive: boolean("is_active").notNull().default(true), // 是否启用
    isDefault: boolean("is_default").notNull().default(false), // 是否为默认角色
    currentVersion: varchar("current_version", { length: 50 }).default("1.0"), // 当前版本号
    createdBy: varchar("created_by", { length: 36 }), // 创建者ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("ai_roles_name_idx").on(table.name),
    typeIdx: index("ai_roles_type_idx").on(table.type),
    categoryIdx: index("ai_roles_category_idx").on(table.category),
    isActiveIdx: index("ai_roles_is_active_idx").on(table.isActive),
    isDefaultIdx: index("ai_roles_is_default_idx").on(table.isDefault),
  })
);

// AI角色配置表（下划线式导出）
exports.ai_roles = exports.aiRoles;

// AI角色版本表
exports.aiRoleVersions = pgTable(
  "ai_role_versions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roleId: varchar("role_id", { length: 36 }).notNull(), // 关联的角色ID
    version: varchar("version", { length: 50 }).notNull(), // 版本号: 1.0, 1.1, 2.0等
    systemPrompt: text("system_prompt").notNull(), // 该版本的系统提示词
    temperature: numeric("temperature", { precision: 5, scale: 2 }), // 该版本的温度参数
    maxTokens: integer("max_tokens"), // 该版本的最大token数
    modelId: varchar("model_id", { length: 36 }), // 该版本使用的模型ID
    variables: jsonb("variables").default("{}"), // 该版本支持的变量列表
    changeReason: text("change_reason"), // 变更原因
    changeLog: text("change_log"), // 变更日志
    createdBy: varchar("created_by", { length: 36 }), // 创建者ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    roleIdIdx: index("ai_role_versions_role_id_idx").on(table.roleId),
    versionIdx: index("ai_role_versions_version_idx").on(table.version),
    createdAtIdx: index("ai_role_versions_created_at_idx").on(table.createdAt),
  })
);

// AI角色版本表（下划线式导出）
exports.ai_role_versions = exports.aiRoleVersions;

// 话术分类模板表
exports.promptCategoryTemplates = pgTable(
  "prompt_category_templates",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    category: varchar("category", { length: 50 }).notNull(), // 分类: 24类场景之一
    categoryName: varchar("category_name", { length: 255 }).notNull(), // 分类名称
    template: text("template").notNull(), // 话术模板
    variables: jsonb("variables").default("[]"), // 支持的变量列表
    examples: jsonb("examples").default("[]"), // 示例列表
    isActive: boolean("is_active").notNull().default(true), // 是否启用
    priority: integer("priority").notNull().default(5), // 优先级
    description: text("description"), // 描述
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("prompt_category_templates_category_idx").on(table.category),
    isActiveIdx: index("prompt_category_templates_is_active_idx").on(table.isActive),
    priorityIdx: index("prompt_category_templates_priority_idx").on(table.priority),
  })
);

// 话术分类模板表（下划线式导出）
exports.prompt_category_templates = exports.promptCategoryTemplates;

// AI模型使用记录表
exports.aiModelUsage = pgTable(
  "ai_model_usage",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id", { length: 255 }).default("default"), // 组织ID（用于多租户）
    modelId: varchar("model_id", { length: 36 }).notNull(), // 使用的模型ID
    providerId: varchar("provider_id", { length: 36 }).notNull(), // 提供商ID
    sessionId: varchar("session_id", { length: 255 }), // 会话ID
    operationType: varchar("operation_type", { length: 50 }).notNull(), // 操作类型: intent_recognition, chat, service, image_generation等
    inputTokens: integer("input_tokens").default(0), // 输入token数
    outputTokens: integer("output_tokens").default(0), // 输出token数
    totalTokens: integer("total_tokens").default(0), // 总token数
    inputCost: numeric("input_cost", { precision: 10, scale: 6 }), // 输入成本
    outputCost: numeric("output_cost", { precision: 10, scale: 6 }), // 输出成本
    totalCost: numeric("total_cost", { precision: 10, scale: 6 }), // 总成本
    responseTime: integer("response_time"), // 响应时间（毫秒）
    status: varchar("status", { length: 20 }).notNull(), // 状态: success, error, timeout
    errorMessage: text("error_message"), // 错误信息
    metadata: jsonb("metadata").default("{}"), // 元数据
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    organizationIdIdx: index("ai_model_usage_organization_id_idx").on(table.organizationId),
    modelIdIdx: index("ai_model_usage_model_id_idx").on(table.modelId),
    providerIdIdx: index("ai_model_usage_provider_id_idx").on(table.providerId),
    sessionIdIdx: index("ai_model_usage_session_id_idx").on(table.sessionId),
    operationTypeIdx: index("ai_model_usage_operation_type_idx").on(table.operationType),
    statusIdx: index("ai_model_usage_status_idx").on(table.status),
    createdAtIdx: index("ai_model_usage_created_at_idx").on(table.createdAt),
  })
);

// AI模型使用记录表（下划线式导出）
exports.ai_model_usage = exports.aiModelUsage;

// AI预算设置表
exports.aiBudgetSettings = pgTable(
  "ai_budget_settings",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id", { length: 255 }).notNull().unique(), // 组织ID（用于多租户）
    monthlyBudget: numeric("monthly_budget", { precision: 10, scale: 2 }).notNull(), // 月度预算（元）
    dailyBudget: numeric("daily_budget", { precision: 10, scale: 2 }).notNull(), // 日预算（元）
    warningThreshold: numeric("warning_threshold", { precision: 5, scale: 2 }).notNull(), // 预警阈值（0-1）
    criticalThreshold: numeric("critical_threshold", { precision: 5, scale: 2 }).notNull(), // 严重阈值（0-1）
    enabled: boolean("enabled").notNull().default(true), // 是否启用预算控制
    notificationEnabled: boolean("notification_enabled").notNull().default(true), // 是否启用通知
    notificationMethods: jsonb("notification_methods").default("[]"), // 通知方式配置
    metadata: jsonb("metadata").default("{}"), // 元数据
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdIdx: index("ai_budget_settings_organization_id_idx").on(table.organizationId),
    enabledIdx: index("ai_budget_settings_enabled_idx").on(table.enabled),
  })
);

// AI预算设置表（下划线式导出）
exports.ai_budget_settings = exports.aiBudgetSettings;

// ============================================
// 工作人员协同功能表
// ============================================

// 工作人员消息表
exports.staffMessages = pgTable(
  "staff_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    messageId: varchar("message_id", { length: 255 }).notNull().unique(),
    staffUserId: varchar("staff_user_id", { length: 255 }).notNull(),
    staffName: varchar("staff_name", { length: 255 }),
    content: text("content").notNull(),
    messageType: varchar("message_type", { length: 50 }).default('reply'),
    isHandlingCommand: boolean("is_handling_command").default(false),
    linkedRiskId: varchar("linked_risk_id", { length: 36 }),
    createdAt: timestamp("created_at").defaultNow(),
    timestamp: timestamp("timestamp"),
  },
  (table) => ({
    sessionIdIdx: index("staff_messages_session_id_idx").on(table.sessionId),
    staffUserIdIdx: index("staff_messages_staff_user_id_idx").on(table.staffUserId),
    createdAtIdx: index("staff_messages_created_at_idx").on(table.createdAt),
    messageTypeIdx: index("staff_messages_message_type_idx").on(table.messageType),
  })
);

// 工作人员活动记录表
exports.staffActivities = pgTable(
  "staff_activities",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    staffUserId: varchar("staff_user_id", { length: 255 }).notNull(),
    staffName: varchar("staff_name", { length: 255 }),
    activityType: varchar("activity_type", { length: 50 }).notNull(),
    activityDetail: text("activity_detail"),
    messageId: varchar("message_id", { length: 255 }),
    riskId: varchar("risk_id", { length: 36 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index("staff_activities_session_id_idx").on(table.sessionId),
    staffUserIdIdx: index("staff_activities_staff_user_id_idx").on(table.staffUserId),
    activityTypeIdx: index("staff_activities_activity_type_idx").on(table.activityType),
  })
);

// 会话工作人员状态表
exports.sessionStaffStatus = pgTable(
  "session_staff_status",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
    hasStaffParticipated: boolean("has_staff_participated").default(false),
    currentStaffUserId: varchar("current_staff_user_id", { length: 255 }),
    staffJoinTime: timestamp("staff_join_time"),
    staffLeaveTime: timestamp("staff_leave_time"),
    staffMessageCount: integer("staff_message_count").default(0),
    lastStaffActivity: timestamp("last_staff_activity"),
    collaborationMode: varchar("collaboration_mode", { length: 50 }).default('adaptive'),
    aiReplyStrategy: varchar("ai_reply_strategy", { length: 50 }).default('normal'),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index("session_staff_status_session_id_idx").on(table.sessionId),
    currentStaffIdx: index("session_staff_status_current_staff_user_id_idx").on(table.currentStaffUserId),
    hasStaffIdx: index("session_staff_status_has_staff_participated_idx").on(table.hasStaffParticipated),
  })
);

// 信息检测历史表
exports.infoDetectionHistory = pgTable(
  "info_detection_history",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    messageId: varchar("message_id", { length: 255 }).notNull().unique(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    hasRisk: boolean("has_risk").default(false),
    riskLevel: varchar("risk_level", { length: 20 }),
    riskScore: numeric("risk_score", { precision: 3, scale: 2 }),
    satisfactionLevel: varchar("satisfaction_level", { length: 20 }),
    satisfactionScore: numeric("satisfaction_score", { precision: 3, scale: 2 }),
    sentiment: varchar("sentiment", { length: 20 }),
    sentimentConfidence: numeric("sentiment_confidence", { precision: 3, scale: 2 }),
    urgencyLevel: varchar("urgency_level", { length: 20 }),
    urgencyScore: numeric("urgency_score", { precision: 3, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("info_detection_history_message_id_idx").on(table.messageId),
    sessionIdIdx: index("info_detection_history_session_id_idx").on(table.sessionId),
    riskLevelIdx: index("info_detection_history_risk_level_idx").on(table.riskLevel),
  })
);

// 协同决策日志表
exports.collaborationDecisionLogs = pgTable(
  "collaboration_decision_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    messageId: varchar("message_id", { length: 255 }),
    robotId: varchar("robot_id", { length: 255 }),
    shouldAiReply: boolean("should_ai_reply"),
    aiAction: varchar("ai_action", { length: 50 }),
    staffAction: varchar("staff_action", { length: 50 }),
    priority: varchar("priority", { length: 20 }),
    reason: varchar("reason", { length: 255 }),
    staffContext: text("staff_context"),
    infoContext: text("info_context"),
    strategy: text("strategy"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index("collaboration_decision_logs_session_id_idx").on(table.sessionId),
    createdAtIdx: index("collaboration_decision_logs_created_at_idx").on(table.createdAt),
    priorityIdx: index("collaboration_decision_logs_priority_idx").on(table.priority),
  })
);

// 风险消息表
exports.riskMessages = pgTable(
  "risk_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    messageId: varchar("message_id", { length: 255 }),
    sessionId: varchar("session_id", { length: 255 }),
    userId: varchar("user_id", { length: 255 }),
    userName: varchar("user_name", { length: 255 }),
    groupName: varchar("group_name", { length: 255 }),
    content: text("content"),
    aiReply: text("ai_reply"),
    status: varchar("status", { length: 50 }).default("pending"),
    resolvedBy: varchar("resolved_by", { length: 255 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    handledByStaff: jsonb("handled_by_staff").default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("risk_messages_message_id_idx").on(table.messageId),
    sessionIdIdx: index("risk_messages_session_id_idx").on(table.sessionId),
    statusIdx: index("risk_messages_status_idx").on(table.status),
  })
);

// 系统日志表
exports.systemLogs = pgTable(
  "system_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    level: varchar("level", { length: 20 }).notNull(),
    module: varchar("module", { length: 100 }),
    message: text("message"),
    data: jsonb("data").default("{}"),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
    environment: varchar("environment", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    levelIdx: index("system_logs_level_idx").on(table.level),
    moduleIdx: index("system_logs_module_idx").on(table.module),
    timestampIdx: index("system_logs_timestamp_idx").on(table.timestamp),
  })
);

// ============================================
// 会话管理表
// ============================================

// 会话表（会话管理）
exports.sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
    userId: varchar("user_id", { length: 255 }),
    groupId: varchar("group_id", { length: 255 }),
    userName: varchar("user_name", { length: 255 }),
    groupName: varchar("group_name", { length: 255 }),
    roomType: integer("room_type"),
    status: varchar("status", { length: 50 }).default("auto"),
    context: jsonb("context").default("[]"),
    messageCount: integer("message_count").default(0),
    lastIntent: varchar("last_intent", { length: 100 }),
    intentConfidence: numeric("intent_confidence"),
    lastProcessedAt: timestamp("last_processed_at", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    robotId: varchar("robot_id", { length: 255 }),
    robotName: varchar("robot_name", { length: 255 }),
  },
  (table) => ({
    sessionIdIdx: index("sessions_session_id_idx").on(table.sessionId),
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    groupIdIdx: index("sessions_group_id_idx").on(table.groupId),
    statusIdx: index("sessions_status_idx").on(table.status),
    lastProcessedAtIdx: index("sessions_last_processed_at_idx").on(table.lastProcessedAt),
    robotIdIdx: index("sessions_robot_id_idx").on(table.robotId),
  })
);

// ============================================
// 执行追踪表
// ============================================

// 执行追踪表（消息处理流程追踪）
exports.execution_tracking = pgTable(
  "execution_tracking",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    processingId: varchar("processing_id", { length: 255 }).notNull().unique(),
    robotId: varchar("robot_id", { length: 255 }),
    robotName: varchar("robot_name", { length: 255 }),
    messageId: varchar("message_id", { length: 255 }),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }),
    groupId: varchar("group_id", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("processing"),
    steps: jsonb("steps").default("{}"),
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    processingTime: integer("processing_time"),
    decision: jsonb("decision"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    processingIdIdx: index("execution_tracking_processing_id_idx").on(table.processingId),
    sessionIdIdx: index("execution_tracking_session_id_idx").on(table.sessionId),
    statusIdx: index("execution_tracking_status_idx").on(table.status),
    createdAtIdx: index("execution_tracking_created_at_idx").on(table.createdAt),
  })
);

// ============================================
// 机器人权限表
// ============================================

// 机器人权限表（管理用户对机器人的访问权限）
exports.robotPermissions = pgTable(
  "robot_permissions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull(), // 用户ID
    robotId: varchar("robot_id", { length: 36 }).notNull(), // 机器人ID
    robotName: varchar("robot_name", { length: 255 }), // 机器人名称（冗余，便于查询）
    permissionType: varchar("permission_type", { length: 20 }).notNull().default("read"), // 权限类型: read, write, admin
    canView: boolean("can_view").default(true).notNull(), // 是否可以查看
    canEdit: boolean("can_edit").default(false).notNull(), // 是否可以编辑
    canDelete: boolean("can_delete").default(false).notNull(), // 是否可以删除
    canSendMessage: boolean("can_send_message").default(true).notNull(), // 是否可以发送消息
    canViewSessions: boolean("can_view_sessions").default(true).notNull(), // 是否可以查看会话
    canViewMessages: boolean("can_view_messages").default(true).notNull(), // 是否可以查看消息
    assignedBy: varchar("assigned_by", { length: 36 }), // 分配者ID
    assignedByName: varchar("assigned_by_name", { length: 255 }), // 分配者名称
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(), // 分配时间
    isActive: boolean("is_active").default(true).notNull(), // 是否激活
    notes: text("notes"), // 备注
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("robot_permissions_user_id_idx").on(table.userId),
    robotIdIdx: index("robot_permissions_robot_id_idx").on(table.robotId),
    permissionTypeIdx: index("robot_permissions_permission_type_idx").on(table.permissionType),
    isActiveIdx: index("robot_permissions_is_active_idx").on(table.isActive),
    assignedByIdx: index("robot_permissions_assigned_by_idx").on(table.assignedBy),
    uniqueUserRobot: index("robot_permissions_user_robot_idx").on(table.userId, table.robotId),
  })
);

// ============================================
// 协同分析相关表
// ============================================



// 会话工作人员状态表
