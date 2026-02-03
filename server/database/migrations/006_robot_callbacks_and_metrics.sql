-- 多机器人架构支持 - 第三阶段：回调中心优化和机器人监控
-- 执行时间：2025-02-03

-- 1. 创建机器人回调日志表
CREATE TABLE IF NOT EXISTS robot_callback_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL,
    robot_group_id VARCHAR(36),
    callback_type VARCHAR(50) NOT NULL, -- 回调类型：message, event, status, etc.
    event_type VARCHAR(50), -- 事件类型：text, image, voice, enter, exit, etc.
    source_ip VARCHAR(45), -- 来源IP
    request_id VARCHAR(255), -- 请求ID
    request_headers JSONB, -- 请求头
    request_body JSONB, -- 请求体
    response_status INTEGER, -- 响应状态码
    response_body JSONB, -- 响应体
    processing_time INTEGER, -- 处理时间（毫秒）
    is_success BOOLEAN NOT NULL DEFAULT false, -- 是否成功
    error_message TEXT, -- 错误信息
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建机器人性能指标表
CREATE TABLE IF NOT EXISTS robot_performance_metrics (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL,
    robot_group_id VARCHAR(36),
    metric_type VARCHAR(50) NOT NULL, -- 指标类型：response_time, success_rate, error_rate, etc.
    metric_value DECIMAL(20,4) NOT NULL, -- 指标值
    metric_unit VARCHAR(20), -- 单位：ms, %, count, etc.
    time_window VARCHAR(20) NOT NULL, -- 时间窗口：1m, 5m, 15m, 1h, 1d
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    extra_data JSONB -- 额外数据
);

-- 3. 创建机器人状态历史表（用于追踪状态变化）
CREATE TABLE IF NOT EXISTS robot_status_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL,
    robot_group_id VARCHAR(36),
    old_status VARCHAR(20), -- 旧状态
    new_status VARCHAR(20) NOT NULL, -- 新状态
    change_reason TEXT, -- 变更原因
    changed_by VARCHAR(255), -- 变更者
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. 创建机器人错误日志表
CREATE TABLE IF NOT EXISTS robot_error_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL,
    robot_group_id VARCHAR(36),
    error_type VARCHAR(50) NOT NULL, -- 错误类型：callback_error, api_error, system_error, etc.
    error_code VARCHAR(50), -- 错误代码
    error_message TEXT NOT NULL, -- 错误信息
    error_stack TEXT, -- 错误堆栈
    request_id VARCHAR(255), -- 关联的请求ID
    command_id VARCHAR(36) REFERENCES robot_commands(id) ON DELETE SET NULL, -- 关联的指令ID
    session_id VARCHAR(255), -- 关联的会话ID
    extra_data JSONB, -- 额外数据
    is_resolved BOOLEAN NOT NULL DEFAULT false, -- 是否已解决
    resolved_at TIMESTAMP, -- 解决时间
    resolved_by VARCHAR(255), -- 解决者
    resolution_note TEXT, -- 解决说明
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. 创建机器人负载均衡表
CREATE TABLE IF NOT EXISTS robot_load_balancing (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL UNIQUE,
    robot_group_id VARCHAR(36),
    current_sessions INTEGER NOT NULL DEFAULT 0, -- 当前会话数
    max_sessions INTEGER NOT NULL DEFAULT 100, -- 最大会话数
    cpu_usage DECIMAL(5,2), -- CPU使用率
    memory_usage DECIMAL(5,2), -- 内存使用率
    avg_response_time INTEGER, -- 平均响应时间（毫秒）
    success_rate DECIMAL(5,4), -- 成功率
    error_count INTEGER DEFAULT 0, -- 错误次数
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    health_score DECIMAL(5,2) NOT NULL DEFAULT 100, -- 健康评分（0-100）
    is_available BOOLEAN NOT NULL DEFAULT true -- 是否可用
);

