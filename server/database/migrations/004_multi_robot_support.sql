-- 多机器人架构支持 - 第一阶段：机器人分组和角色管理
-- 执行时间：2025-02-03

-- 1. 创建机器人分组表
CREATE TABLE IF NOT EXISTS robot_groups (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- 分组颜色，用于前端展示
    icon VARCHAR(50), -- 分组图标
    priority INTEGER DEFAULT 10, -- 分组优先级
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建机器人角色表
CREATE TABLE IF NOT EXISTS robot_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB, -- 角色权限配置
    is_system BOOLEAN NOT NULL DEFAULT false, -- 是否系统角色
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 扩展 robots 表，添加多机器人支持字段
ALTER TABLE robots
ADD COLUMN IF NOT EXISTS group_ref VARCHAR(36),
ADD COLUMN IF NOT EXISTS role_ref VARCHAR(36),
ADD COLUMN IF NOT EXISTS capabilities JSONB, -- 机器人能力配置
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 10, -- 机器人优先级
ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 100, -- 最大并发会话数
ADD COLUMN IF NOT EXISTS current_session_count INTEGER DEFAULT 0, -- 当前会话数
ADD COLUMN IF NOT EXISTS enabled_intents JSONB, -- 启用的意图类型
ADD COLUMN IF NOT EXISTS ai_model_config JSONB, -- AI模型配置（覆盖全局配置）
ADD COLUMN IF NOT EXISTS response_config JSONB, -- 响应配置
ADD COLUMN IF NOT EXISTS load_balancing_weight INTEGER DEFAULT 1, -- 负载均衡权重
ADD COLUMN IF NOT EXISTS health_check_interval INTEGER DEFAULT 60, -- 健康检查间隔（秒）
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP, -- 最后心跳时间
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}', -- 性能指标
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]', -- 机器人标签
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}', -- 机器人元数据

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_robots_group_ref ON robots(group_ref);
CREATE INDEX IF NOT EXISTS idx_robots_role_ref ON robots(role_ref);
CREATE INDEX IF NOT EXISTS idx_robots_priority ON robots(priority);
CREATE INDEX IF NOT EXISTS idx_robots_current_session_count ON robots(current_session_count);
CREATE INDEX IF NOT EXISTS idx_robots_last_heartbeat_at ON robots(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_robots_load_balancing_weight ON robots(load_balancing_weight);

-- 4. 插入默认机器人分组
INSERT INTO robot_groups (name, description, color, icon, priority) VALUES
('客服机器人', '处理客户服务咨询', '#3B82F6', 'MessageSquare', 10),
('营销机器人', '负责营销活动和推广', '#10B981', 'TrendingUp', 9),
('管理机器人', '系统管理和运维', '#F59E0B', 'Shield', 8),
('测试机器人', '测试和实验用途', '#8B5CF6', 'TestTube', 1)
ON CONFLICT (name) DO NOTHING;

-- 5. 插入默认机器人角色
INSERT INTO robot_roles (name, description, permissions, is_system) VALUES
('管理员', '拥有所有权限', '{"all": true, "admin": true}', true),
('客服', '客服权限，可以回复消息', '{"reply": true, "view": true, "chat": true}', false),
('营销', '营销权限，可以发送营销消息', '{"marketing": true, "view": true, "broadcast": true}', false),
('观察员', '只读权限，只能查看消息', '{"view": true}', false),
('测试员', '测试权限，用于测试功能', '{"test": true, "view": true, "debug": true}', false)
ON CONFLICT (name) DO NOTHING;

-- 添加注释
COMMENT ON TABLE robot_groups IS '机器人分组表';
COMMENT ON TABLE robot_roles IS '机器人角色表';
COMMENT ON COLUMN robots.group_ref IS '所属分组ID';
COMMENT ON COLUMN robots.role_ref IS '角色ID';
COMMENT ON COLUMN robots.capabilities IS '机器人能力配置 JSON: {"abilities": ["chat", "reply", "broadcast"], "limits": {"maxMessages": 1000, "maxUsers": 100}}';
COMMENT ON COLUMN robots.priority IS '优先级，数值越大优先级越高';
COMMENT ON COLUMN robots.max_concurrent_sessions IS '最大并发会话数';
COMMENT ON COLUMN robots.current_session_count IS '当前活跃会话数';
COMMENT ON COLUMN robots.enabled_intents IS '启用的意图类型 ["service", "help", "chat"]';
COMMENT ON COLUMN robots.ai_model_config IS 'AI模型配置，覆盖全局配置 {"model": "gpt-4", "temperature": 0.7}';
COMMENT ON COLUMN robots.response_config IS '响应配置 {"style": "friendly", "speed": "fast"}';
COMMENT ON COLUMN robots.load_balancing_weight IS '负载均衡权重，数值越大分配越多会话';
COMMENT ON COLUMN robots.health_check_interval IS '健康检查间隔（秒）';
COMMENT ON COLUMN robots.last_heartbeat_at IS '最后心跳时间';
COMMENT ON COLUMN robots.performance_metrics IS '性能指标 {"avgResponseTime": 500, "successRate": 0.95, "totalMessages": 1000}';
COMMENT ON COLUMN robots.tags IS '机器人标签 ["primary", "24h", "urgent"]';
COMMENT ON COLUMN robots.metadata IS '机器人元数据，存储其他自定义信息';
