-- 创建视频号转化系统相关表
-- 执行时间：2026-02-03

-- 1. 视频号用户表（记录通过WorkTool添加的用户）
CREATE TABLE IF NOT EXISTS video_channel_users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL,  -- WorkTool用户ID
  user_name VARCHAR(255),  -- 用户昵称
  robot_id VARCHAR(255),  -- 转化客服机器人ID
  robot_name VARCHAR(255),  -- 转化客服机器人名称
  status VARCHAR(50) DEFAULT 'new',  -- new, contact, building, waiting_login, logged_in, extracting, completed, failed
  source VARCHAR(50) DEFAULT 'worktool',  -- 来源：worktool
  metadata JSONB DEFAULT '{}',  -- 额外信息
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE video_channel_users IS '视频号用户表';
COMMENT ON COLUMN video_channel_users.status IS '状态：new（新用户）、contact（已联系）、building（搭建中）、waiting_login（等待登录）、logged_in（已登录）、extracting（提取中）、completed（已完成）、failed（失败）';

-- 2. 视频号二维码表（每个用户的专属二维码）
CREATE TABLE IF NOT EXISTS video_channel_qrcodes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL,  -- 关联用户ID
  qrcode_id VARCHAR(255) UNIQUE NOT NULL,  -- 二维码ID
  qrcode_path VARCHAR(500),  -- 本地文件路径
  qrcode_url VARCHAR(500),  -- OSS访问URL
  oss_object_name VARCHAR(255),  -- OSS对象名称
  status VARCHAR(50) DEFAULT 'created',  -- created, sent, scanned, expired, cancelled
  expires_at TIMESTAMP WITH TIME ZONE,  -- 过期时间
  scanned_at TIMESTAMP WITH TIME ZONE,  -- 扫码时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE video_channel_qrcodes IS '视频号二维码表';
COMMENT ON COLUMN video_channel_qrcodes.status IS '状态：created（已创建）、sent（已发送）、scanned（已扫码）、expired（已过期）、cancelled（已取消）';

