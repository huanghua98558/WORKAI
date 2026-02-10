-- ============================================
-- WorkTool AI - 跟踪任务表创建脚本
-- Migration: 026_create_track_tasks_table.sql
-- 说明：用于存储运营消息跟踪、售后任务跟踪、告警跟踪等任务
-- ============================================

-- 创建跟踪任务表
CREATE TABLE IF NOT EXISTS track_tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 任务类型
  task_type VARCHAR(50) NOT NULL,
  task_status VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- 群信息
  group_id VARCHAR(255),
  group_name VARCHAR(255),

  -- 运营信息
  operation_id VARCHAR(255),
  operation_name VARCHAR(255),

  -- 工作人员信息
  staff_id VARCHAR(255),
  staff_name VARCHAR(255),

  -- 目标用户
  target_user_id VARCHAR(255),
  target_user_name VARCHAR(255),

  -- 任务内容
  task_requirement TEXT,
  task_description TEXT,

  -- 优先级和状态
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',

  -- 时间信息
  deadline TIMESTAMP WITH TIME ZONE,
  response_detected_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- 冲突处理
  conflict_detected BOOLEAN DEFAULT false,
  conflict_resolved BOOLEAN DEFAULT false,

  -- 创建和更新信息
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- 扩展数据
  metadata JSONB DEFAULT '{}'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS track_tasks_task_type_idx ON track_tasks(task_type);
CREATE INDEX IF NOT EXISTS track_tasks_task_status_idx ON track_tasks(task_status);
CREATE INDEX IF NOT EXISTS track_tasks_priority_idx ON track_tasks(priority);
CREATE INDEX IF NOT EXISTS track_tasks_target_user_id_idx ON track_tasks(target_user_id);
CREATE INDEX IF NOT EXISTS track_tasks_group_id_idx ON track_tasks(group_id);
CREATE INDEX IF NOT EXISTS track_tasks_staff_id_idx ON track_tasks(staff_id);
CREATE INDEX IF NOT EXISTS track_tasks_operation_id_idx ON track_tasks(operation_id);
CREATE INDEX IF NOT EXISTS track_tasks_created_at_idx ON track_tasks(created_at);
CREATE INDEX IF NOT EXISTS track_tasks_deadline_idx ON track_tasks(deadline);
CREATE INDEX IF NOT EXISTS track_tasks_response_detected_at_idx ON track_tasks(response_detected_at);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS track_tasks_pending_idx ON track_tasks(task_status, priority, created_at DESC)
WHERE task_status IN ('pending', 'responded');

-- 添加注释
COMMENT ON TABLE track_tasks IS '跟踪任务表 - 存储运营消息跟踪、售后任务跟踪、告警跟踪等任务';
COMMENT ON COLUMN track_tasks.id IS '任务ID（UUID）';
COMMENT ON COLUMN track_tasks.task_type IS '任务类型：operation/after_sales/alert/intervention';
COMMENT ON COLUMN track_tasks.task_status IS '任务状态：pending/responded/in_progress/completed/timeout/cancelled';
COMMENT ON COLUMN track_tasks.group_id IS '群ID';
COMMENT ON COLUMN track_tasks.group_name IS '群名';
COMMENT ON COLUMN track_tasks.operation_id IS '运营ID';
COMMENT ON COLUMN track_tasks.operation_name IS '运营名称';
COMMENT ON COLUMN track_tasks.staff_id IS '工作人员ID';
COMMENT ON COLUMN track_tasks.staff_name IS '工作人员名称';
COMMENT ON COLUMN track_tasks.target_user_id IS '目标用户ID';
COMMENT ON COLUMN track_tasks.target_user_name IS '目标用户名称';
COMMENT ON COLUMN track_tasks.task_requirement IS '任务要求';
COMMENT ON COLUMN track_tasks.task_description IS '任务描述';
COMMENT ON COLUMN track_tasks.priority IS '优先级：critical/high/medium/low';
COMMENT ON COLUMN track_tasks.deadline IS '截止时间';
COMMENT ON COLUMN track_tasks.response_detected_at IS '响应检测时间';
COMMENT ON COLUMN track_tasks.completed_at IS '完成时间';
COMMENT ON COLUMN track_tasks.conflict_detected IS '是否检测到冲突';
COMMENT ON COLUMN track_tasks.conflict_resolved IS '冲突是否已解决';
COMMENT ON COLUMN track_tasks.created_at IS '创建时间';
COMMENT ON COLUMN track_tasks.updated_at IS '更新时间';
COMMENT ON COLUMN track_tasks.metadata IS '扩展数据（JSON）';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'track_tasks表创建成功';
END $$;
