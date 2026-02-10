-- ============================================
-- WorkTool AI - 机器人AI配置表
-- Migration: 025_create_robot_ai_config.sql
-- ============================================

-- 1. 创建机器人AI配置表
CREATE TABLE IF NOT EXISTS robot_ai_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id VARCHAR(255) NOT NULL UNIQUE,
  robot_name VARCHAR(255) NOT NULL,

  -- 意图识别配置
  intent_model_id VARCHAR(36),
  intent_system_prompt TEXT,
  intent_temperature NUMERIC(5, 2) DEFAULT 0.5,
  intent_confidence_threshold NUMERIC(5, 2) DEFAULT 0.6,

  -- 情感分析配置
  sentiment_model_id VARCHAR(36),
  sentiment_system_prompt TEXT,
  sentiment_temperature NUMERIC(5, 2) DEFAULT 0.3,

  -- 通用配置
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 10,

  -- 元数据
  metadata JSONB DEFAULT '{}',
  description TEXT,

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS robot_ai_configs_robot_id_idx ON robot_ai_configs(robot_id);
CREATE INDEX IF NOT EXISTS robot_ai_configs_intent_model_id_idx ON robot_ai_configs(intent_model_id);
CREATE INDEX IF NOT EXISTS robot_ai_configs_sentiment_model_id_idx ON robot_ai_configs(sentiment_model_id);
CREATE INDEX IF NOT EXISTS robot_ai_configs_enabled_idx ON robot_ai_configs(enabled);

-- 2. 创建机器人AI分析结果表（记录每次分析结果）
CREATE TABLE IF NOT EXISTS robot_ai_analysis_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL,

  -- 分析结果
  intent VARCHAR(100),
  intent_confidence NUMERIC(5, 2),
  sentiment VARCHAR(50),
  sentiment_score NUMERIC(5, 2),

  -- 上下文信息
  context_type VARCHAR(50),
  context_count INTEGER DEFAULT 0,
  user_satisfaction NUMERIC(5, 2),
  has_pending_task BOOLEAN DEFAULT false,

  -- 决策信息
  has_action_suggestion BOOLEAN DEFAULT false,
  should_trigger_alert BOOLEAN DEFAULT false,
  suggested_actions JSONB DEFAULT '[]',

  -- AI模型信息
  intent_model_id VARCHAR(36),
  sentiment_model_id VARCHAR(36),

  -- 时间信息
  analysis_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  analysis_duration INTEGER -- 毫秒
);

-- 创建索引
CREATE INDEX IF NOT EXISTS robot_ai_analysis_history_robot_id_idx ON robot_ai_analysis_history(robot_id);
CREATE INDEX IF NOT EXISTS robot_ai_analysis_history_session_id_idx ON robot_ai_analysis_history(session_id);
CREATE INDEX IF NOT EXISTS robot_ai_analysis_history_message_id_idx ON robot_ai_analysis_history(message_id);
CREATE INDEX IF NOT EXISTS robot_ai_analysis_history_intent_idx ON robot_ai_analysis_history(intent);
CREATE INDEX IF NOT EXISTS robot_ai_analysis_history_sentiment_idx ON robot_ai_analysis_history(sentiment);
CREATE INDEX IF NOT EXISTS robot_ai_analysis_history_should_trigger_alert_idx ON robot_ai_analysis_history(should_trigger_alert);
CREATE INDEX IF NOT EXISTS robot_ai_analysis_history_analysis_time_idx ON robot_ai_analysis_history(analysis_time);

-- 添加注释
COMMENT ON TABLE robot_ai_configs IS '机器人AI配置表 - 每个机器人的独立AI模型配置';
COMMENT ON TABLE robot_ai_analysis_history IS '机器人AI分析历史表 - 记录每次AI分析的结果';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE '机器人AI配置表创建成功';
END $$;
