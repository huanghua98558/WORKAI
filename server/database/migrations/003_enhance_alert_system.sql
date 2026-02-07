-- 告警系统增强功能迁移
-- 添加分组、批量处理和升级机制

-- 1. 创建告警分组表
CREATE TABLE IF NOT EXISTS alert_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name VARCHAR(100) NOT NULL UNIQUE,
  group_code VARCHAR(50) NOT NULL UNIQUE,
  group_description TEXT,
  group_color VARCHAR(20) DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 修改告警规则表，添加升级相关字段
ALTER TABLE alert_rules
  ADD COLUMN IF NOT EXISTS group_ref UUID,
  ADD COLUMN IF NOT EXISTS enable_escalation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_threshold INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS escalation_interval INTEGER DEFAULT 1800,
  ADD COLUMN IF NOT EXISTS escalation_config JSONB DEFAULT '{}';

-- 3. 修改告警历史表，添加分组和升级相关字段
ALTER TABLE alert_history
  ADD COLUMN IF NOT EXISTS group_ref UUID,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS parent_alert_id UUID REFERENCES alert_history(id),
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 1;

-- 4. 创建告警升级历史表
CREATE TABLE IF NOT EXISTS alert_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alert_history(id) ON DELETE CASCADE,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  escalate_reason TEXT,
  escalate_method VARCHAR(50),
  escalate_config JSONB,
  escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  escalated_by VARCHAR(100),
  INDEX idx_alert_upgrades_alert_id (alert_id),
  INDEX idx_alert_upgrades_escalated_at (escalated_at)
);

-- 5. 创建告警批量处理记录表
CREATE TABLE IF NOT EXISTS alert_batch_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(50) NOT NULL,
  operation_status VARCHAR(20) DEFAULT 'pending',
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  filter_conditions JSONB,
  operation_result JSONB,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_batch_operations_created_at (created_at),
  INDEX idx_batch_operations_status (operation_status)
);

-- 6. 创建告警统计快照表（用于趋势分析）
CREATE TABLE IF NOT EXISTS alert_stats_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  stat_hour INTEGER,
  total_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0,
  handled_count INTEGER DEFAULT 0,
  escalated_count INTEGER DEFAULT 0,
  avg_response_time FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(stat_date, stat_hour)
);

-- 7. 插入默认分组
INSERT INTO alert_groups (group_name, group_code, group_description, group_color, sort_order, is_default)
VALUES 
  ('系统告警', 'system', '系统级别告警，涉及系统运行、服务可用性等', '#EF4444', 1, TRUE),
  ('业务告警', 'business', '业务级别告警，涉及业务流程、用户操作等', '#F59E0B', 2, FALSE),
  ('安全告警', 'security', '安全级别告警，涉及风险内容、恶意攻击等', '#DC2626', 0, FALSE),
  ('运营告警', 'operation', '运营级别告警，涉及垃圾信息、违规内容等', '#8B5CF6', 3, FALSE)
ON CONFLICT (group_name) DO NOTHING;

-- 8. 更新现有告警规则，分配到默认分组
UPDATE alert_rules
SET group_ref = (SELECT id FROM alert_groups WHERE group_code = 'security' LIMIT 1)
WHERE intentType IN ('risk', 'spam');

UPDATE alert_rules
SET group_ref = (SELECT id FROM alert_groups WHERE group_code = 'system' LIMIT 1)
WHERE intentType IN ('admin');

UPDATE alert_rules
SET group_ref = (SELECT id FROM alert_groups WHERE group_code = 'business' LIMIT 1)
WHERE intentType NOT IN ('risk', 'spam', 'admin');

-- 9. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_alert_history_group_ref ON alert_history(group_ref);
CREATE INDEX IF NOT EXISTS idx_alert_history_batch_id ON alert_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_parent_alert_id ON alert_history(parent_alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_group_ref ON alert_rules(group_ref);
CREATE INDEX IF NOT EXISTS idx_alert_history_escalation_level ON alert_history(escalation_level);

-- 10. 创建函数：自动更新更新时间
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. 为表添加触发器
CREATE TRIGGER update_alert_groups_updated_at BEFORE UPDATE ON alert_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
