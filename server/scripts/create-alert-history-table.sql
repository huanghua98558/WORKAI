-- 创建 alert_history 表
-- 执行方式: psql -U your_user -d your_database -f server/scripts/create-alert-history-table.sql

-- 创建表
CREATE TABLE IF NOT EXISTS alert_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255),
  alert_rule_id VARCHAR(36) NOT NULL,
  intent_type VARCHAR(50) NOT NULL,
  alert_level VARCHAR(20) NOT NULL,
  group_id VARCHAR(255),
  group_name VARCHAR(255),
  alert_group_id VARCHAR(36),
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  group_chat_id VARCHAR(255),
  message_content TEXT,
  alert_message TEXT NOT NULL,
  notification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notification_result JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_handled BOOLEAN NOT NULL DEFAULT false,
  handled_by VARCHAR(36),
  handled_at TIMESTAMP WITH TIME ZONE,
  handled_note TEXT,
  escalation_level INTEGER DEFAULT 0,
  escalation_count INTEGER DEFAULT 0,
  escalation_history JSONB DEFAULT '[]',
  parent_alert_id VARCHAR(36),
  batch_id VARCHAR(36),
  batch_size INTEGER DEFAULT 1,
  robot_id VARCHAR(64),
  assignee VARCHAR(36),
  confidence INTEGER,
  need_reply BOOLEAN,
  need_human BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alert_history_session_id ON alert_history(session_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_rule_id ON alert_history(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_intent_type ON alert_history(intent_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_level ON alert_history(alert_level);
CREATE INDEX IF NOT EXISTS idx_alert_history_notification_status ON alert_history(notification_status);
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON alert_history(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_group_id ON alert_history(alert_group_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_batch_id ON alert_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_parent_alert_id ON alert_history(parent_alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_escalation_level ON alert_history(escalation_level);

-- 创建 alert_groups 表（如果不存在）
CREATE TABLE IF NOT EXISTS alert_groups (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name VARCHAR(255) NOT NULL UNIQUE,
  group_code VARCHAR(50) NOT NULL UNIQUE,
  group_color VARCHAR(7),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 插入默认分组
INSERT INTO alert_groups (group_name, group_code, group_color, description, sort_order)
VALUES
  ('客户群', 'customer_group', '#3b82f6', '客户相关群组', 1),
  ('内部群', 'internal_group', '#10b981', '公司内部群组', 2),
  ('供应商群', 'supplier_group', '#f59e0b', '供应商相关群组', 3),
  ('合作伙伴群', 'partner_group', '#8b5cf6', '合作伙伴相关群组', 4)
ON CONFLICT (group_name) DO NOTHING;

-- 输出成功信息
SELECT 'alert_history 表创建成功！' AS status;
SELECT '已创建 ' || COUNT(*) || ' 个索引' AS index_count FROM pg_indexes WHERE tablename = 'alert_history';
SELECT '已插入 ' || COUNT(*) || ' 个默认分组' AS group_count FROM alert_groups;
