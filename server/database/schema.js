const { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index } = require('drizzle-orm/pg-core');
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
    nickname: varchar("nickname", { length: 255 }), // 机器人昵称（从WorkTool API获取）
    company: varchar("company", { length: 255 }), // 企业名称（从WorkTool API获取）
    ipAddress: varchar("ip_address", { length: 45 }), // IP地址（支持IPv6）
    isValid: boolean("is_valid").notNull().default(true), // 是否有效（从WorkTool API获取）
    activatedAt: timestamp("activated_at", { withTimezone: true }), // 启用时间（从WorkTool API获取）
    expiresAt: timestamp("expires_at", { withTimezone: true }), // 到期时间（从WorkTool API获取）
    messageCallbackEnabled: boolean("message_callback_enabled").notNull().default(false), // 消息回调是否开启（从WorkTool API获取）
    extraData: jsonb("extra_data"), // 额外数据（JSON格式，存储其他WorkTool返回的信息）

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

// AI IO 日志表
exports.aiIoLogs = pgTable(
  "ai_io_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }), // 关联的会话ID
    messageId: varchar("message_id", { length: 255 }), // 关联的消息ID
    robotId: varchar("robot_id", { length: 64 }), // 机器人ID
    robotName: varchar("robot_name", { length: 255 }), // 机器人名称
    operationType: varchar("operation_type", { length: 50 }).notNull(), // 操作类型: intent_recognition, service_reply, chat_reply, report
    aiInput: text("ai_input").notNull(), // 发送给 AI 的输入（prompt）
    aiOutput: text("ai_output"), // AI 返回的输出
    modelId: varchar("model_id", { length: 255 }), // 使用的 AI 模型 ID
    temperature: varchar("temperature", { length: 10 }), // 温度参数
    requestDuration: integer("request_duration"), // 请求耗时（毫秒）
    status: varchar("status", { length: 20 }).notNull(), // 状态: success, error, timeout
    errorMessage: text("error_message"), // 错误信息
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionIdIdx: index("ai_io_logs_session_id_idx").on(table.sessionId),
    messageIdIdx: index("ai_io_logs_message_id_idx").on(table.messageId),
    robotIdIdx: index("ai_io_logs_robot_id_idx").on(table.robotId),
    operationTypeIdx: index("ai_io_logs_operation_type_idx").on(table.operationType),
    statusIdx: index("ai_io_logs_status_idx").on(table.status),
    createdAtIdx: index("ai_io_logs_created_at_idx").on(table.createdAt),
  })
);

// 运营日志表
exports.operationLogs = pgTable(
  "operation_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    module: varchar("module", { length: 50 }).notNull(), // 模块: robots, callbacks, ai, sessions, etc.
    operation: varchar("operation", { length: 50 }).notNull(), // 操作: create, update, delete, start, stop, etc.
    operatorId: varchar("operator_id", { length: 36 }), // 操作人ID
    operatorName: varchar("operator_name", { length: 255 }), // 操作人名称
    targetId: varchar("target_id", { length: 36 }), // 目标对象ID
    targetType: varchar("target_type", { length: 50 }), // 目标对象类型: robot, callback, ai_config, etc.
    description: text("description"), // 操作描述
    extraData: jsonb("extra_data"), // 额外数据（JSON格式）
    ipAddress: varchar("ip_address", { length: 45 }), // 操作IP地址
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    moduleIdx: index("operation_logs_module_idx").on(table.module),
    operationIdx: index("operation_logs_operation_idx").on(table.operation),
    operatorIdIdx: index("operation_logs_operator_id_idx").on(table.operatorId),
    targetIdIdx: index("operation_logs_target_id_idx").on(table.targetId),
    createdAtIdx: index("operation_logs_created_at_idx").on(table.createdAt),
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
    nickname: varchar("nickname", { length: 255 }), // 机器人昵称（从WorkTool API获取）
    company: varchar("company", { length: 255 }), // 企业名称（从WorkTool API获取）
    ipAddress: varchar("ip_address", { length: 45 }), // IP地址（支持IPv6）
    isValid: boolean("is_valid").notNull().default(true), // 是否有效（从WorkTool API获取）
    activatedAt: timestamp("activated_at", { withTimezone: true }), // 启用时间（从WorkTool API获取）
    expiresAt: timestamp("expires_at", { withTimezone: true }), // 到期时间（从WorkTool API获取）
    messageCallbackEnabled: boolean("message_callback_enabled").notNull().default(false), // 消息回调是否开启（从WorkTool API获取）
    extraData: jsonb("extra_data"), // 额外数据（JSON格式，存储其他WorkTool返回的信息）

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

// AI IO 日志表
exports.aiIoLogs = pgTable(
  "ai_io_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }), // 关联的会话ID
    messageId: varchar("message_id", { length: 255 }), // 关联的消息ID
    robotId: varchar("robot_id", { length: 64 }), // 机器人ID
    robotName: varchar("robot_name", { length: 255 }), // 机器人名称
    operationType: varchar("operation_type", { length: 50 }).notNull(), // 操作类型: intent_recognition, service_reply, chat_reply, report
    aiInput: text("ai_input").notNull(), // 发送给 AI 的输入（prompt）
    aiOutput: text("ai_output"), // AI 返回的输出
    modelId: varchar("model_id", { length: 255 }), // 使用的 AI 模型 ID
    temperature: varchar("temperature", { length: 10 }), // 温度参数
    requestDuration: integer("request_duration"), // 请求耗时（毫秒）
    status: varchar("status", { length: 20 }).notNull(), // 状态: success, error, timeout
    errorMessage: text("error_message"), // 错误信息
    extraData: jsonb("extra_data"), // 额外数据（JSON格式）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionIdIdx: index("ai_io_logs_session_id_idx").on(table.sessionId),
    messageIdIdx: index("ai_io_logs_message_id_idx").on(table.messageId),
    robotIdIdx: index("ai_io_logs_robot_id_idx").on(table.robotId),
    operationTypeIdx: index("ai_io_logs_operation_type_idx").on(table.operationType),
    statusIdx: index("ai_io_logs_status_idx").on(table.status),
    createdAtIdx: index("ai_io_logs_created_at_idx").on(table.createdAt),
  })
);

