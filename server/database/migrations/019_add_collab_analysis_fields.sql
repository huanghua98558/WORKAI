-- ============================================
-- 协同分析优化 - 添加缺失字段
-- Migration: 019_add_collab_analysis_fields.sql
-- ============================================

-- 1. 为 staff_activities 表添加 staff_type 字段
ALTER TABLE staff_activities
ADD COLUMN IF NOT EXISTS staff_type VARCHAR(50) DEFAULT 'agent';

-- 2. 为 sessions 表添加 business_role 字段
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS business_role VARCHAR(255);

-- 3. 为 sessions 表添加 business_role_code 字段
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS business_role_code VARCHAR(50);

-- 4. 为 collaboration_decision_logs 表添加 business_role 字段
ALTER TABLE collaboration_decision_logs
ADD COLUMN IF NOT EXISTS business_role VARCHAR(255);

-- 5. 为 collaboration_decision_logs 表添加 business_role_code 字段
ALTER TABLE collaboration_decision_logs
ADD COLUMN IF NOT EXISTS business_role_code VARCHAR(50);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_staff_activities_staff_type ON staff_activities(staff_type);
CREATE INDEX IF NOT EXISTS idx_sessions_business_role ON sessions(business_role);
CREATE INDEX IF NOT EXISTS idx_sessions_business_role_code ON sessions(business_role_code);
CREATE INDEX IF NOT EXISTS idx_collab_decision_business_role ON collaboration_decision_logs(business_role);
CREATE INDEX IF NOT EXISTS idx_collab_decision_business_role_code ON collaboration_decision_logs(business_role_code);

-- 添加注释
COMMENT ON COLUMN staff_activities.staff_type IS '工作人员类型：manager-经理, agent-客服, supervisor-主管, other-其他';
COMMENT ON COLUMN sessions.business_role IS '业务角色名称';
COMMENT ON COLUMN sessions.business_role_code IS '业务角色代码';
COMMENT ON COLUMN collaboration_decision_logs.business_role IS '业务角色名称';
COMMENT ON COLUMN collaboration_decision_logs.business_role_code IS '业务角色代码';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE '协同分析字段添加成功';
END $$;
