-- 流程变量配置表
-- 用于存储流程的全局变量，如默认机器人ID等

CREATE TABLE IF NOT EXISTS flow_variables (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_name VARCHAR(255) NOT NULL UNIQUE,
  variable_value TEXT NOT NULL,
  description TEXT,
  variable_type VARCHAR(50) DEFAULT 'string',
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS flow_variables_variable_name_idx ON flow_variables(variable_name);
CREATE INDEX IF NOT EXISTS flow_variables_is_system_idx ON flow_variables(is_system);

-- 添加注释
COMMENT ON TABLE flow_variables IS '流程变量配置表，用于存储流程的全局变量';
COMMENT ON COLUMN flow_variables.variable_name IS '变量名称';
COMMENT ON COLUMN flow_variables.variable_value IS '变量值';
COMMENT ON COLUMN flow_variables.description IS '变量描述';
COMMENT ON COLUMN flow_variables.variable_type IS '变量类型：string, number, boolean, json';
COMMENT ON COLUMN flow_variables.is_system IS '是否系统变量';
COMMENT ON COLUMN flow_variables.is_encrypted IS '是否加密存储';

-- 插入默认流程变量
INSERT INTO flow_variables (variable_name, variable_value, description, variable_type, is_system) VALUES
  ('default_reply_robot', 'wt22phhjpt2xboerspxsote472xdnyq2', '默认回复机器人ID', 'string', true),
  ('default_notification_robot', 'wt22phhjpt2xboerspxsote472xdnyq2', '默认通知机器人ID', 'string', true),
  ('default_delay_seconds', '0', '默认延迟时间（秒）', 'number', true),
  ('delay_enabled', 'true', '是否启用延迟控制', 'boolean', true)
ON CONFLICT (variable_name) DO NOTHING;