// 运营日志表
exports.operationLogs = pgTable(
  "operation_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }), // 操作用户ID
    username: varchar("username", { length: 64 }), // 操作用户名
    action: varchar("action", { length: 100 }).notNull(), // 操作动作
    module: varchar("module", { length: 50 }).notNull(), // 操作模块: robot, session, ai, config, etc.
    targetId: varchar("target_id", { length: 255 }), // 目标对象ID
    targetType: varchar("target_type", { length: 50 }), // 目标对象类型: robot, session, setting, etc.
    description: text("description"), // 操作描述
    ipAddress: varchar("ip_address", { length: 45 }), // 操作 IP 地址
    userAgent: text("user_agent"), // 用户代理（浏览器信息）
    requestData: jsonb("request_data"), // 请求数据（JSON格式）
    responseData: jsonb("response_data"), // 响应数据（JSON格式）
    status: varchar("status", { length: 20 }).notNull(), // 状态: success, error
    errorMessage: text("error_message"), // 错误信息
    duration: integer("duration"), // 操作耗时（毫秒）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("operation_logs_user_id_idx").on(table.userId),
    actionIdx: index("operation_logs_action_idx").on(table.action),
    moduleIdx: index("operation_logs_module_idx").on(table.module),
    targetIdIdx: index("operation_logs_target_id_idx").on(table.targetId),
    statusIdx: index("operation_logs_status_idx").on(table.status),
    createdAtIdx: index("operation_logs_created_at_idx").on(table.createdAt),
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

exports.insertSessionMessageSchema = z.object({
  sessionId: z.string().min(1).max(255),
  messageId: z.string().max(255).optional(),
  userId: z.string().max(255).optional(),
  groupId: z.string().max(255).optional(),
  userName: z.string().max(255).optional(),
  groupName: z.string().max(255).optional(),
  content: z.string().min(1),
  isFromUser: z.boolean().optional(),
  isFromBot: z.boolean().optional(),
  isHuman: z.boolean().optional(),
  intent: z.string().max(50).optional(),
  timestamp: z.date().optional(),
  extraData: z.any().optional(),
});

// ==================== 告警增强功能表 ====================

// 告警分组表
exports.alertGroups = pgTable(
  "alert_groups",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    groupName: varchar("group_name", { length: 100 }).notNull().unique(),
    groupCode: varchar("group_code", { length: 50 }).notNull().unique(),
    groupDescription: text("group_description"),
    groupColor: varchar("group_color", { length: 20 }).default("#3B82F6"),
    sortOrder: integer("sort_order").default(0),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    groupNameIdx: index("alert_groups_group_name_idx").on(table.groupName),
    groupCodeIdx: index("alert_groups_group_code_idx").on(table.groupCode),
    sortOrderIdx: index("alert_groups_sort_order_idx").on(table.sortOrder),
  })
);

