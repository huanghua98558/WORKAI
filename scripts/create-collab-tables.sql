-- =====================================================
-- 协同分析模块 - 新表创建脚本
-- 创建时间：2026-02-07
-- 影响评估：零风险（仅创建新表，不修改现有数据）
-- =====================================================

-- =====================================================
-- 1. 任务表 (tasks)
-- 用于记录业务角色创建的任务
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  business_role_id VARCHAR(36),
  robot_id VARCHAR(36),
  session_id VARCHAR(36),
  staff_user_id VARCHAR(36),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- 创建索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_tasks_business_role ON tasks(business_role_id);
CREATE INDEX IF NOT EXISTS idx_tasks_robot ON tasks(robot_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);

-- 添加注释
COMMENT ON TABLE tasks IS '任务表 - 记录业务角色创建的任务';
COMMENT ON COLUMN tasks.business_role_id IS '关联的业务角色ID';
COMMENT ON COLUMN tasks.status IS '任务状态：pending-待处理, processing-处理中, completed-已完成, cancelled-已取消';
COMMENT ON COLUMN tasks.priority IS '优先级：low-低, normal-中, high-高';

-- =====================================================
-- 2. 关键词触发日志表 (keyword_triggers)
-- 用于记录业务角色关键词的触发情况
-- =====================================================

CREATE TABLE IF NOT EXISTS keyword_triggers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_role_id VARCHAR(36),
  robot_id VARCHAR(36),
  session_id VARCHAR(36),
  message_id VARCHAR(36),
  keyword VARCHAR(100) NOT NULL,
  triggered_by VARCHAR(50) CHECK (triggered_by IN ('user', 'staff', 'system')),
  decision_outcome VARCHAR(50) CHECK (decision_outcome IN ('ai_reply', 'staff_reply', 'both', 'none')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_keyword_triggers_business_role ON keyword_triggers(business_role_id);
CREATE INDEX IF NOT EXISTS idx_keyword_triggers_robot ON keyword_triggers(robot_id);
CREATE INDEX IF NOT EXISTS idx_keyword_triggers_keyword ON keyword_triggers(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_triggers_created ON keyword_triggers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_triggers_session ON keyword_triggers(session_id);

-- 添加注释
COMMENT ON TABLE keyword_triggers IS '关键词触发日志表 - 记录业务角色关键词的触发情况';
COMMENT ON COLUMN keyword_triggers.triggered_by IS '触发者：user-用户, staff-工作人员, system-系统';
COMMENT ON COLUMN keyword_triggers.decision_outcome IS '决策结果：ai_reply-AI回复, staff_reply-工作人员回复, both-都回复, none-不回复';

-- =====================================================
-- 3. 修改 staff_activities 表
-- 添加工作人员类型字段
-- =====================================================

-- 检查字段是否已存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_activities' AND column_name = 'staff_type'
  ) THEN
    ALTER TABLE staff_activities
    ADD COLUMN staff_type VARCHAR(50);

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_staff_activities_type ON staff_activities(staff_type);

    -- 添加注释
    COMMENT ON COLUMN staff_activities.staff_type IS '工作人员类型：community_ops-社群运营, after_sales-售后客服, conversion_staff-转化客服等';
  END IF;
END $$;

-- =====================================================
-- 验证脚本
-- =====================================================

-- 检查表是否创建成功
SELECT
  'tasks' as table_name,
  COUNT(*) as record_count
FROM tasks
UNION ALL
SELECT
  'keyword_triggers' as table_name,
  COUNT(*) as record_count
FROM keyword_triggers
UNION ALL
SELECT
  'staff_activities' as table_name,
  COUNT(*) as record_count
FROM staff_activities;

-- 检查索引是否创建成功
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('tasks', 'keyword_triggers', 'staff_activities')
ORDER BY tablename, indexname;

-- =====================================================
-- 完成
-- =====================================================
SELECT '✅ 所有表和索引创建成功！' as status;