-- 3. 视频号Cookie表（提取的Cookie信息）
CREATE TABLE IF NOT EXISTS video_channel_cookies (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL,  -- 关联用户ID
  cookie_data JSONB NOT NULL,  -- Cookie数据（包含所有Cookie的详细信息）
  cookie_count INTEGER DEFAULT 0,  -- Cookie数量
  shop_accessible BOOLEAN DEFAULT FALSE,  -- 是否可访问视频号小店
  assistant_accessible BOOLEAN DEFAULT FALSE,  -- 是否可访问视频号助手
  shop_status_code INTEGER,  -- 视频号小店HTTP状态码
  assistant_status_code INTEGER,  -- 视频号助手HTTP状态码
  permission_status VARCHAR(50) DEFAULT 'unknown',  -- unknown, full, partial, invalid
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 提取时间
  expires_at TIMESTAMP WITH TIME ZONE,  -- Cookie过期时间
  status VARCHAR(50) DEFAULT 'active',  -- active, expired, invalid
  audit_status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected
  audit_notes TEXT,  -- 审核备注
  audited_by VARCHAR(255),  -- 审核人
  audited_at TIMESTAMP WITH TIME ZONE,  -- 审核时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE video_channel_cookies IS '视频号Cookie表';
COMMENT ON COLUMN video_channel_cookies.permission_status IS '权限状态：unknown（未知）、full（完整权限）、partial（部分权限）、invalid（无效）';
COMMENT ON COLUMN video_channel_cookies.audit_status IS '审核状态：pending（待审核）、approved（已通过）、rejected（已拒绝）';

-- 4. 视频号消息记录表（发送给用户的消息）
CREATE TABLE IF NOT EXISTS video_channel_message_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,  -- 关联用户ID
  robot_id VARCHAR(255) NOT NULL,  -- 机器人ID
  message_type VARCHAR(50) NOT NULL,  -- qrcode, login_success, login_failed, cookie_extracted, permission_ok, permission_failed, etc.
  template_code VARCHAR(100),  -- 消息模板代码
  message_content TEXT,  -- 实际发送的消息内容
  status VARCHAR(50) DEFAULT 'sent',  -- pending, sent, failed
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 发送时间
  error_message TEXT,  -- 错误信息
  metadata JSONB DEFAULT '{}',  -- 额外信息
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE video_channel_message_logs IS '视频号消息记录表';
COMMENT ON COLUMN video_channel_message_logs.message_type IS '消息类型：qrcode（二维码）、login_success（登录成功）、login_failed（登录失败）、cookie_extracted（Cookie提取）、permission_ok（权限通过）、permission_failed（权限失败）等';

-- 5. 视频号消息模板表（可配置的消息模板）
CREATE TABLE IF NOT EXISTS video_channel_message_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,  -- 模板代码
  name VARCHAR(255) NOT NULL,  -- 模板名称
  description TEXT,  -- 模板描述
  template_content TEXT NOT NULL,  -- 模板内容（支持变量替换，如 {{userName}}）
  variables JSONB DEFAULT '[]',  -- 支持的变量列表
  category VARCHAR(50),  -- 分类：login, permission, cookie, etc.
  is_enabled BOOLEAN DEFAULT TRUE,  -- 是否启用
  priority INTEGER DEFAULT 10,  -- 优先级
  created_by VARCHAR(255),  -- 创建人
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE video_channel_message_templates IS '视频号消息模板表';

-- 6. 视频号人工审核记录表
CREATE TABLE IF NOT EXISTS video_channel_audit_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,  -- 关联用户ID
  cookie_id VARCHAR(36) NOT NULL,  -- 关联Cookie ID
  shop_screenshot_path VARCHAR(500),  -- 小店截图路径
  shop_screenshot_url VARCHAR(500),  -- 小店截图URL
  assistant_screenshot_path VARCHAR(500),  -- 助手截图路径
  assistant_screenshot_url VARCHAR(500),  -- 助手截图URL
  shop_accessible BOOLEAN,  -- 小店是否可访问
  assistant_accessible BOOLEAN,  -- 助手是否可访问
  shop_status_code INTEGER,  -- 小店HTTP状态码
  assistant_status_code INTEGER,  -- 助手HTTP状态码
  audit_result VARCHAR(50) DEFAULT 'pending',  -- pending, compliant, non_compliant, needs_review
  compliance_score INTEGER,  -- 合规分数（0-100）
  audit_notes TEXT,  -- 审核备注
  audited_by VARCHAR(255),  -- 审核人
  audited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 审核时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE video_channel_audit_records IS '视频号人工审核记录表';
COMMENT ON COLUMN video_channel_audit_records.audit_result IS '审核结果：pending（待审核）、compliant（合规）、non_compliant（不合规）、needs_review（需要复核）';

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_video_channel_users_user_id ON video_channel_users(user_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_users_robot_id ON video_channel_users(robot_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_users_status ON video_channel_users(status);
CREATE INDEX IF NOT EXISTS idx_video_channel_users_created_at ON video_channel_users(created_at);

CREATE INDEX IF NOT EXISTS idx_video_channel_qrcodes_user_id ON video_channel_qrcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_qrcodes_qrcode_id ON video_channel_qrcodes(qrcode_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_qrcodes_status ON video_channel_qrcodes(status);
CREATE INDEX IF NOT EXISTS idx_video_channel_qrcodes_expires_at ON video_channel_qrcodes(expires_at);

CREATE INDEX IF NOT EXISTS idx_video_channel_cookies_user_id ON video_channel_cookies(user_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_cookies_status ON video_channel_cookies(status);
CREATE INDEX IF NOT EXISTS idx_video_channel_cookies_permission_status ON video_channel_cookies(permission_status);
CREATE INDEX IF NOT EXISTS idx_video_channel_cookies_audit_status ON video_channel_cookies(audit_status);
CREATE INDEX IF NOT EXISTS idx_video_channel_cookies_created_at ON video_channel_cookies(created_at);

CREATE INDEX IF NOT EXISTS idx_video_channel_message_logs_user_id ON video_channel_message_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_message_logs_robot_id ON video_channel_message_logs(robot_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_message_logs_message_type ON video_channel_message_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_video_channel_message_logs_status ON video_channel_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_video_channel_message_logs_sent_at ON video_channel_message_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_video_channel_message_templates_code ON video_channel_message_templates(code);
CREATE INDEX IF NOT EXISTS idx_video_channel_message_templates_category ON video_channel_message_templates(category);
CREATE INDEX IF NOT EXISTS idx_video_channel_message_templates_is_enabled ON video_channel_message_templates(is_enabled);

CREATE INDEX IF NOT EXISTS idx_video_channel_audit_records_user_id ON video_channel_audit_records(user_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_audit_records_cookie_id ON video_channel_audit_records(cookie_id);
CREATE INDEX IF NOT EXISTS idx_video_channel_audit_records_audit_result ON video_channel_audit_records(audit_result);
CREATE INDEX IF NOT EXISTS idx_video_channel_audit_records_audited_at ON video_channel_audit_records(audited_at);

-- 插入默认消息模板
INSERT INTO video_channel_message_templates (code, name, description, template_content, variables, category, is_enabled, priority)
VALUES
  ('qrcode_sent', '发送二维码', '发送二维码给用户', '你好{{userName}}，这是视频号小店登录二维码，请在5分钟内扫描登录。', '["userName"]', 'login', TRUE, 10),
  ('login_success', '登录成功', '登录成功后的提示', '恭喜{{userName}}！登录成功！接下来我们帮你提取Cookie，请稍等...', '["userName"]', 'login', TRUE, 10),
  ('login_timeout', '登录超时', '登录超时提示', '登录超时，二维码已过期。请重新扫描二维码。', '["userName"]', 'login', TRUE, 10),
  ('login_failed', '登录失败', '登录失败提示', '登录失败，请稍后重试。如有问题请联系客服。', '["userName"]', 'login', TRUE, 10),
  ('cookie_extracted', 'Cookie提取成功', 'Cookie提取成功提示', 'Cookie提取成功！你的视频号已准备就绪。', '["userName"]', 'cookie', TRUE, 10),
  ('cookie_extract_failed', 'Cookie提取失败', 'Cookie提取失败提示', 'Cookie提取失败，请联系客服。', '["userName"]', 'cookie', TRUE, 10),
  ('permission_ok', '权限检测通过', '权限检测通过提示', '权限检测通过！你的视频号可以正常访问小店和助手。', '["userName"]', 'permission', TRUE, 10),
  ('permission_partial', '权限部分缺失', '权限部分缺失提示', '权限检测不完整，只能访问{{accessiblePages}}，请联系客服。', '["userName", "accessiblePages"]', 'permission', TRUE, 10),
  ('permission_failed', '权限检测失败', '权限检测失败提示', '权限检测失败！请联系客服检查你的视频号配置。', '["userName"]', 'permission', TRUE, 10)
ON CONFLICT (code) DO NOTHING;