// 告警升级历史表
exports.alertUpgrades = pgTable(
  "alert_upgrades",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    alertId: varchar("alert_id", { length: 36 }).notNull(),
    fromLevel: integer("from_level").notNull(),
    toLevel: integer("to_level").notNull(),
    escalateReason: text("escalate_reason"),
    escalateMethod: varchar("escalate_method", { length: 50 }),
    escalateConfig: jsonb("escalate_config"),
    escalatedAt: timestamp("escalated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    escalatedBy: varchar("escalated_by", { length: 100 }),
  },
  (table) => ({
    alertIdIdx: index("alert_upgrades_alert_id_idx").on(table.alertId),
    escalatedAtIdx: index("alert_upgrades_escalated_at_idx").on(table.escalatedAt),
  })
);

// 告警批量操作记录表
exports.alertBatchOperations = pgTable(
  "alert_batch_operations",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operationType: varchar("operation_type", { length: 50 }).notNull(),
    operationStatus: varchar("operation_status", { length: 20 }).default("pending"),
    totalCount: integer("total_count").default(0),
    successCount: integer("success_count").default(0),
    failedCount: integer("failed_count").default(0),
    filterConditions: jsonb("filter_conditions"),
    operationResult: jsonb("operation_result"),
    createdBy: varchar("created_by", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    operationTypeIdx: index("alert_batch_operations_operation_type_idx").on(table.operationType),
    operationStatusIdx: index("alert_batch_operations_operation_status_idx").on(table.operationStatus),
    createdAtIdx: index("alert_batch_operations_created_at_idx").on(table.createdAt),
  })
);

// 告警统计快照表（用于趋势分析）
exports.alertStatsSnapshots = pgTable(
  "alert_stats_snapshots",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    statDate: timestamp("stat_date", { withTimezone: false }).notNull(),
    statHour: integer("stat_hour"),
    totalCount: integer("total_count").default(0),
    criticalCount: integer("critical_count").default(0),
    warningCount: integer("warning_count").default(0),
    infoCount: integer("info_count").default(0),
    handledCount: integer("handled_count").default(0),
    escalatedCount: integer("escalated_count").default(0),
    avgResponseTime: timestamp("avg_response_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statDateIdx: index("alert_stats_snapshots_stat_date_idx").on(table.statDate),
    statHourIdx: index("alert_stats_snapshots_stat_hour_idx").on(table.statHour),
    statUniqueIdx: index("alert_stats_snapshots_stat_unique_idx").on(table.statDate, table.statHour),
  })
);

// 机器人指令表
exports.robotCommands = pgTable(
  "robot_commands",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    robotId: varchar("robot_id", { length: 64 }).notNull(),
    commandType: varchar("command_type", { length: 50 }).notNull(),
    commandData: jsonb("command_data").notNull(),
    priority: integer("priority").notNull().default(5),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    errorMessage: text("error_message"),
    result: jsonb("result"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    robotIdIdx: index("robot_commands_robot_id_idx").on(table.robotId),
    statusIdx: index("robot_commands_status_idx").on(table.status),
    priorityIdx: index("robot_commands_priority_idx").on(table.priority),
    createdAtIdx: index("robot_commands_created_at_idx").on(table.createdAt),
  })
);

// 机器人指令队列表
exports.robotCommandQueue = pgTable(
  "robot_command_queue",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    commandId: varchar("command_id", { length: 36 }).notNull(),
    robotId: varchar("robot_id", { length: 64 }).notNull(),
    priority: integer("priority").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: varchar("locked_by", { length: 100 }),
    retryCount: integer("retry_count").notNull().default(0),
  },
  (table) => ({
    commandIdIdx: index("robot_command_queue_command_id_idx").on(table.commandId).unique(),
    statusIdx: index("robot_command_queue_status_idx").on(table.status),
    priorityIdx: index("robot_command_queue_priority_idx").on(table.priority),
    scheduledForIdx: index("robot_command_queue_scheduled_for_idx").on(table.scheduledFor),
    robotIdIdx: index("robot_command_queue_robot_id_idx").on(table.robotId),
  })
);