-- 6. 创建机器人能力表
CREATE TABLE IF NOT EXISTS robot_capabilities (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL UNIQUE,
    capabilities JSONB NOT NULL, -- 能力列表
    enabled_abilities JSONB NOT NULL DEFAULT '[]', -- 启用的能力
    disabled_abilities JSONB NOT NULL DEFAULT '[]', -- 禁用的能力
    version VARCHAR(20), -- 能力版本
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS robot_callback_logs_robot_id_idx ON robot_callback_logs(robot_id);
CREATE INDEX IF NOT EXISTS robot_callback_logs_callback_type_idx ON robot_callback_logs(callback_type);
CREATE INDEX IF NOT EXISTS robot_callback_logs_event_type_idx ON robot_callback_logs(event_type);
CREATE INDEX IF NOT EXISTS robot_callback_logs_is_success_idx ON robot_callback_logs(is_success);
CREATE INDEX IF NOT EXISTS robot_callback_logs_created_at_idx ON robot_callback_logs(created_at);
CREATE INDEX IF NOT EXISTS robot_callback_logs_request_id_idx ON robot_callback_logs(request_id);

CREATE INDEX IF NOT EXISTS robot_performance_metrics_robot_id_idx ON robot_performance_metrics(robot_id);
CREATE INDEX IF NOT EXISTS robot_performance_metrics_metric_type_idx ON robot_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS robot_performance_metrics_time_window_idx ON robot_performance_metrics(time_window);
CREATE INDEX IF NOT EXISTS robot_performance_metrics_recorded_at_idx ON robot_performance_metrics(recorded_at);

CREATE INDEX IF NOT EXISTS robot_status_history_robot_id_idx ON robot_status_history(robot_id);
CREATE INDEX IF NOT EXISTS robot_status_history_new_status_idx ON robot_status_history(new_status);
CREATE INDEX IF NOT EXISTS robot_status_history_created_at_idx ON robot_status_history(created_at);

CREATE INDEX IF NOT EXISTS robot_error_logs_robot_id_idx ON robot_error_logs(robot_id);
CREATE INDEX IF NOT EXISTS robot_error_logs_error_type_idx ON robot_error_logs(error_type);
CREATE INDEX IF NOT EXISTS robot_error_logs_is_resolved_idx ON robot_error_logs(is_resolved);
CREATE INDEX IF NOT EXISTS robot_error_logs_created_at_idx ON robot_error_logs(created_at);
CREATE INDEX IF NOT EXISTS robot_error_logs_command_id_idx ON robot_error_logs(command_id);
CREATE INDEX IF NOT EXISTS robot_error_logs_session_id_idx ON robot_error_logs(session_id);

CREATE INDEX IF NOT EXISTS robot_load_balancing_robot_id_idx ON robot_load_balancing(robot_id);
CREATE INDEX IF NOT EXISTS robot_load_balancing_health_score_idx ON robot_load_balancing(health_score);
CREATE INDEX IF NOT EXISTS robot_load_balancing_is_available_idx ON robot_load_balancing(is_available);

CREATE INDEX IF NOT EXISTS robot_capabilities_robot_id_idx ON robot_capabilities(robot_id);

-- 添加注释
COMMENT ON TABLE robot_callback_logs IS '机器人回调日志表，记录所有来自机器人的回调请求';
COMMENT ON COLUMN robot_callback_logs.callback_type IS '回调类型：message, event, status, heartbeat, etc.';
COMMENT ON COLUMN robot_callback_logs.event_type IS '事件类型：text, image, voice, enter, exit, mention, etc.';
COMMENT ON COLUMN robot_callback_logs.processing_time IS '处理时间（毫秒）';

COMMENT ON TABLE robot_performance_metrics IS '机器人性能指标表';
COMMENT ON COLUMN robot_performance_metrics.metric_type IS '指标类型：response_time, success_rate, error_rate, throughput, etc.';
COMMENT ON COLUMN robot_performance_metrics.time_window IS '时间窗口：1m, 5m, 15m, 1h, 1d';
COMMENT ON COLUMN robot_performance_metrics.metric_unit IS '单位：ms, %, count, etc.';

COMMENT ON TABLE robot_status_history IS '机器人状态历史表';
COMMENT ON COLUMN robot_status_history.change_reason IS '状态变更原因';

COMMENT ON TABLE robot_error_logs IS '机器人错误日志表';
COMMENT ON COLUMN robot_error_logs.error_type IS '错误类型：callback_error, api_error, system_error, validation_error, etc.';
COMMENT ON COLUMN robot_error_logs.is_resolved IS '是否已解决';

COMMENT ON TABLE robot_load_balancing IS '机器人负载均衡表，用于动态分配会话';
COMMENT ON COLUMN robot_load_balancing.health_score IS '健康评分（0-100），综合评估机器人性能';
COMMENT ON COLUMN robot_load_balancing.is_available IS '是否可用（健康且有容量）';

COMMENT ON TABLE robot_capabilities IS '机器人能力表';
COMMENT ON COLUMN robot_capabilities.capabilities IS '能力列表 JSON: ["chat", "reply", "broadcast", "file", "voice"]';
