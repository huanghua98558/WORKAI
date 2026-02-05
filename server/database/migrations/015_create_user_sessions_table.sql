-- ============================================
-- WorkTool AI 2.1 - 用户会话表创建脚本
-- Migration: 015_create_user_sessions_table.sql
-- ============================================

-- 1. 创建用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户标识
  user_id VARCHAR(100) NOT NULL UNIQUE,
  robot_id VARCHAR(36) NOT NULL,

  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  -- 时间信息
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,

  -- 统计数据
  total_message_count INTEGER NOT NULL DEFAULT 0,
  total_service_count INTEGER NOT NULL DEFAULT 0,

  -- 关联的服务会话
  first_service_session_id VARCHAR(36),
  last_service_session_id VARCHAR(36),

  -- 元数据
  metadata JSONB DEFAULT '{}'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_robot_id_idx ON user_sessions(robot_id);
CREATE INDEX IF NOT EXISTS user_sessions_status_idx ON user_sessions(status);
CREATE INDEX IF NOT EXISTS user_sessions_created_at_idx ON user_sessions(created_at);
CREATE INDEX IF NOT EXISTS user_sessions_last_message_at_idx ON user_sessions(last_message_at);

-- 添加注释
COMMENT ON TABLE user_sessions IS '用户会话表 - 记录用户的长期会话（双层会话架构）';
COMMENT ON COLUMN user_sessions.id IS '用户会话ID';
COMMENT ON COLUMN user_sessions.user_id IS '用户ID（唯一）';
COMMENT ON COLUMN user_sessions.robot_id IS '机器人ID';
COMMENT ON COLUMN user_sessions.status IS '状态：active-活跃, archived-已归档';
COMMENT ON COLUMN user_sessions.created_at IS '创建时间';
COMMENT ON COLUMN user_sessions.last_message_at IS '最后消息时间';
COMMENT ON COLUMN user_sessions.total_message_count IS '总消息数';
COMMENT ON COLUMN user_sessions.total_service_count IS '总服务次数（服务会话数量）';
COMMENT ON COLUMN user_sessions.first_service_session_id IS '第一次服务会话ID';
COMMENT ON COLUMN user_sessions.last_service_session_id IS '最后一次服务会话ID';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE '用户会话表创建成功';
END $$;
