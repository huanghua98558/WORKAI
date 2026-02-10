#!/usr/bin/env node

/**
 * 数据库一致性检查脚本
 * 对比 schema.js 和数据库，检查是否有遗漏的表
 */

import pg from 'pg';
const { Client } = pg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库配置
const dbConfig = {
  host: 'pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com',
  port: 5432,
  database: 'worktool_ai',
  user: 'worktoolAI',
  password: 'YourSecurePassword123',
  ssl: false
};

async function checkDatabaseConsistency() {
  const client = new Client(dbConfig);

  try {
    console.log('🔍 数据库一致性检查\n');
    console.log('='.repeat(50));

    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 从 schema.js 中提取所有表名
    console.log('📖 读取 schema.js...');
    const schemaPath = join(__dirname, '../server/database/schema.js');
    const schemaContent = readFileSync(schemaPath, 'utf-8');

    // 提取所有 pgTable 定义
    const tableRegex = /exports\.(\w+)\s*=\s*pgTable\s*\(\s*"([^"]+)"/g;
    const schemaTables = [];
    let match;

    while ((match = tableRegex.exec(schemaContent)) !== null) {
      const exportName = match[1];
      const tableName = match[2];

      // 跳过非表导出（insertUserSchema 等）
      if (!exportName.includes('Schema') && !exportName.includes('_')) {
        schemaTables.push({
          exportName: exportName,
          tableName: tableName
        });
      }
    }

    console.log(`✅ 在 schema.js 中找到 ${schemaTables.length} 张表\n`);

    // 从数据库中获取所有表
    console.log('📊 查询数据库中的表...');
    const dbTablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
      ORDER BY table_name
    `);

    const dbTables = dbTablesResult.rows.map(row => row.table_name);
    console.log(`✅ 在数据库中找到 ${dbTables.length} 张表\n`);

    // 对比差异
    console.log('🔍 对比差异...\n');

    const schemaTableNames = schemaTables.map(t => t.tableName);
    const missingTables = schemaTableNames.filter(name => !dbTables.includes(name));
    const extraTables = dbTables.filter(name => !schemaTableNames.includes(name));

    // 输出结果
    console.log('='.repeat(50));
    console.log('📊 检查结果\n');

    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('✅ 数据库与 schema.js 完全一致！');
      console.log(`✅ 总共 ${dbTables.length} 张表\n`);
    } else {
      // 缺失的表
      if (missingTables.length > 0) {
        console.log('❌ 缺失的表（在 schema.js 中但不在数据库中）：');
        missingTables.forEach(tableName => {
          const tableInfo = schemaTables.find(t => t.tableName === tableName);
          console.log(`  ❌ ${tableName} (export: ${tableInfo.exportName})`);
        });
        console.log(`  共 ${missingTables.length} 张表缺失\n`);
      }

      // 额外的表
      if (extraTables.length > 0) {
        console.log('⚠️  额外的表（在数据库中但不在 schema.js 中）：');
        extraTables.forEach(tableName => {
          console.log(`  ⚠️  ${tableName}`);
        });
        console.log(`  共 ${extraTables.length} 张额外表\n`);
      }

      // 建议
      console.log('💡 建议：');
      if (missingTables.length > 0) {
        console.log('  - 运行迁移脚本创建缺失的表');
        console.log('  - 或使用 Drizzle Kit 推送 schema：pnpm drizzle-kit push');
      }
      if (extraTables.length > 0) {
        console.log('  - 检查是否需要在 schema.js 中定义这些表');
        console.log('  - 或者删除数据库中的冗余表');
      }
      console.log('');
    }

    // 按模块统计
    console.log('='.repeat(50));
    console.log('📊 表统计\n');

    const modules = {
      '用户管理': ['users', 'user_login_sessions', 'user_audit_logs'],
      '会话管理': ['sessions', 'user_sessions', 'group_sessions', 'session_messages', 'session_staff_status'],
      '流程引擎': ['flow_definitions', 'flow_instances', 'flow_execution_logs'],
      'AI服务': ['ai_models', 'ai_providers', 'ai_roles', 'ai_role_versions', 'ai_io_logs', 'ai_interventions', 'ai_model_usage', 'ai_budget_settings'],
      '机器人管理': ['robots', 'robot_commands', 'robot_command_queue', 'robot_permissions', 'intent_configs'],
      '告警系统': ['alert_rules', 'alert_history', 'notification_methods', 'risk_messages', 'info_detection_history'],
      '协同分析': ['satisfaction_analysis', 'staff_activities', 'staff_messages', 'collaboration_decision_logs', 'tasks'],
      'Prompt管理': ['prompt_templates', 'prompt_category_templates', 'prompt_tests'],
      '文档管理': ['documents'],
      '系统配置': ['system_settings', 'system_logs', 'qa_database'],
      'API日志': ['api_call_logs', 'callback_history']
    };

    for (const [moduleName, moduleTables] of Object.entries(modules)) {
      const existingTables = moduleTables.filter(name => dbTables.includes(name));
      const totalTables = moduleTables.length;

      if (totalTables > 0) {
        const percent = Math.round((existingTables.length / totalTables) * 100);
        const icon = percent === 100 ? '✅' : (percent >= 50 ? '⚠️' : '❌');
        console.log(`${icon} ${moduleName}: ${existingTables.length}/${totalTables} (${percent}%)`);
      }
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ 检查完成\n');

    // 返回状态码
    if (missingTables.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ 一致性检查失败！');
    console.error('\n错误详情：');
    console.error(error.message);
    console.error('\n堆栈信息：');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 运行检查
checkDatabaseConsistency();
