-- ============================================
-- WorkTool AI 2.1 - 工作人员表创建脚本
-- Migration: 013_create_staff_table.sql
-- ============================================

-- 1. 创建工作人员表
CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  avatar_url VARCHAR(500),
  phone VARCHAR(50),

  -- 权限
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  permissions JSONB DEFAULT '[]',

  -- 工作状态
  status VARCHAR(20) NOT NULL DEFAULT 'offline',
  status_message VARCHAR(500),

  -- 工作负载
  current_sessions INTEGER NOT NULL DEFAULT 0,
  max_sessions INTEGER NOT NULL DEFAULT 10,

  -- 工作时间
  work_schedule JSONB DEFAULT '{}',
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai',

  -- 统计
  total_interventions INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  avg_response_time INTEGER,
  satisfaction_rate NUMERIC(3, 2),

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS staff_status_idx ON staff(status);
CREATE INDEX IF NOT EXISTS staff_role_idx ON staff(role);
CREATE INDEX IF NOT EXISTS staff_email_idx ON staff(email);

-- 添加注释
COMMENT ON TABLE staff IS '工作人员表 - 存储工作人员信息';
COMMENT ON COLUMN staff.id IS '工作人员ID';
COMMENT ON COLUMN staff.name IS '姓名';
COMMENT ON COLUMN staff.email IS '邮箱（唯一）';
COMMENT ON COLUMN staff.avatar_url IS '头像URL';
COMMENT ON COLUMN staff.phone IS '电话';
COMMENT ON COLUMN staff.role IS '角色：admin-管理员, manager-经理, staff-工作人员';
COMMENT ON COLUMN staff.permissions IS '权限列表';
COMMENT ON COLUMN staff.status IS '状态：online-在线, busy-忙碌, offline-离线';
COMMENT ON COLUMN staff.current_sessions IS '当前会话数';
COMMENT ON COLUMN staff.max_sessions IS '最大会话数';
COMMENT ON COLUMN staff.total_interventions IS '介入总数';
COMMENT ON COLUMN staff.satisfaction_rate IS '满意率 0-1';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE '工作人员表创建成功';
END $$;
