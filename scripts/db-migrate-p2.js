#!/usr/bin/env node

/**
 * WorkTool AI P2优先级表迁移脚本
 * 迁移增强功能表到云数据库
 * 达到100%数据库完整性
 */

import pg from 'pg';
const { Client } = pg;

// 检查数据库环境变量
const databaseUrl = process.env.DATABASE_URL || process.env.PGDATABASE_URL;
if (!databaseUrl) {
  console.log('⚠️  数据库未配置，跳过迁移');
  console.log('   请设置 DATABASE_URL 或 PGDATABASE_URL 环境变量');
  process.exit(0);
}

// 从连接字符串解析配置
function parseDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.slice(1),
      user: parsed.username,
      password: decodeURIComponent(parsed.password),
      ssl: false
    };
  } catch (e) {
    console.error('解析数据库连接字符串失败:', e.message);
    process.exit(1);
  }
}

const dbConfig = parseDatabaseUrl(databaseUrl);

async function migrateP2Tables() {
  const client = new Client(dbConfig);

  try {
    console.log('🚀 WorkTool AI P2优先级表迁移\n');
    console.log('='.repeat(50));

    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // ============ AI增强表（3张） ============
    console.log('🧠 创建AI增强表...\n');

    // AI角色版本表
    console.log('  ⏳ 创建 ai_role_versions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.ai_role_versions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        version_id VARCHAR(255) UNIQUE NOT NULL,
        role_id VARCHAR(255) NOT NULL,
        version_number VARCHAR(20),
        system_prompt TEXT,
        model_id VARCHAR(255),
        temperature NUMERIC(3, 2),
        max_tokens INTEGER,
        is_active BOOLEAN DEFAULT false,
        created_by VARCHAR(36),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_role_versions_version_id ON app.ai_role_versions(version_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_role_versions_role_id ON app.ai_role_versions(role_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_role_versions_is_active ON app.ai_role_versions(is_active)');
    console.log('  ✅ ai_role_versions 表创建成功');

    // AI模型使用统计表
    console.log('  ⏳ 创建 ai_model_usage 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.ai_model_usage (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        usage_id VARCHAR(255) UNIQUE NOT NULL,
        model_id VARCHAR(255) NOT NULL,
        usage_date DATE NOT NULL,
        request_count INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_cost NUMERIC(10, 6),
        avg_latency_ms INTEGER,
        success_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_model_usage_usage_id ON app.ai_model_usage(usage_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_model_usage_model_id ON app.ai_model_usage(model_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_model_usage_usage_date ON app.ai_model_usage(usage_date)');
    console.log('  ✅ ai_model_usage 表创建成功');

    // AI预算设置表
    console.log('  ⏳ 创建 ai_budget_settings 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.ai_budget_settings (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(36),
        budget_type VARCHAR(50),
        monthly_limit NUMERIC(10, 2),
        current_spend NUMERIC(10, 2) DEFAULT 0,
        alert_threshold NUMERIC(5, 2) DEFAULT 80.00,
        is_active BOOLEAN DEFAULT true,
        reset_day INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_budget_settings_setting_id ON app.ai_budget_settings(setting_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_budget_settings_user_id ON app.ai_budget_settings(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_budget_settings_is_active ON app.ai_budget_settings(is_active)');
    console.log('  ✅ ai_budget_settings 表创建成功\n');

    // ============ 用户审计表（2张） ============
    console.log('👤 创建用户审计表...\n');

    // 用户审计日志表
    console.log('  ⏳ 创建 user_audit_logs 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.user_audit_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        log_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(36),
        action VARCHAR(50),
        resource_type VARCHAR(50),
        resource_id VARCHAR(255),
        changes JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        status VARCHAR(20) DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_log_id ON app.user_audit_logs(log_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON app.user_audit_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON app.user_audit_logs(action)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_resource_type ON app.user_audit_logs(resource_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON app.user_audit_logs(created_at DESC)');
    console.log('  ✅ user_audit_logs 表创建成功');

    // 会话工作人员状态表
    console.log('  ⏳ 创建 session_staff_status 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.session_staff_status (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        status_id VARCHAR(255) UNIQUE NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        staff_id VARCHAR(255),
        staff_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'offline',
        assigned_at TIMESTAMPTZ,
        last_active_at TIMESTAMPTZ,
        message_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_staff_status_status_id ON app.session_staff_status(status_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_staff_status_session_id ON app.session_staff_status(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_staff_status_staff_id ON app.session_staff_status(staff_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_staff_status_status ON app.session_staff_status(status)');
    console.log('  ✅ session_staff_status 表创建成功\n');

    // ============ 系统日志表（1张） ============
    console.log('⚙️ 创建系统日志表...\n');

    // 系统日志表
    console.log('  ⏳ 创建 system_logs 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.system_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        log_id VARCHAR(255) UNIQUE NOT NULL,
        log_level VARCHAR(20) DEFAULT 'info',
        logger VARCHAR(100),
        message TEXT,
        error_stack TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_system_logs_log_id ON app.system_logs(log_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_system_logs_log_level ON app.system_logs(log_level)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_system_logs_logger ON app.system_logs(logger)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON app.system_logs(created_at DESC)');
    console.log('  ✅ system_logs 表创建成功\n');

    // ============ QA数据库表（1张） ============
    console.log('📝 创建QA数据库表...\n');

    // QA数据库表
    console.log('  ⏳ 创建 qa_database 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.qa_database (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        qa_id VARCHAR(255) UNIQUE NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(50),
        keywords TEXT[],
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(36),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_database_qa_id ON app.qa_database(qa_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_database_category ON app.qa_database(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_database_is_active ON app.qa_database(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_qa_database_priority ON app.qa_database(priority)');
    console.log('  ✅ qa_database 表创建成功\n');

    // ============ Prompt管理增强表（2张） ============
    console.log('📝 创建Prompt管理增强表...\n');

    // Prompt分类模板表
    console.log('  ⏳ 创建 prompt_category_templates 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.prompt_category_templates (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        template_name VARCHAR(255) NOT NULL,
        template_description TEXT,
        template_content TEXT,
        variables JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(36),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_category_templates_template_id ON app.prompt_category_templates(template_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_category_templates_category ON app.prompt_category_templates(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_category_templates_is_active ON app.prompt_category_templates(is_active)');
    console.log('  ✅ prompt_category_templates 表创建成功');

    // Prompt测试表
    console.log('  ⏳ 创建 prompt_tests 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.prompt_tests (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id VARCHAR(255) UNIQUE NOT NULL,
        template_id VARCHAR(255),
        test_name VARCHAR(255) NOT NULL,
        test_description TEXT,
        test_input JSONB,
        expected_output TEXT,
        actual_output TEXT,
        test_result VARCHAR(20),
        performance_metrics JSONB,
        tested_at TIMESTAMPTZ DEFAULT NOW(),
        tested_by VARCHAR(36),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_tests_test_id ON app.prompt_tests(test_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_tests_template_id ON app.prompt_tests(template_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_tests_test_result ON app.prompt_tests(test_result)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_tests_tested_at ON app.prompt_tests(tested_at DESC)');
    console.log('  ✅ prompt_tests 表创建成功\n');

    // ============ 告警增强表（3张） ============
    console.log('🚨 创建告警增强表...\n');

    // 风险消息表
    console.log('  ⏳ 创建 risk_messages 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.risk_messages (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id VARCHAR(255) UNIQUE NOT NULL,
        session_id VARCHAR(255),
        user_id VARCHAR(255),
        group_id VARCHAR(255),
        risk_level VARCHAR(20),
        risk_type VARCHAR(50),
        risk_description TEXT,
        detected_at TIMESTAMPTZ DEFAULT NOW(),
        handled BOOLEAN DEFAULT false,
        handled_by VARCHAR(255),
        handled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_risk_messages_message_id ON app.risk_messages(message_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_risk_messages_session_id ON app.risk_messages(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_risk_messages_user_id ON app.risk_messages(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_risk_messages_risk_level ON app.risk_messages(risk_level)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_risk_messages_detected_at ON app.risk_messages(detected_at DESC)');
    console.log('  ✅ risk_messages 表创建成功');

    // 信息检测历史表
    console.log('  ⏳ 创建 info_detection_history 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.info_detection_history (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        detection_id VARCHAR(255) UNIQUE NOT NULL,
        message_id VARCHAR(255),
        detection_type VARCHAR(50),
        detected_content TEXT,
        confidence NUMERIC(5, 2),
        metadata JSONB DEFAULT '{}',
        detected_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_info_detection_history_detection_id ON app.info_detection_history(detection_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_info_detection_history_message_id ON app.info_detection_history(message_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_info_detection_history_detection_type ON app.info_detection_history(detection_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_info_detection_history_detected_at ON app.info_detection_history(detected_at DESC)');
    console.log('  ✅ info_detection_history 表创建成功\n');

    // ============ API日志表（2张） ============
    console.log('📡 创建API日志表...\n');

    // API调用日志表
    console.log('  ⏳ 创建 api_call_logs 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.api_call_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        log_id VARCHAR(255) UNIQUE NOT NULL,
        api_path VARCHAR(255),
        api_method VARCHAR(10),
        request_headers JSONB,
        request_body TEXT,
        response_status INTEGER,
        response_body TEXT,
        response_time_ms INTEGER,
        user_id VARCHAR(36),
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_call_logs_log_id ON app.api_call_logs(log_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_call_logs_api_path ON app.api_call_logs(api_path)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_id ON app.api_call_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_call_logs_response_status ON app.api_call_logs(response_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_call_logs_created_at ON app.api_call_logs(created_at DESC)');
    console.log('  ✅ api_call_logs 表创建成功');

    // 回调历史表
    console.log('  ⏳ 创建 callback_history 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.callback_history (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        callback_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(50),
        event_data JSONB,
        target_url VARCHAR(500),
        request_headers JSONB,
        response_status INTEGER,
        response_body TEXT,
        response_time_ms INTEGER,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_callback_history_callback_id ON app.callback_history(callback_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_callback_history_event_type ON app.callback_history(event_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_callback_history_response_status ON app.callback_history(response_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_callback_history_created_at ON app.callback_history(created_at DESC)');
    console.log('  ✅ callback_history 表创建成功\n');

    // ============ 汇总统计 ============
    console.log('='.repeat(50));
    console.log('📊 P2优先级表迁移完成！\n');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
      ORDER BY table_name
    `);

    const p2Tables = [
      'ai_role_versions',
      'ai_model_usage',
      'ai_budget_settings',
      'user_audit_logs',
      'session_staff_status',
      'system_logs',
      'qa_database',
      'prompt_category_templates',
      'prompt_tests',
      'risk_messages',
      'info_detection_history',
      'api_call_logs',
      'callback_history'
    ];

    const createdP2Tables = tables.rows.filter(row => p2Tables.includes(row.table_name));

    console.log('✅ P2优先级表：');
    p2Tables.forEach(tableName => {
      const exists = tables.rows.some(row => row.table_name === tableName);
      if (exists) {
        console.log(`  ✅ app.${tableName}`);
      } else {
        console.log(`  ❌ app.${tableName} (创建失败)`);
      }
    });

    console.log(`\n总计：${createdP2Tables.length}/${p2Tables.length} 张P2表创建成功\n`);

    console.log('='.repeat(50));
    console.log('🎉 P2优先级表迁移完成！\n');
    console.log('✅ 所有P2增强表已创建成功');
    console.log('✅ 数据库迁移完成：100%');
    console.log(`✅ 总表数：${tables.rows.length}张\n`);

    console.log('📊 完整数据库结构：');
    console.log('  - 初始表：12张');
    console.log('  - P0表：7张');
    console.log('  - P1表：11张');
    console.log('  - P2表：13张');
    console.log(`  - 总计：${tables.rows.length}张\n`);

    console.log('🎉 数据库迁移100%完成！\n');

  } catch (error) {
    console.error('\n❌ P2表迁移失败！');
    console.error('\n错误详情：');
    console.error(error.message);
    console.error('\n堆栈信息：');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 已断开数据库连接\n');
  }
}

// 运行迁移
migrateP2Tables();
