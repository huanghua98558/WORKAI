-- ============================================
-- WorkTool AI 2.1 - messages表创建脚本
-- Migration: 017_create_messages_table.sql
-- ============================================

-- 1. 创建消息表
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 会话和机器人关联
  session_id VARCHAR(36) NOT NULL,
  user_session_id VARCHAR(36),
  robot_id VARCHAR(36) NOT NULL,

  -- 消息内容
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text',

  -- 发送者信息
  sender_id VARCHAR(100) NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  sender_name VARCHAR(200),

  -- 消息类型
  message_type VARCHAR(20) DEFAULT 'message',

  -- AI相关信息
  ai_model VARCHAR(100),
  ai_provider VARCHAR(50),
  ai_response_time INTEGER,
  ai_tokens_used INTEGER,
  ai_cost NUMERIC(10, 4),
  ai_confidence NUMERIC(3, 2),

  -- 意图识别
  intent_id VARCHAR(36),
  intent_confidence NUMERIC(3, 2),

  -- 情感分析
  emotion VARCHAR(50),
  emotion_score NUMERIC(3, 2),

  -- 元数据
  metadata JSONB DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS messages_session_id_idx ON messages(session_id);
CREATE INDEX IF NOT EXISTS messages_user_session_id_idx ON messages(user_session_id);
CREATE INDEX IF NOT EXISTS messages_robot_id_idx ON messages(robot_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
CREATE INDEX IF NOT EXISTS messages_intent_id_idx ON messages(intent_id);
CREATE INDEX IF NOT EXISTS messages_sender_type_idx ON messages(sender_type);

-- 添加注释
COMMENT ON TABLE messages IS '消息表 - 存储所有对话消息';
COMMENT ON COLUMN messages.id IS '消息ID';
COMMENT ON COLUMN messages.session_id IS '服务会话ID';
COMMENT ON COLUMN messages.user_session_id IS '用户会话ID（双层架构）';
COMMENT ON COLUMN messages.robot_id IS '机器人ID';
COMMENT ON COLUMN messages.content IS '消息内容';
COMMENT ON COLUMN messages.content_type IS '内容类型：text, image, audio, video, file';
COMMENT ON COLUMN messages.sender_id IS '发送者ID';
COMMENT ON COLUMN messages.sender_type IS '发送者类型：user, staff, system, ai';
COMMENT ON COLUMN messages.sender_name IS '发送者名称';
COMMENT ON COLUMN messages.message_type IS '消息类型：message, system, notification';
COMMENT ON COLUMN messages.ai_model IS 'AI模型';
COMMENT ON COLUMN messages.ai_provider IS 'AI提供商';
COMMENT ON COLUMN messages.ai_response_time IS 'AI响应时间（毫秒）';
COMMENT ON COLUMN messages.ai_tokens_used IS 'AI使用的Token数';
COMMENT ON COLUMN messages.ai_cost IS 'AI成本';
COMMENT ON COLUMN messages.ai_confidence IS 'AI置信度';
COMMENT ON COLUMN messages.intent_id IS '意图ID';
COMMENT ON COLUMN messages.intent_confidence IS '意图置信度';
COMMENT ON COLUMN messages.emotion IS '情感：positive, neutral, negative';
COMMENT ON COLUMN messages.emotion_score IS '情感分数';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'messages表创建成功';
END $$;
