-- 用户管理和助理关联系统
-- 执行时间：2025-02-03
-- 目标：实现用户管理、用户角色、用户与机器人助理的关联

-- 1. 创建用户角色表
CREATE TABLE IF NOT EXISTS user_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB, -- 角色权限配置
    priority INTEGER DEFAULT 10, -- 角色优先级
    is_system BOOLEAN NOT NULL DEFAULT false, -- 是否系统角色
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL UNIQUE, -- 微信用户的user_id
    name VARCHAR(255),
    nickname VARCHAR(255),
    avatar_url VARCHAR(500),
    email VARCHAR(255),
    phone VARCHAR(20),
    role_id VARCHAR(36) REFERENCES user_roles(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]', -- 用户标签
    preferences JSONB DEFAULT '{}', -- 用户偏好设置
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 3. 创建用户助理关联表（用户可以选择多个机器人助理）
CREATE TABLE IF NOT EXISTS user_assistants (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    robot_id VARCHAR(64) NOT NULL, -- 关联的机器人ID
    assistant_type VARCHAR(50) NOT NULL DEFAULT 'primary', -- assistant类型: primary(主助理), secondary(备用助理), specialized(专业助理)
    priority INTEGER DEFAULT 10, -- 优先级，数值越大优先级越高
    is_active BOOLEAN NOT NULL DEFAULT true, -- 是否激活
    max_concurrent_sessions INTEGER DEFAULT 10, -- 最大并发会话数
    routing_config JSONB DEFAULT '{}', -- 路由配置
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, robot_id, assistant_type)
);

-- 4. 创建会话助理关联表（记录会话实际使用的机器人）
CREATE TABLE IF NOT EXISTS session_assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_robot_id VARCHAR(64) NOT NULL, -- 分配的机器人ID
    assigned_by VARCHAR(50) DEFAULT 'auto', -- 分配方式: auto(自动), manual(手动), user_selected(用户选择)
    assignment_reason VARCHAR(255), -- 分配原因
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active', -- 状态: active(活跃), inactive(非活跃), completed(完成)
    metrics JSONB DEFAULT '{}', -- 会话指标
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. 创建助理路由日志表（记录路由决策）
CREATE TABLE IF NOT EXISTS assistant_routing_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64),
    user_id VARCHAR(36),
    incoming_robot_id VARCHAR(64), -- 来消息的机器人
    candidate_robots JSONB, -- 候选机器人列表
    selected_robot_id VARCHAR(64), -- 选中的机器人
    routing_strategy VARCHAR(50), -- 路由策略: user_preference(用户偏好), load_balancing(负载均衡), priority(优先级), round_robin(轮询)
    decision_reason VARCHAR(255), -- 决策原因
    routing_time_ms INTEGER, -- 路由耗时
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_assistants_user_id ON user_assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assistants_robot_id ON user_assistants(robot_id);
CREATE INDEX IF NOT EXISTS idx_user_assistants_type ON user_assistants(assistant_type);
CREATE INDEX IF NOT EXISTS idx_user_assistants_priority ON user_assistants(priority);
CREATE INDEX IF NOT EXISTS idx_session_assignments_session_id ON session_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_assignments_user_id ON session_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_session_assignments_robot_id ON session_assignments(assigned_robot_id);
CREATE INDEX IF NOT EXISTS idx_session_assignments_status ON session_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assistant_routing_logs_session_id ON assistant_routing_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_assistant_routing_logs_user_id ON assistant_routing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_routing_logs_created_at ON assistant_routing_logs(created_at);

-- 6. 插入默认用户角色
INSERT INTO user_roles (name, display_name, description, permissions, priority, is_system) VALUES
('super_admin', '超级管理员', '拥有所有权限', '{"all": true, "admin": true, "user:manage": true, "assistant:assign": true}', 100, true),
('admin', '管理员', '管理用户和助理', '{"admin": true, "user:manage": true, "assistant:assign": true, "user:view": true}', 90, true),
('user', '普通用户', '可以使用机器人服务', '{"chat": true, "assistant:select": true}', 10, true),
('guest', '访客', '只读权限', '{"view": true}', 1, true)
ON CONFLICT (name) DO NOTHING;

-- 7. 创建触发器：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_assistants_updated_at BEFORE UPDATE ON user_assistants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_assignments_updated_at BEFORE UPDATE ON session_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE user_roles IS '用户角色表';
COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE user_assistants IS '用户助理关联表';
COMMENT ON TABLE session_assignments IS '会话助理分配表';
COMMENT ON TABLE assistant_routing_logs IS '助理路由日志表';

COMMENT ON COLUMN users.user_id IS '微信用户ID';
COMMENT ON COLUMN users.role_id IS '用户角色ID';
COMMENT ON COLUMN users.tags IS '用户标签数组';
COMMENT ON COLUMN users.preferences IS '用户偏好设置 JSON';

COMMENT ON COLUMN user_assistants.assistant_type IS '助理类型: primary(主助理), secondary(备用助理), specialized(专业助理)';
COMMENT ON COLUMN user_assistants.priority IS '优先级，数值越大优先级越高';
COMMENT ON COLUMN user_assistants.routing_config IS '路由配置 JSON';

COMMENT ON COLUMN session_assignments.assigned_by IS '分配方式: auto(自动), manual(手动), user_selected(用户选择)';
COMMENT ON COLUMN session_assignments.status IS '状态: active(活跃), inactive(非活跃), completed(完成)';

COMMENT ON COLUMN assistant_routing_logs.routing_strategy IS '路由策略: user_preference(用户偏好), load_balancing(负载均衡), priority(优先级), round_robin(轮询)';
