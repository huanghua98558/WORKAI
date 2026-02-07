/**
 * 数据库索引优化脚本
 * 用于添加性能优化的索引
 */

require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// 创建数据库连接
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

// 索引定义
const indexes = [
  // robots 表索引
  { name: 'idx_robots_name', sql: 'CREATE INDEX IF NOT EXISTS idx_robots_name ON robots(name)' },
  { name: 'idx_robots_created_at_desc', sql: 'CREATE INDEX IF NOT EXISTS idx_robots_created_at_desc ON robots(created_at DESC)' },
  { name: 'idx_robots_robot_group', sql: 'CREATE INDEX IF NOT EXISTS idx_robots_robot_group ON robots(robot_group)' },
  { name: 'idx_robots_status_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_robots_status_created_at ON robots(status, created_at DESC)' },
  { name: 'idx_robots_group_status', sql: 'CREATE INDEX IF NOT EXISTS idx_robots_group_status ON robots(robot_group, status)' },

  // robotCommands 表索引
  { name: 'idx_robot_commands_robot_status', sql: 'CREATE INDEX IF NOT EXISTS idx_robot_commands_robot_status ON robot_commands(robot_id, status)' },
  { name: 'idx_robot_commands_created_at_desc', sql: 'CREATE INDEX IF NOT EXISTS idx_robot_commands_created_at_desc ON robot_commands(created_at DESC)' },
  { name: 'idx_robot_commands_status_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_robot_commands_status_created_at ON robot_commands(status, created_at DESC)' },

  // flowInstances 表索引
  { name: 'idx_flow_instances_definition_status', sql: 'CREATE INDEX IF NOT EXISTS idx_flow_instances_definition_status ON flow_instances(flow_definition_id, status)' },
  { name: 'idx_flow_instances_status_started_at', sql: 'CREATE INDEX IF NOT EXISTS idx_flow_instances_status_started_at ON flow_instances(status, started_at DESC)' },
  { name: 'idx_flow_instances_trigger_status', sql: 'CREATE INDEX IF NOT EXISTS idx_flow_instances_trigger_status ON flow_instances(trigger_type, status)' },

  // alertHistory 表索引
  { name: 'idx_alert_history_level_status', sql: 'CREATE INDEX IF NOT EXISTS idx_alert_history_level_status ON alert_history(alert_level, status)' },
  { name: 'idx_alert_history_status_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_alert_history_status_created_at ON alert_history(status, created_at DESC)' },
  { name: 'idx_alert_history_user_status', sql: 'CREATE INDEX IF NOT EXISTS idx_alert_history_user_status ON alert_history(user_id, status)' },

  // sessionMessages 表索引
  { name: 'idx_session_messages_timestamp_desc', sql: 'CREATE INDEX IF NOT EXISTS idx_session_messages_timestamp_desc ON session_messages(timestamp DESC)' },
  { name: 'idx_session_messages_user_timestamp', sql: 'CREATE INDEX IF NOT EXISTS idx_session_messages_user_timestamp ON session_messages(user_id, timestamp DESC)' },
  { name: 'idx_session_messages_group_timestamp', sql: 'CREATE INDEX IF NOT EXISTS idx_session_messages_group_timestamp ON session_messages(group_id, timestamp DESC)' },

  // ai_io_logs 表索引
  { name: 'idx_ai_io_logs_operation_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_ai_io_logs_operation_created_at ON ai_io_logs(operation_type, created_at DESC)' },
  { name: 'idx_ai_io_logs_model_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_ai_io_logs_model_created_at ON ai_io_logs(model_id, created_at DESC)' },
  { name: 'idx_ai_io_logs_status_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_ai_io_logs_status_created_at ON ai_io_logs(status, created_at DESC)' },

  // apiCallLogs 表索引
  { name: 'idx_api_call_logs_type_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_api_call_logs_type_created_at ON api_call_logs(api_type, created_at DESC)' },
  { name: 'idx_api_call_logs_success_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_api_call_logs_success_created_at ON api_call_logs(success, created_at DESC)' },
  { name: 'idx_api_call_logs_response_time', sql: 'CREATE INDEX IF NOT EXISTS idx_api_call_logs_response_time ON api_call_logs(response_time) WHERE response_time > 100' },

  // callbackHistory 表索引
  { name: 'idx_callback_history_type_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_callback_history_type_created_at ON callback_history(callback_type, created_at DESC)' },
  { name: 'idx_callback_history_error_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_callback_history_error_created_at ON callback_history(error_code, created_at DESC) WHERE error_code != 0' },

  // flowExecutionLogs 表索引
  { name: 'idx_flow_execution_logs_node_status', sql: 'CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_node_status ON flow_execution_logs(node_type, status)' },
  { name: 'idx_flow_execution_logs_status_started_at', sql: 'CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_status_started_at ON flow_execution_logs(status, started_at DESC)' },

  // aiModelUsage 表索引
  { name: 'idx_ai_model_usage_operation_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_ai_model_usage_operation_created_at ON ai_model_usage(operation_type, created_at DESC)' },
  { name: 'idx_ai_model_usage_status_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_ai_model_usage_status_created_at ON ai_model_usage(status, created_at DESC) WHERE status = \'error\'' },
  { name: 'idx_ai_model_usage_model_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_ai_model_usage_model_created_at ON ai_model_usage(model_id, created_at DESC)' },
];

async function createIndexes() {
  console.log('=== 数据库索引优化 ===\n');
  console.log(`总共需要创建 ${indexes.length} 个索引\n`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const index of indexes) {
    try {
      await client.unsafe(index.sql);
      console.log(`✅ ${index.name} - 创建成功`);
      successCount++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⏭️  ${index.name} - 已存在，跳过`);
        skipCount++;
      } else {
        console.log(`❌ ${index.name} - 失败: ${error.message}`);
        failCount++;
      }
    }
  }

  console.log('\n=== 索引创建完成 ===');
  console.log(`成功: ${successCount}`);
  console.log(`跳过: ${skipCount}`);
  console.log(`失败: ${failCount}`);
  console.log(`总计: ${indexes.length}\n`);

  // 查看所有索引
  console.log('=== 查看索引统计 ===');
  const tables = ['robots', 'robot_commands', 'flow_instances', 'alert_history', 'session_messages', 'ai_io_logs', 'api_call_logs', 'callback_history', 'flow_execution_logs', 'ai_model_usage'];

  for (const table of tables) {
    try {
      const result = await client.unsafe(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = '${table}'
      `);
      console.log(`${table}: ${result[0].count} 个索引`);
    } catch (error) {
      console.log(`${table}: 查询失败`);
    }
  }

  await client.end();
  process.exit(failCount > 0 ? 1 : 0);
}

createIndexes().catch((error) => {
  console.error('创建索引时出错:', error);
  process.exit(1);
});
