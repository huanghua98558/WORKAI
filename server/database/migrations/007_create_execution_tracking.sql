-- 创建执行追踪表
-- 用于存储消息执行的完整步骤数据，支持监控和历史查询
--
-- 用途：
-- 1. 记录每次消息处理的完整流程（用户消息 → AI处理 → 返回结果）
-- 2. 支持实时监控和历史追溯
-- 3. 与 Redis 双写，确保数据一致性和持久化

CREATE TABLE IF NOT EXISTS execution_tracking (
  id SERIAL PRIMARY KEY,
  processing_id VARCHAR(255) UNIQUE NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS execution_tracking_processing_id_idx
  ON execution_tracking(processing_id);

CREATE INDEX IF NOT EXISTS execution_tracking_session_id_idx
  ON execution_tracking(session_id);

CREATE INDEX IF NOT EXISTS execution_tracking_status_idx
  ON execution_tracking(status);

CREATE INDEX IF NOT EXISTS execution_tracking_created_at_idx
  ON execution_tracking(created_at DESC);

CREATE INDEX IF NOT EXISTS execution_tracking_completed_at_idx
  ON execution_tracking(completed_at DESC);

-- 添加注释
COMMENT ON TABLE execution_tracking IS '执行追踪表，存储消息处理的完整步骤数据';
COMMENT ON COLUMN execution_tracking.processing_id IS '处理ID，格式：process:timestamp:nanoid';
COMMENT ON COLUMN execution_tracking.session_id IS '关联的会话ID';
COMMENT ON COLUMN execution_tracking.status IS '处理状态：processing/completed/failed';
COMMENT ON COLUMN execution_tracking.steps IS '步骤数据JSON数组，包含user_message、ai_response等';
COMMENT ON COLUMN execution_tracking.metadata IS '额外的元数据';
