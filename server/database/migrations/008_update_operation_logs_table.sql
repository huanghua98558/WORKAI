-- 创建或更新运营日志表
-- 日期: 2026-02-04
-- 描述: 创建 operation_logs 表，用于记录系统操作日志

-- 如果表已存在，先删除（开发环境）
DROP TABLE IF EXISTS operation_logs CASCADE;

-- 创建运营日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36), -- 用户ID
    username VARCHAR(255), -- 用户名
    action VARCHAR(50) NOT NULL, -- 操作: create, update, delete, start, stop, etc.
    module VARCHAR(50) NOT NULL, -- 模块: robots, callbacks, ai, sessions, etc.
    target_id VARCHAR(36), -- 目标对象ID
    target_type VARCHAR(50), -- 目标对象类型: robot, callback, ai_config, etc.
    description TEXT, -- 操作描述
    ip_address VARCHAR(45), -- 操作IP地址
    user_agent TEXT, -- 用户代理
    request_data JSONB, -- 请求数据
    response_data JSONB, -- 响应数据
    status VARCHAR(20) NOT NULL DEFAULT 'success', -- 状态: success, error
    error_message TEXT, -- 错误信息
    duration INTEGER, -- 请求耗时（毫秒）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX operation_logs_module_idx ON operation_logs(module);
CREATE INDEX operation_logs_action_idx ON operation_logs(action);
CREATE INDEX operation_logs_user_id_idx ON operation_logs(user_id);
CREATE INDEX operation_logs_target_id_idx ON operation_logs(target_id);
CREATE INDEX operation_logs_status_idx ON operation_logs(status);
CREATE INDEX operation_logs_created_at_idx ON operation_logs(created_at DESC);

-- 添加注释
COMMENT ON TABLE operation_logs IS '运营日志表，用于记录系统的操作日志';
COMMENT ON COLUMN operation_logs.id IS '日志ID';
COMMENT ON COLUMN operation_logs.user_id IS '用户ID';
COMMENT ON COLUMN operation_logs.username IS '用户名';
COMMENT ON COLUMN operation_logs.action IS '操作类型: create, update, delete, start, stop, etc.';
COMMENT ON COLUMN operation_logs.module IS '模块名称: robots, callbacks, ai, sessions, etc.';
COMMENT ON COLUMN operation_logs.target_id IS '目标对象ID';
COMMENT ON COLUMN operation_logs.target_type IS '目标对象类型: robot, callback, ai_config, etc.';
COMMENT ON COLUMN operation_logs.description IS '操作描述';
COMMENT ON COLUMN operation_logs.ip_address IS '操作IP地址';
COMMENT ON COLUMN operation_logs.user_agent IS '用户代理';
COMMENT ON COLUMN operation_logs.request_data IS '请求数据';
COMMENT ON COLUMN operation_logs.response_data IS '响应数据';
COMMENT ON COLUMN operation_logs.status IS '状态: success, error';
COMMENT ON COLUMN operation_logs.error_message IS '错误信息';
COMMENT ON COLUMN operation_logs.duration IS '请求耗时（毫秒）';
COMMENT ON COLUMN operation_logs.created_at IS '创建时间';
