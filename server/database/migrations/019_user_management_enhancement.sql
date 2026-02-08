-- ============================================
-- 用户管理系统增强 - 数据库迁移脚本
-- ============================================
-- 迁移时间: 2024年
-- 目的: 添加API密钥、会话管理、密码重置和审计日志功能
-- ============================================

-- ============================================
-- 1. API密钥表
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  hashed_key VARCHAR(255) NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_hashed_key_idx ON api_keys(hashed_key);
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys(prefix);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS api_keys_expires_at_idx ON api_keys(expires_at);

-- ============================================
-- 2. 用户会话表
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255) UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(token);
CREATE INDEX IF NOT EXISTS user_sessions_refresh_token_idx ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS user_sessions_is_active_idx ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS user_sessions_last_activity_at_idx ON user_sessions(last_activity_at);

-- ============================================
-- 3. 密码重置令牌表
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS password_reset_tokens_created_at_idx ON password_reset_tokens(created_at);

-- ============================================
-- 4. 用户审计日志表
-- ============================================
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36),
  action VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- login, logout, create, update, delete, etc.
  resource_type VARCHAR(50), -- user, robot, config, etc.
  resource_id VARCHAR(36),
  resource_name VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'success', -- success, failed, warning
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS user_audit_logs_user_id_idx ON user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS user_audit_logs_action_idx ON user_audit_logs(action);
CREATE INDEX IF NOT EXISTS user_audit_logs_action_type_idx ON user_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS user_audit_logs_resource_type_idx ON user_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS user_audit_logs_resource_id_idx ON user_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS user_audit_logs_status_idx ON user_audit_logs(status);
CREATE INDEX IF NOT EXISTS user_audit_logs_created_at_idx ON user_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS user_audit_logs_session_id_idx ON user_audit_logs(session_id);

-- ============================================
-- 5. 为users表添加新字段（如果不存在）
-- ============================================

-- 添加头像URL字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- 添加手机号字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 添加全名字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- 添加两步验证相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];

-- 添加账户锁定相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- 添加密码过期相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE;

-- 添加邮箱验证相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);

-- 添加最后活跃相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

-- 添加元数据字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- 6. 为robots表添加新字段（如果不存在）
-- ============================================

-- 添加创建者相关字段
ALTER TABLE robots ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36);
ALTER TABLE robots ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE robots ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- 创建索引
CREATE INDEX IF NOT EXISTS robots_owner_id_idx ON robots(owner_id);
CREATE INDEX IF NOT EXISTS robots_is_system_idx ON robots(is_system);

-- ============================================
-- 7. 机器人权限表
-- ============================================
CREATE TABLE IF NOT EXISTS robot_permissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  robot_id VARCHAR(36) NOT NULL,
  robot_name VARCHAR(255),
  permission_type VARCHAR(20) NOT NULL DEFAULT 'read',
  can_view BOOLEAN DEFAULT true NOT NULL,
  can_edit BOOLEAN DEFAULT false NOT NULL,
  can_delete BOOLEAN DEFAULT false NOT NULL,
  can_send_message BOOLEAN DEFAULT true NOT NULL,
  can_view_sessions BOOLEAN DEFAULT true NOT NULL,
  can_view_messages BOOLEAN DEFAULT true NOT NULL,
  assigned_by VARCHAR(36),
  assigned_by_name VARCHAR(255),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (robot_id) REFERENCES robots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS robot_permissions_user_id_idx ON robot_permissions(user_id);
CREATE INDEX IF NOT EXISTS robot_permissions_robot_id_idx ON robot_permissions(robot_id);
CREATE INDEX IF NOT EXISTS robot_permissions_permission_type_idx ON robot_permissions(permission_type);
CREATE INDEX IF NOT EXISTS robot_permissions_is_active_idx ON robot_permissions(is_active);
CREATE INDEX IF NOT EXISTS robot_permissions_assigned_by_idx ON robot_permissions(assigned_by);
CREATE INDEX IF NOT EXISTS robot_permissions_user_robot_idx ON robot_permissions(user_id, robot_id);

-- ============================================
-- 6. 创建触发器函数：自动更新 updated_at 字段
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为api_keys表创建触发器
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为users表创建触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 迁移完成
-- ============================================

-- 插入审计日志记录本次迁移
INSERT INTO user_audit_logs (action, action_type, resource_type, resource_name, details, status)
VALUES (
    'migration',
    'database',
    'user_management',
    'user_management_enhancement',
    '{"tables": ["api_keys", "user_sessions", "password_reset_tokens", "user_audit_logs"], "features": ["password_hashing", "session_management", "api_keys", "audit_logging"]}'::jsonb,
    'success'
);

-- 迁移成功提示
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '用户管理系统增强迁移完成';
    RAISE NOTICE '============================================';
    RAISE NOTICE '新增表:';
    RAISE NOTICE '  - api_keys (API密钥管理)';
    RAISE NOTICE '  - user_sessions (用户会话管理)';
    RAISE NOTICE '  - password_reset_tokens (密码重置令牌)';
    RAISE NOTICE '  - user_audit_logs (用户审计日志)';
    RAISE NOTICE '  - robot_permissions (机器人权限管理)';
    RAISE NOTICE '============================================';
    RAISE NOTICE '新增字段 (users表):';
    RAISE NOTICE '  - avatar_url (头像URL)';
    RAISE NOTICE '  - phone (手机号)';
    RAISE NOTICE '  - full_name (全名)';
    RAISE NOTICE '  - mfa_enabled (两步验证启用)';
    RAISE NOTICE '  - mfa_secret (两步验证密钥)';
    RAISE NOTICE '  - mfa_backup_codes (两步验证备用码)';
    RAISE NOTICE '  - failed_login_attempts (失败登录次数)';
    RAISE NOTICE '  - locked_until (锁定到期时间)';
    RAISE NOTICE '  - password_changed_at (密码修改时间)';
    RAISE NOTICE '  - password_expires_at (密码过期时间)';
    RAISE NOTICE '  - email_verified (邮箱验证状态)';
    RAISE NOTICE '  - email_verified_at (邮箱验证时间)';
    RAISE NOTICE '  - email_verification_token (邮箱验证令牌)';
    RAISE NOTICE '  - last_activity_at (最后活跃时间)';
    RAISE NOTICE '  - last_login_ip (最后登录IP)';
    RAISE NOTICE '  - metadata (元数据)';
    RAISE NOTICE '============================================';
    RAISE NOTICE '新增字段 (robots表):';
    RAISE NOTICE '  - owner_id (创建者ID)';
    RAISE NOTICE '  - owner_name (创建者名称)';
    RAISE NOTICE '  - is_system (是否为系统机器人)';
    RAISE NOTICE '============================================';
    RAISE NOTICE '权限控制说明:';
    RAISE NOTICE '  - 普通用户只能查看被分配的机器人';
    RAISE NOTICE '  - 普通用户可以添加自己的机器人';
    RAISE NOTICE '  - 普通用户不能删除系统机器人（is_system=true）';
    RAISE NOTICE '  - 超级管理员（role=admin）拥有全部权限';
    RAISE NOTICE '============================================';
END $$;
