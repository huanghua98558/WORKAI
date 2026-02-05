-- ============================================
-- WorkTool AI 2.1 - sessions表更新脚本
-- Migration: 016_alter_sessions_table.sql
-- ============================================

-- 添加用户会话关联字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'user_session_id'
  ) THEN
    ALTER TABLE sessions ADD COLUMN user_session_id VARCHAR(36);
  END IF;
END $$;

-- 添加开始时间字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 添加结束时间字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 添加时长字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE sessions ADD COLUMN duration_seconds INTEGER;
  END IF;
END $$;

-- 添加满意度评分字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'satisfaction_score'
  ) THEN
    ALTER TABLE sessions ADD COLUMN satisfaction_score INTEGER;
  END IF;
END $$;

-- 添加满意度原因字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'satisfaction_reason'
  ) THEN
    ALTER TABLE sessions ADD COLUMN satisfaction_reason VARCHAR(1000);
  END IF;
END $$;

-- 添加问题分类字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'issue_category'
  ) THEN
    ALTER TABLE sessions ADD COLUMN issue_category VARCHAR(100);
  END IF;
END $$;

-- 添加问题子分类字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'issue_subcategory'
  ) THEN
    ALTER TABLE sessions ADD COLUMN issue_subcategory VARCHAR(100);
  END IF;
END $$;

-- 添加问题是否解决字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'issue_resolved'
  ) THEN
    ALTER TABLE sessions ADD COLUMN issue_resolved BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 添加工作人员ID字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE sessions ADD COLUMN staff_id VARCHAR(36);
  END IF;
END $$;

-- 添加工作人员介入标志字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'staff_intervened'
  ) THEN
    ALTER TABLE sessions ADD COLUMN staff_intervened BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 添加工作人员介入次数字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'staff_intervention_count'
  ) THEN
    ALTER TABLE sessions ADD COLUMN staff_intervention_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 添加第一次介入时间字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'first_intervention_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN first_intervention_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 添加session_type字段（如果没有的话）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'private';
  END IF;
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS sessions_user_session_id_idx ON sessions(user_session_id);
CREATE INDEX IF NOT EXISTS sessions_started_at_idx ON sessions(started_at);
CREATE INDEX IF NOT EXISTS sessions_ended_at_idx ON sessions(ended_at);
CREATE INDEX IF NOT EXISTS sessions_staff_id_idx ON sessions(staff_id);
CREATE INDEX IF NOT EXISTS sessions_staff_intervened_idx ON sessions(staff_intervened);

-- 添加注释
COMMENT ON COLUMN sessions.user_session_id IS '关联的用户会话ID（双层架构）';
COMMENT ON COLUMN sessions.started_at IS '会话开始时间';
COMMENT ON COLUMN sessions.ended_at IS '会话结束时间';
COMMENT ON COLUMN sessions.duration_seconds IS '会话时长（秒）';
COMMENT ON COLUMN sessions.satisfaction_score IS '满意度评分（1-5分）';
COMMENT ON COLUMN sessions.satisfaction_reason IS '满意度原因';
COMMENT ON COLUMN sessions.issue_category IS '问题分类';
COMMENT ON COLUMN sessions.issue_subcategory IS '问题子分类';
COMMENT ON COLUMN sessions.issue_resolved IS '问题是否解决';
COMMENT ON COLUMN sessions.staff_id IS '工作人员ID';
COMMENT ON COLUMN sessions.staff_intervened IS '是否有工作人员介入';
COMMENT ON COLUMN sessions.staff_intervention_count IS '工作人员介入次数';
COMMENT ON COLUMN sessions.first_intervention_at IS '第一次介入时间';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'sessions表更新成功！';
END $$;
