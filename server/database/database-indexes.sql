-- =====================================================
-- WorkTool AI 数据库索引优化 SQL
-- 第二阶段：性能提升
-- =====================================================

-- 说明：
-- 本文件包含所有需要添加的数据库索引，用于优化查询性能
-- 执行前请确保已备份数据库
-- 执行方式：psql -U username -d database_name -f database-indexes.sql

-- =====================================================
-- 1. robots 表索引优化
-- =====================================================

-- 机器人名称索引（用于按名称搜索）
CREATE INDEX IF NOT EXISTS idx_robots_name ON robots(name);

-- 机器人创建时间倒序索引（用于最新机器人列表）
CREATE INDEX IF NOT EXISTS idx_robots_created_at_desc ON robots(created_at DESC);

-- 机器人分组索引（用于按分组筛选）
CREATE INDEX IF NOT EXISTS idx_robots_robot_group ON robots(robot_group);

-- 机器人状态和创建时间组合索引（用于按状态筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_robots_status_created_at ON robots(status, created_at DESC);

-- 机器人分组和状态组合索引（用于按分组和状态筛选）
CREATE INDEX IF NOT EXISTS idx_robots_group_status ON robots(robot_group, status);

-- =====================================================
-- 2. robotCommands 表索引优化（执行记录）
-- =====================================================

-- 机器人ID和状态组合索引（用于查询特定机器人的执行记录）
CREATE INDEX IF NOT EXISTS idx_robot_commands_robot_status ON robot_commands(robot_id, status);

-- 执行记录创建时间倒序索引（用于最新执行记录）
CREATE INDEX IF NOT EXISTS idx_robot_commands_created_at_desc ON robot_commands(created_at DESC);

-- 执行记录状态和创建时间组合索引（用于按状态筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_robot_commands_status_created_at ON robot_commands(status, created_at DESC);

-- =====================================================
-- 3. flowInstances 表索引优化（流程实例）
-- =====================================================

-- 流程定义ID和状态组合索引（用于查询特定流程的实例）
CREATE INDEX IF NOT EXISTS idx_flow_instances_definition_status ON flow_instances(flow_definition_id, status);

-- 流程实例状态和开始时间组合索引（用于按状态筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_flow_instances_status_started_at ON flow_instances(status, started_at DESC);

-- 流程实例触发类型和状态组合索引（用于按触发类型和状态筛选）
CREATE INDEX IF NOT EXISTS idx_flow_instances_trigger_status ON flow_instances(trigger_type, status);

-- =====================================================
-- 4. alertHistory 表索引优化（告警历史）
-- =====================================================

-- 告警级别和状态组合索引（用于按告警级别和状态筛选）
CREATE INDEX IF NOT EXISTS idx_alert_history_level_status ON alert_history(alert_level, status);

-- 告警历史状态和创建时间组合索引（用于按状态筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_alert_history_status_created_at ON alert_history(status, created_at DESC);

-- 告警历史用户ID和状态组合索引（用于查询特定用户的告警）
CREATE INDEX IF NOT EXISTS idx_alert_history_user_status ON alert_history(user_id, status);

-- =====================================================
-- 5. sessionMessages 表索引优化（会话消息）
-- =====================================================

-- 会话消息时间戳倒序索引（用于最新消息列表）
CREATE INDEX IF NOT EXISTS idx_session_messages_timestamp_desc ON session_messages(timestamp DESC);

-- 会话消息用户ID和时间戳组合索引（用于查询特定用户的最新消息）
CREATE INDEX IF NOT EXISTS idx_session_messages_user_timestamp ON session_messages(user_id, timestamp DESC);

-- 会话消息群组ID和时间戳组合索引（用于查询特定群的最新消息）
CREATE INDEX IF NOT EXISTS idx_session_messages_group_timestamp ON session_messages(group_id, timestamp DESC);

-- =====================================================
-- 6. ai_io_logs 表索引优化（AI交互日志）
-- =====================================================

-- AI操作类型和创建时间组合索引（用于按操作类型筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_ai_io_logs_operation_created_at ON ai_io_logs(operation_type, created_at DESC);

-- AI模型ID和创建时间组合索引（用于查询特定模型的使用记录）
CREATE INDEX IF NOT EXISTS idx_ai_io_logs_model_created_at ON ai_io_logs(model_id, created_at DESC);

-- AI状态和创建时间组合索引（用于按状态筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_ai_io_logs_status_created_at ON ai_io_logs(status, created_at DESC);

-- =====================================================
-- 7. apiCallLogs 表索引优化（API调用日志）
-- =====================================================

-- API调用类型和创建时间组合索引（用于按API类型筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_api_call_logs_type_created_at ON api_call_logs(api_type, created_at DESC);

-- API调用成功状态和创建时间组合索引（用于查询失败记录）
CREATE INDEX IF NOT EXISTS idx_api_call_logs_success_created_at ON api_call_logs(success, created_at DESC);

-- API调用响应时间索引（用于性能分析）
CREATE INDEX IF NOT EXISTS idx_api_call_logs_response_time ON api_call_logs(response_time) WHERE response_time > 100;

-- =====================================================
-- 8. callbackHistory 表索引优化（回调历史）
-- =====================================================

-- 回调类型和创建时间组合索引（用于按回调类型筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_callback_history_type_created_at ON callback_history(callback_type, created_at DESC);

-- 回调错误码和创建时间组合索引（用于查询失败回调）
CREATE INDEX IF NOT EXISTS idx_callback_history_error_created_at ON callback_history(error_code, created_at DESC) WHERE error_code != 0;

-- =====================================================
-- 9. flowExecutionLogs 表索引优化（流程执行日志）
-- =====================================================

-- 流程执行节点类型和状态组合索引（用于按节点类型和状态筛选）
CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_node_status ON flow_execution_logs(node_type, status);

-- 流程执行状态和开始时间组合索引（用于按状态筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_status_started_at ON flow_execution_logs(status, started_at DESC);

-- =====================================================
-- 10. aiModelUsage 表索引优化（AI模型使用记录）
-- =====================================================

-- AI模型使用记录操作类型和创建时间组合索引（用于按操作类型筛选并按时间排序）
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_operation_created_at ON ai_model_usage(operation_type, created_at DESC);

-- AI模型使用记录状态和创建时间组合索引（用于查询失败记录）
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_status_created_at ON ai_model_usage(status, created_at DESC) WHERE status = 'error';

-- AI模型使用记录模型ID和创建时间组合索引（用于查询特定模型的使用趋势）
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_model_created_at ON ai_model_usage(model_id, created_at DESC);

-- =====================================================
-- 索引优化完成
-- =====================================================

-- 查看所有索引
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('robots', 'robot_commands', 'flow_instances', 'alert_history', 'session_messages', 'ai_io_logs', 'api_call_logs', 'callback_history', 'flow_execution_logs', 'ai_model_usage')
-- ORDER BY tablename, indexname;

-- 查看索引大小
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE tablename IN ('robots', 'robot_commands', 'flow_instances', 'alert_history', 'session_messages', 'ai_io_logs', 'api_call_logs', 'callback_history', 'flow_execution_logs', 'ai_model_usage')
-- ORDER BY pg_relation_size(indexrelid) DESC;
