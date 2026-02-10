-- ============================================
-- WorkTool AI - 为 messages 和 session_messages 表添加流程引擎相关字段
-- Migration: 027_add_flow_fields_to_messages.sql
-- ============================================

-- 修改 messages 表，添加流程引擎相关字段
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sender_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS priority VARCHAR(20),
ADD COLUMN IF NOT EXISTS alert_level VARCHAR(20),
ADD COLUMN IF NOT EXISTS alert_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS track_task_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS is_bot_comfort BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_conflict_message BOOLEAN DEFAULT false;

-- 为 messages 表添加索引
CREATE INDEX IF NOT EXISTS idx_messages_sender_role ON messages(sender_role);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_alert_level ON messages(alert_level);
CREATE INDEX IF NOT EXISTS idx_messages_alert_id ON messages(alert_id);
CREATE INDEX IF NOT EXISTS idx_messages_track_task_id ON messages(track_task_id);

-- 添加注释
COMMENT ON COLUMN messages.sender_role IS '发送者角色：operation/group_assistant/after_sales/user/robot';
COMMENT ON COLUMN messages.priority IS '优先级：critical/high/medium/low';
COMMENT ON COLUMN messages.alert_level IS '告警级别：critical/error/warning/info';
COMMENT ON COLUMN messages.alert_id IS '关联告警ID';
COMMENT ON COLUMN messages.track_task_id IS '关联跟踪任务ID';
COMMENT ON COLUMN messages.is_bot_comfort IS '是否为机器人安抚消息';
COMMENT ON COLUMN messages.is_conflict_message IS '是否为冲突消息';

-- 修改 session_messages 表，添加流程引擎相关字段
ALTER TABLE session_messages
ADD COLUMN IF NOT EXISTS emotion VARCHAR(50),
ADD COLUMN IF NOT EXISTS emotion_score NUMERIC,
ADD COLUMN IF NOT EXISTS cooperation_level INTEGER,
ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER,
ADD COLUMN IF NOT EXISTS has_alert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_bot_comfort BOOLEAN DEFAULT false;

-- 为 session_messages 表添加索引
CREATE INDEX IF NOT EXISTS idx_session_messages_emotion ON session_messages(emotion);
CREATE INDEX IF NOT EXISTS idx_session_messages_has_alert ON session_messages(has_alert);
CREATE INDEX IF NOT EXISTS idx_session_messages_is_bot_comfort ON session_messages(is_bot_comfort);

-- 添加注释
COMMENT ON COLUMN session_messages.emotion IS '情绪：positive/negative/neutral';
COMMENT ON COLUMN session_messages.emotion_score IS '情绪分数（0-1）';
COMMENT ON COLUMN session_messages.cooperation_level IS '配合度（1-10）';
COMMENT ON COLUMN session_messages.satisfaction_score IS '满意度（1-5）';
COMMENT ON COLUMN session_messages.has_alert IS '是否触发告警';
COMMENT ON COLUMN session_messages.is_bot_comfort IS '是否为机器人安抚消息';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'messages 和 session_messages 表字段添加成功';
END $$;
