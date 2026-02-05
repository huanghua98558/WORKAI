-- ============================================
-- WorkTool AI 2.1 - 介入记录表创建脚本
-- Migration: 013_create_interventions_table.sql
-- ============================================

-- 1. 创建介入记录表
CREATE TABLE IF NOT EXISTS interventions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 会话关联
  session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- 工作人员信息
  staff_id VARCHAR(36) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  staff_name VARCHAR(200) NOT NULL,

  -- 触发消息
  message_id VARCHAR(36),

  -- 介入信息
  intervention_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  reason TEXT,

  -- 介入内容
  intervention_content TEXT,

  -- 上下文信息
  message_snapshot JSONB DEFAULT '{}',
  session_snapshot JSONB DEFAULT '{}',

  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  -- 解决信息
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(36),
  resolution_note TEXT,

  -- 时间信息
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- 元数据
  metadata JSONB DEFAULT '{}'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS interventions_session_id_idx ON interventions(session_id);
CREATE INDEX IF NOT EXISTS interventions_staff_id_idx ON interventions(staff_id);
CREATE INDEX IF NOT EXISTS interventions_status_idx ON interventions(status);
CREATE INDEX IF NOT EXISTS interventions_intervention_type_idx ON interventions(intervention_type);
CREATE INDEX IF NOT EXISTS interventions_created_at_idx ON interventions(created_at);
CREATE INDEX IF NOT EXISTS interventions_message_id_idx ON interventions(message_id);

-- 添加注释
COMMENT ON TABLE interventions IS '介入记录表 - 记录工作人员介入情况';
COMMENT ON COLUMN interventions.session_id IS '会话ID';
COMMENT ON COLUMN interventions.staff_id IS '工作人员ID';
COMMENT ON COLUMN interventions.staff_name IS '工作人员姓名';
COMMENT ON COLUMN interventions.message_id IS '触发介入的消息ID';
COMMENT ON COLUMN interventions.intervention_type IS '介入类型：manual-手动介入, automatic-自动介入, escalation-升级介入';
COMMENT ON COLUMN interventions.reason IS '介入原因';
COMMENT ON COLUMN interventions.intervention_content IS '介入内容（工作人员的回复或操作）';
COMMENT ON COLUMN interventions.message_snapshot IS '触发消息的快照';
COMMENT ON COLUMN interventions.session_snapshot IS '会话状态快照';
COMMENT ON COLUMN interventions.status IS '状态：active-活跃中, resolved-已解决, closed-已关闭, transferred-已转移';
COMMENT ON COLUMN interventions.resolved_at IS '解决时间';
COMMENT ON COLUMN interventions.resolved_by IS '解决者ID';
COMMENT ON COLUMN interventions.resolution_note IS '解决备注';
COMMENT ON COLUMN interventions.duration_seconds IS '介入时长（秒）';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE '介入记录表创建成功';
END $$;
