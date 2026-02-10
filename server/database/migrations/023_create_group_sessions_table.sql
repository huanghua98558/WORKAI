-- ============================================
-- WorkTool AI - 社群会话表创建脚本
-- Migration: 023_create_group_sessions_table.sql
-- ============================================

-- 创建社群会话表
CREATE TABLE IF NOT EXISTS group_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 群组信息
  group_id VARCHAR(100) NOT NULL UNIQUE,
  group_name VARCHAR(200),
  member_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  group_type VARCHAR(20) DEFAULT 'external',
  
  -- 关联信息
  robot_id VARCHAR(36),
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- 元数据
  metadata JSONB DEFAULT '{}'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS group_sessions_group_id_idx ON group_sessions(group_id);
CREATE INDEX IF NOT EXISTS group_sessions_robot_id_idx ON group_sessions(robot_id);
CREATE INDEX IF NOT EXISTS group_sessions_status_idx ON group_sessions(status);
CREATE INDEX IF NOT EXISTS group_sessions_created_at_idx ON group_sessions(created_at);
CREATE INDEX IF NOT EXISTS group_sessions_last_message_at_idx ON group_sessions(last_message_at);

-- 添加注释
COMMENT ON TABLE group_sessions IS '社群会话表 - 存储群聊会话信息';
COMMENT ON COLUMN group_sessions.id IS '社群会话ID';
COMMENT ON COLUMN group_sessions.group_id IS '群组ID（唯一）';
COMMENT ON COLUMN group_sessions.group_name IS '群组名称';
COMMENT ON COLUMN group_sessions.member_count IS '群成员数';
COMMENT ON COLUMN group_sessions.message_count IS '消息总数';
COMMENT ON COLUMN group_sessions.last_message_at IS '最后消息时间';
COMMENT ON COLUMN group_sessions.group_type IS '群组类型: external, internal';
COMMENT ON COLUMN group_sessions.robot_id IS '机器人ID';
COMMENT ON COLUMN group_sessions.status IS '状态: active, inactive, archived';
COMMENT ON COLUMN group_sessions.created_at IS '创建时间';
COMMENT ON COLUMN group_sessions.updated_at IS '更新时间';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'group_sessions表创建成功';
END $$;
