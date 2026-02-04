-- ============================================
-- WorkTool AI 2.1 - 流程引擎相关表创建脚本
-- Migration: 009_create_flow_engine_tables.sql
-- ============================================

-- 1. 创建流程定义表
CREATE TABLE IF NOT EXISTS flow_definitions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  variables JSONB DEFAULT '{}',
  timeout INTEGER DEFAULT 30000,
  retry_config JSONB DEFAULT '{"maxRetries": 3, "retryInterval": 1000}',
  created_by VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS flow_definitions_is_active_idx ON flow_definitions(is_active);
CREATE INDEX IF NOT EXISTS flow_definitions_trigger_type_idx ON flow_definitions(trigger_type);
CREATE INDEX IF NOT EXISTS flow_definitions_created_at_idx ON flow_definitions(created_at);

-- 2. 创建流程实例表
CREATE TABLE IF NOT EXISTS flow_instances (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_definition_id VARCHAR(36) NOT NULL,
  flow_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  trigger_type VARCHAR(50) NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  current_node_id VARCHAR(36),
  execution_path JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  error_message TEXT,
  error_stack TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_time INTEGER,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS flow_instances_flow_definition_id_idx ON flow_instances(flow_definition_id);
CREATE INDEX IF NOT EXISTS flow_instances_status_idx ON flow_instances(status);
CREATE INDEX IF NOT EXISTS flow_instances_current_node_id_idx ON flow_instances(current_node_id);
CREATE INDEX IF NOT EXISTS flow_instances_started_at_idx ON flow_instances(started_at);
CREATE INDEX IF NOT EXISTS flow_instances_created_at_idx ON flow_instances(created_at);

-- 3. 创建流程执行日志表
CREATE TABLE IF NOT EXISTS flow_execution_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_instance_id VARCHAR(36) NOT NULL,
  flow_definition_id VARCHAR(36),
  node_id VARCHAR(36) NOT NULL,
  node_type VARCHAR(50) NOT NULL,
  node_name VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_time INTEGER,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS flow_execution_logs_flow_instance_id_idx ON flow_execution_logs(flow_instance_id);
CREATE INDEX IF NOT EXISTS flow_execution_logs_flow_definition_id_idx ON flow_execution_logs(flow_definition_id);
CREATE INDEX IF NOT EXISTS flow_execution_logs_node_id_idx ON flow_execution_logs(node_id);
CREATE INDEX IF NOT EXISTS flow_execution_logs_status_idx ON flow_execution_logs(status);
CREATE INDEX IF NOT EXISTS flow_execution_logs_started_at_idx ON flow_execution_logs(started_at);
CREATE INDEX IF NOT EXISTS flow_execution_logs_created_at_idx ON flow_execution_logs(created_at);

-- 添加注释
COMMENT ON TABLE flow_definitions IS '流程定义表 - 存储流程的节点配置、边配置等';
COMMENT ON TABLE flow_instances IS '流程实例表 - 存储流程的执行实例和状态';
COMMENT ON TABLE flow_execution_logs IS '流程执行日志表 - 存储每个节点的执行记录';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE '流程引擎相关表创建成功';
END $$;
