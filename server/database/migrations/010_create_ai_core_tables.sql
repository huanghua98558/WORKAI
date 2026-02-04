-- ============================================
-- WorkTool AI 2.1 - AI核心能力相关表创建脚本
-- Migration: 010_create_ai_core_tables.sql
-- ============================================

-- 1. 创建AI提供商配置表
CREATE TABLE IF NOT EXISTS ai_providers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  api_key TEXT,
  api_endpoint VARCHAR(500),
  api_version VARCHAR(50),
  config JSONB DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 10,
  rate_limit INTEGER DEFAULT 60,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS ai_providers_name_idx ON ai_providers(name);
CREATE INDEX IF NOT EXISTS ai_providers_type_idx ON ai_providers(type);
CREATE INDEX IF NOT EXISTS ai_providers_is_enabled_idx ON ai_providers(is_enabled);
CREATE INDEX IF NOT EXISTS ai_providers_priority_idx ON ai_providers(priority);

-- 2. 创建AI模型配置表
CREATE TABLE IF NOT EXISTS ai_models (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  model_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  capabilities JSONB DEFAULT '[]',
  max_tokens INTEGER,
  input_price NUMERIC(10, 6),
  output_price NUMERIC(10, 6),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 10,
  config JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS ai_models_provider_id_idx ON ai_models(provider_id);
CREATE INDEX IF NOT EXISTS ai_models_name_idx ON ai_models(name);
CREATE INDEX IF NOT EXISTS ai_models_type_idx ON ai_models(type);
CREATE INDEX IF NOT EXISTS ai_models_is_enabled_idx ON ai_models(is_enabled);

-- 3. 创建AI角色配置表
CREATE TABLE IF NOT EXISTS ai_roles (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  system_prompt TEXT NOT NULL,
  temperature NUMERIC(5, 2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  model_id VARCHAR(36),
  prompt_template_id VARCHAR(36),
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  current_version VARCHAR(50) DEFAULT '1.0',
  created_by VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS ai_roles_name_idx ON ai_roles(name);
CREATE INDEX IF NOT EXISTS ai_roles_type_idx ON ai_roles(type);
CREATE INDEX IF NOT EXISTS ai_roles_category_idx ON ai_roles(category);
CREATE INDEX IF NOT EXISTS ai_roles_is_active_idx ON ai_roles(is_active);
CREATE INDEX IF NOT EXISTS ai_roles_is_default_idx ON ai_roles(is_default);

-- 4. 创建AI角色版本表
CREATE TABLE IF NOT EXISTS ai_role_versions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR(36) NOT NULL,
  version VARCHAR(50) NOT NULL,
  system_prompt TEXT NOT NULL,
  temperature NUMERIC(5, 2),
  max_tokens INTEGER,
  model_id VARCHAR(36),
  variables JSONB DEFAULT '{}',
  change_reason TEXT,
  change_log TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS ai_role_versions_role_id_idx ON ai_role_versions(role_id);
CREATE INDEX IF NOT EXISTS ai_role_versions_version_idx ON ai_role_versions(version);
CREATE INDEX IF NOT EXISTS ai_role_versions_created_at_idx ON ai_role_versions(created_at);

-- 5. 创建话术分类模板表
CREATE TABLE IF NOT EXISTS prompt_category_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  examples JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 5,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS prompt_category_templates_category_idx ON prompt_category_templates(category);
CREATE INDEX IF NOT EXISTS prompt_category_templates_is_active_idx ON prompt_category_templates(is_active);
CREATE INDEX IF NOT EXISTS prompt_category_templates_priority_idx ON prompt_category_templates(priority);

-- 6. 创建AI模型使用记录表
CREATE TABLE IF NOT EXISTS ai_model_usage (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(36) NOT NULL,
  provider_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(255),
  operation_type VARCHAR(50) NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  input_cost NUMERIC(10, 6),
  output_cost NUMERIC(10, 6),
  total_cost NUMERIC(10, 6),
  response_time INTEGER,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS ai_model_usage_model_id_idx ON ai_model_usage(model_id);
CREATE INDEX IF NOT EXISTS ai_model_usage_provider_id_idx ON ai_model_usage(provider_id);
CREATE INDEX IF NOT EXISTS ai_model_usage_session_id_idx ON ai_model_usage(session_id);
CREATE INDEX IF NOT EXISTS ai_model_usage_operation_type_idx ON ai_model_usage(operation_type);
CREATE INDEX IF NOT EXISTS ai_model_usage_status_idx ON ai_model_usage(status);
CREATE INDEX IF NOT EXISTS ai_model_usage_created_at_idx ON ai_model_usage(created_at);

-- 添加注释
COMMENT ON TABLE ai_providers IS 'AI提供商配置表 - 存储阿里云、OpenAI、Claude等提供商配置';
COMMENT ON TABLE ai_models IS 'AI模型配置表 - 存储各提供商的模型信息';
COMMENT ON TABLE ai_roles IS 'AI角色配置表 - 存储7个预设角色和自定义角色';
COMMENT ON TABLE ai_role_versions IS 'AI角色版本表 - 存储角色的历史版本';
COMMENT ON TABLE prompt_category_templates IS '话术分类模板表 - 存储24类场景的话术模板';
COMMENT ON TABLE ai_model_usage IS 'AI模型使用记录表 - 记录模型调用和成本';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'AI核心能力相关表创建成功';
END $$;
