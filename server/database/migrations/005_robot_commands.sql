-- 多机器人架构支持 - 第二阶段：指令发送和会话管理
-- 执行时间：2025-02-03

-- 1. 创建机器人指令表
CREATE TABLE IF NOT EXISTS robot_commands (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL, -- 机器人ID
    command_type VARCHAR(50) NOT NULL, -- 指令类型：send_message, broadcast, set_config, etc.
    command_data JSONB NOT NULL, -- 指令数据
    priority INTEGER DEFAULT 10, -- 指令优先级
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 状态：pending, sent, failed, cancelled
    retry_count INTEGER DEFAULT 0, -- 重试次数
    max_retries INTEGER DEFAULT 3, -- 最大重试次数
    error_message TEXT, -- 错误信息
    sent_at TIMESTAMP, -- 发送时间
    completed_at TIMESTAMP, -- 完成时间
    created_by VARCHAR(255), -- 创建者
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建机器人指令队列表（用于批量发送和调度）
CREATE TABLE IF NOT EXISTS robot_command_queue (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id VARCHAR(36) REFERENCES robot_commands(id) ON DELETE CASCADE,
    robot_id VARCHAR(255) NOT NULL,
    queue_position INTEGER NOT NULL, -- 队列位置
    scheduled_at TIMESTAMP, -- 计划执行时间
    processing_started_at TIMESTAMP, -- 开始处理时间
    is_locked BOOLEAN DEFAULT false, -- 是否锁定
    locked_at TIMESTAMP, -- 锁定时间
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 扩展 sessions 表，增强机器人关联
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS robot_group_id VARCHAR(36), -- 机器人分组ID
ADD COLUMN IF NOT EXISTS robot_role VARCHAR(50), -- 机器人角色
ADD COLUMN IF NOT EXISTS robot_capabilities JSONB, -- 机器人能力快照
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP, -- 分配时间
ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(255), -- 分配者
ADD COLUMN IF NOT EXISTS robot_switch_count INTEGER DEFAULT 0, -- 机器人切换次数
ADD COLUMN IF NOT EXISTS last_robot_switch_at TIMESTAMP, -- 最后切换时间
ADD COLUMN IF NOT EXISTS session_context JSONB DEFAULT '{}', -- 会话上下文（存储机器人级别的上下文）
ADD COLUMN IF NOT EXISTS ai_model_used VARCHAR(100), -- 使用的AI模型
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}'; -- 会话性能指标

-- 4. 创建会话消息表（增强版本，支持机器人级别的消息管理）
CREATE TABLE IF NOT EXISTS session_messages_v2 (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    robot_id VARCHAR(255) NOT NULL, -- 发送/接收消息的机器人ID
    robot_group_id VARCHAR(36), -- 机器人分组ID
    message_sequence INTEGER NOT NULL, -- 消息序号（保证顺序）
    is_from_user BOOLEAN NOT NULL DEFAULT false,
    is_human BOOLEAN NOT NULL DEFAULT false,
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    group_id VARCHAR(255),
    group_name VARCHAR(255),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 消息类型：text, image, file, voice, etc.
    intent VARCHAR(50), -- 意图
    ai_confidence DECIMAL(5,4), -- AI置信度
    response_time INTEGER, -- 响应时间（毫秒）
    extra_data JSONB, -- 额外数据
    command_id VARCHAR(36) REFERENCES robot_commands(id) ON DELETE SET NULL, -- 关联的指令ID
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS robot_commands_robot_id_idx ON robot_commands(robot_id);
CREATE INDEX IF NOT EXISTS robot_commands_status_idx ON robot_commands(status);
CREATE INDEX IF NOT EXISTS robot_commands_priority_idx ON robot_commands(priority);
CREATE INDEX IF NOT EXISTS robot_commands_created_at_idx ON robot_commands(created_at);
CREATE INDEX IF NOT EXISTS robot_commands_command_type_idx ON robot_commands(command_type);

CREATE INDEX IF NOT EXISTS robot_command_queue_robot_id_idx ON robot_command_queue(robot_id);
CREATE INDEX IF NOT EXISTS robot_command_queue_queue_position_idx ON robot_command_queue(queue_position);
CREATE INDEX IF NOT EXISTS robot_command_queue_scheduled_at_idx ON robot_command_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS robot_command_queue_is_locked_idx ON robot_command_queue(is_locked);

CREATE INDEX IF NOT EXISTS idx_sessions_robot_group_id ON sessions(robot_group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_assigned_at ON sessions(assigned_at);
CREATE INDEX IF NOT EXISTS idx_sessions_robot_switch_count ON sessions(robot_switch_count);
CREATE INDEX IF NOT EXISTS idx_sessions_last_robot_switch_at ON sessions(last_robot_switch_at);

CREATE INDEX IF NOT EXISTS session_messages_v2_session_id_idx ON session_messages_v2(session_id);
CREATE INDEX IF NOT EXISTS session_messages_v2_robot_id_idx ON session_messages_v2(robot_id);
CREATE INDEX IF NOT EXISTS session_messages_v2_message_sequence_idx ON session_messages_v2(session_id, message_sequence);
CREATE INDEX IF NOT EXISTS session_messages_v2_is_from_user_idx ON session_messages_v2(is_from_user);
CREATE INDEX IF NOT EXISTS session_messages_v2_intent_idx ON session_messages_v2(intent);
CREATE INDEX IF NOT EXISTS session_messages_v2_created_at_idx ON session_messages_v2(created_at);

-- 添加注释
COMMENT ON TABLE robot_commands IS '机器人指令表，记录所有发送给机器人的指令';
COMMENT ON TABLE robot_command_queue IS '机器人指令队列表，用于批量发送和调度';
COMMENT ON COLUMN robot_commands.command_type IS '指令类型：send_message, broadcast, set_config, get_status, etc.';
COMMENT ON COLUMN robot_commands.command_data IS '指令数据 JSON: {"target": "user_id", "message": "Hello"}';
COMMENT ON COLUMN robot_commands.priority IS '指令优先级，数值越大优先级越高';
COMMENT ON COLUMN robot_commands.status IS '状态：pending, sent, failed, cancelled';

COMMENT ON COLUMN sessions.robot_group_id IS '机器人分组ID';
COMMENT ON COLUMN sessions.robot_role IS '机器人角色';
COMMENT ON COLUMN sessions.robot_capabilities IS '机器人能力快照';
COMMENT ON COLUMN sessions.assigned_at IS '分配给机器人的时间';
COMMENT ON COLUMN sessions.assigned_by IS '分配者';
COMMENT ON COLUMN sessions.robot_switch_count IS '机器人切换次数';
COMMENT ON COLUMN sessions.session_context IS '会话上下文（存储机器人级别的上下文）';

COMMENT ON TABLE session_messages_v2 IS '会话消息表（增强版本）';
COMMENT ON COLUMN session_messages_v2.robot_id IS '发送/接收消息的机器人ID';
COMMENT ON COLUMN session_messages_v2.message_sequence IS '消息序号（保证顺序）';
COMMENT ON COLUMN session_messages_v2.message_type IS '消息类型：text, image, file, voice, video, etc.';
COMMENT ON COLUMN session_messages_v2.ai_confidence IS 'AI置信度（0-1）';
COMMENT ON COLUMN session_messages_v2.response_time IS '响应时间（毫秒）';
COMMENT ON COLUMN session_messages_v2.command_id IS '关联的指令ID（如果是机器人发送的消息）';
