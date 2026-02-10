-- ============================================
-- WorkTool AI - 售后任务表创建脚本
-- Migration: 022_create_tasks_table.sql
-- ============================================

-- 创建售后任务表
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联信息
  user_session_id VARCHAR(36),
  session_id VARCHAR(36),
  robot_id VARCHAR(36),
  user_id VARCHAR(100),
  
  -- 任务信息
  task_type VARCHAR(50) NOT NULL,
  task_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- 任务数据
  task_data JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 元数据
  metadata JSONB DEFAULT '{}'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS tasks_user_session_id_idx ON tasks(user_session_id);
CREATE INDEX IF NOT EXISTS tasks_session_id_idx ON tasks(session_id);
CREATE INDEX IF NOT EXISTS tasks_robot_id_idx ON tasks(robot_id);
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_task_type_idx ON tasks(task_type);
CREATE INDEX IF NOT EXISTS tasks_task_status_idx ON tasks(task_status);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at);

-- 添加注释
COMMENT ON TABLE tasks IS '售后任务表 - 存储用户售后任务信息';
COMMENT ON COLUMN tasks.id IS '任务ID';
COMMENT ON COLUMN tasks.user_session_id IS '用户会话ID';
COMMENT ON COLUMN tasks.session_id IS '服务会话ID';
COMMENT ON COLUMN tasks.robot_id IS '机器人ID';
COMMENT ON COLUMN tasks.user_id IS '用户ID';
COMMENT ON COLUMN tasks.task_type IS '任务类型: scan_qrcode, bind_phone, realname, selfie, other';
COMMENT ON COLUMN tasks.task_status IS '任务状态: pending, in_progress, waiting_user_response, completed, failed';
COMMENT ON COLUMN tasks.task_data IS '任务数据（JSON格式）';
COMMENT ON COLUMN tasks.created_at IS '创建时间';
COMMENT ON COLUMN tasks.updated_at IS '更新时间';
COMMENT ON COLUMN tasks.completed_at IS '完成时间';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'tasks表创建成功';
END $$;
