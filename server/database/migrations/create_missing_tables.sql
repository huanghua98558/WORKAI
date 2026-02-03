-- 创建缺失的数据库表
-- 执行时间：2026-02-03

-- 1. 创建 sessions 表（会话管理）
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255),
  group_id VARCHAR(255),
  user_name VARCHAR(255),
  group_name VARCHAR(255),
  room_type INTEGER,
  status VARCHAR(50) DEFAULT 'auto',
  context JSONB DEFAULT '[]',
  message_count INTEGER DEFAULT 0,
  last_intent VARCHAR(100),
  intent_confidence FLOAT,
  last_processed_at TIMESTAMP,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  robot_id VARCHAR(255),
  robot_name VARCHAR(255)
);

-- 2. 创建 execution_tracking 表（执行追踪）
CREATE TABLE IF NOT EXISTS execution_tracking (
  id VARCHAR(255) PRIMARY KEY,
  processing_id VARCHAR(255) UNIQUE NOT NULL,
  robot_id VARCHAR(255),
  robot_name VARCHAR(255),
  message_id VARCHAR(255),
  session_id VARCHAR(255),
  user_id VARCHAR(255),
  group_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'processing',
  steps JSONB DEFAULT '{}',
  error_message TEXT,
  error_stack TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  processing_time INTEGER,
  decision JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 创建 ai_io_logs 表（AI 输入输出日志）
CREATE TABLE IF NOT EXISTS ai_io_logs (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255),
  message_id VARCHAR(255),
  robot_id VARCHAR(255),
  robot_name VARCHAR(255),
  operation_type VARCHAR(100),
  ai_input TEXT,
  ai_output TEXT,
  model_id VARCHAR(255),
  temperature FLOAT,
  request_duration INTEGER,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 为 session_messages 表添加缺失的字段
ALTER TABLE session_messages
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS robot_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS robot_name VARCHAR(255);

-- 5. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_group_id ON sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_processed_at ON sessions(last_processed_at);

CREATE INDEX IF NOT EXISTS idx_execution_tracking_processing_id ON execution_tracking(processing_id);
CREATE INDEX IF NOT EXISTS idx_execution_tracking_session_id ON execution_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_execution_tracking_status ON execution_tracking(status);
CREATE INDEX IF NOT EXISTS idx_execution_tracking_created_at ON execution_tracking(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_io_logs_session_id ON ai_io_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_io_logs_message_id ON ai_io_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_io_logs_operation_type ON ai_io_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_io_logs_created_at ON ai_io_logs(created_at);

COMMENT ON TABLE sessions IS '会话管理表';
COMMENT ON TABLE execution_tracking IS '执行追踪表';
COMMENT ON TABLE ai_io_logs IS 'AI 输入输出日志表';
