-- 创建意图配置表
CREATE TABLE IF NOT EXISTS intent_configs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_type VARCHAR(50) NOT NULL UNIQUE,
    intent_name VARCHAR(100) NOT NULL,
    intent_description TEXT,
    system_prompt TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_type VARCHAR(50) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    alert_level VARCHAR(20) NOT NULL,
    threshold INTEGER DEFAULT 1,
    cooldown_period INTEGER DEFAULT 300,
    message_template TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建通知方式配置表
CREATE TABLE IF NOT EXISTS notification_methods (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_rule_id VARCHAR(36) NOT NULL,
    method_type VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    recipient_config JSONB,
    message_template TEXT,
    priority INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建告警历史表
CREATE TABLE IF NOT EXISTS alert_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255),
    alert_rule_id VARCHAR(36) NOT NULL,
    intent_type VARCHAR(50) NOT NULL,
    alert_level VARCHAR(20) NOT NULL,
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    group_id VARCHAR(255),
    group_name VARCHAR(255),
    message_content TEXT,
    alert_message TEXT NOT NULL,
    notification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notification_result JSONB,
    is_handled BOOLEAN NOT NULL DEFAULT false,
    handled_by VARCHAR(36),
    handled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS intent_configs_intent_type_idx ON intent_configs(intent_type);
CREATE INDEX IF NOT EXISTS intent_configs_is_enabled_idx ON intent_configs(is_enabled);

CREATE INDEX IF NOT EXISTS alert_rules_intent_type_idx ON alert_rules(intent_type);
CREATE INDEX IF NOT EXISTS alert_rules_alert_level_idx ON alert_rules(alert_level);
CREATE INDEX IF NOT EXISTS alert_rules_is_enabled_idx ON alert_rules(is_enabled);

CREATE INDEX IF NOT EXISTS notification_methods_alert_rule_id_idx ON notification_methods(alert_rule_id);
CREATE INDEX IF NOT EXISTS notification_methods_method_type_idx ON notification_methods(method_type);
CREATE INDEX IF NOT EXISTS notification_methods_is_enabled_idx ON notification_methods(is_enabled);
CREATE INDEX IF NOT EXISTS notification_methods_priority_idx ON notification_methods(priority);

CREATE INDEX IF NOT EXISTS alert_history_session_id_idx ON alert_history(session_id);
CREATE INDEX IF NOT EXISTS alert_history_alert_rule_id_idx ON alert_history(alert_rule_id);
CREATE INDEX IF NOT EXISTS alert_history_intent_type_idx ON alert_history(intent_type);
CREATE INDEX IF NOT EXISTS alert_history_alert_level_idx ON alert_history(alert_level);
CREATE INDEX IF NOT EXISTS alert_history_notification_status_idx ON alert_history(notification_status);
CREATE INDEX IF NOT EXISTS alert_history_created_at_idx ON alert_history(created_at);

-- 插入默认意图配置
INSERT INTO intent_configs (intent_type, intent_name, intent_description, system_prompt) VALUES
('service', '服务咨询', '用户咨询产品或服务相关问题', '你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- chat: 闲聊、问候、日常对话
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}'),
('help', '帮助请求', '用户需要使用帮助或指导', '你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- chat: 闲聊、问候、日常对话
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}'),
('chat', '闲聊', '日常闲聊、问候等非正式对话', '你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- chat: 闲聊、问候、日常对话
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}'),
('welcome', '欢迎', '新人入群欢迎语', '你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- chat: 闲聊、问候、日常对话
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}'),
('risk', '风险内容', '涉及敏感、恶意内容', '你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- chat: 闲聊、问候、日常对话
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}'),
('spam', '垃圾信息', '广告、刷屏等垃圾信息', '你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- chat: 闲聊、问候、日常对话
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}'),
('admin', '管理指令', '系统管理相关指令', '你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- chat: 闲聊、问候、日常对话
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}')
ON CONFLICT (intent_type) DO NOTHING;

-- 插入默认告警规则
INSERT INTO alert_rules (intent_type, rule_name, is_enabled, alert_level, threshold, cooldown_period, message_template) VALUES
('risk', '风险内容告警', true, 'critical', 1, 300, '⚠️ 风险内容告警\n\n用户 {userName} 在群组 {groupName} 发送了风险内容：\n{messageContent}\n\n请及时处理！'),
('spam', '垃圾信息告警', true, 'warning', 3, 600, '📢 垃圾信息告警\n\n用户 {userName} 在群组 {groupName} 多次发送垃圾信息。\n\n请关注！'),
('admin', '管理指令告警', true, 'info', 1, 60, '🔧 管理指令告警\n\n用户 {userName} 执行了管理指令：{messageContent}')
ON CONFLICT DO NOTHING;

-- 插入默认通知方式（示例）
-- 需要根据实际配置调整 recipient_config
INSERT INTO notification_methods (alert_rule_id, method_type, is_enabled, recipient_config, priority)
SELECT id, 'robot', true, '{"receivers": []}', 10
FROM alert_rules
WHERE intent_type IN ('risk', 'spam', 'admin')
ON CONFLICT DO NOTHING;
