-- 创建风险消息表
CREATE TABLE IF NOT EXISTS risk_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(36) UNIQUE NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(100),
  user_name VARCHAR(100),
  group_name VARCHAR(200),
  content TEXT NOT NULL,
  ai_reply TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'resolved', 'escalated')),
  resolved_by VARCHAR(100),
  resolved_at TIMESTAMP WITH TIME ZONE,
  handled_by_staff JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建风险消息表的索引
CREATE INDEX IF NOT EXISTS risk_messages_session_id_idx ON risk_messages(session_id);
CREATE INDEX IF NOT EXISTS risk_messages_status_idx ON risk_messages(status);
CREATE INDEX IF NOT EXISTS risk_messages_created_at_idx ON risk_messages(created_at DESC);

-- 创建风险处理记录表
CREATE TABLE IF NOT EXISTS risk_handling_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id VARCHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建风险处理记录表的索引
CREATE INDEX IF NOT EXISTS risk_handling_logs_risk_id_idx ON risk_handling_logs(risk_id);
CREATE INDEX IF NOT EXISTS risk_handling_logs_action_idx ON risk_handling_logs(action);
CREATE INDEX IF NOT EXISTS risk_handling_logs_created_at_idx ON risk_handling_logs(created_at DESC);

-- 添加外键约束（如果flow_messages表存在）
-- ALTER TABLE risk_messages ADD CONSTRAINT fk_risk_messages_session_id 
--   FOREIGN KEY (session_id) REFERENCES flow_messages(session_id) ON DELETE CASCADE;

-- 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_risk_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_risk_messages_updated_at
  BEFORE UPDATE ON risk_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_messages_updated_at();

-- 添加注释
COMMENT ON TABLE risk_messages IS '风险消息表，记录检测到的风险消息及其处理状态';
COMMENT ON TABLE risk_handling_logs IS '风险处理记录表，记录风险消息的每一次处理操作';
COMMENT ON COLUMN risk_messages.status IS '处理状态：processing-处理中，resolved-已解决，escalated-已升级';
COMMENT ON COLUMN risk_messages.handled_by_staff IS '处理过的工作人员列表（JSON数组）';
COMMENT ON COLUMN risk_handling_logs.action IS '操作类型：ai_reply-AI回复，staff_reply-工作人员回复，manual_intervention-人工介入，auto_resolved-自动解决，notification_sent-发送通知';
