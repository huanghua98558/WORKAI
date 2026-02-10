-- ============================================
-- WorkTool AI - 用户会话表扩展脚本
-- Migration: 024_alter_user_sessions_table.sql
-- ============================================

-- 添加企业名称字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_sessions' AND column_name = 'enterprise_name'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN enterprise_name VARCHAR(200);
    RAISE NOTICE 'user_sessions.enterprise_name 字段添加成功';
  ELSE
    RAISE NOTICE 'user_sessions.enterprise_name 字段已存在';
  END IF;
END $$;

-- 添加问题解决率字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_sessions' AND column_name = 'problem_resolution_rate'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN problem_resolution_rate INTEGER DEFAULT 0;
    RAISE NOTICE 'user_sessions.problem_resolution_rate 字段添加成功';
  ELSE
    RAISE NOTICE 'user_sessions.problem_resolution_rate 字段已存在';
  END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN user_sessions.enterprise_name IS '企业名称';
COMMENT ON COLUMN user_sessions.problem_resolution_rate IS '问题解决率（0-100）';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'user_sessions表扩展完成';
END $$;
