#!/usr/bin/env node

/**
 * WorkTool AI P1优先级表迁移脚本
 * 迁移重要功能表到云数据库
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

async function migrateP1Tables() {
  const client = new Client(dbConfig);

  try {
    console.log('🚀 WorkTool AI P1优先级表迁移\n');
    console.log('='.repeat(50));

    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // ============ AI相关表（4张） ============
    console.log('🤖 创建AI相关表...\n');

    // AI模型表
    console.log('  ⏳ 创建 ai_models 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.ai_models (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        model_id VARCHAR(255) UNIQUE NOT NULL,
        model_name VARCHAR(255) NOT NULL,
        model_type VARCHAR(50),
        provider_id VARCHAR(255),
        api_endpoint VARCHAR(500),
        api_key VARCHAR(500),
        model_config JSONB DEFAULT '{}',
        max_tokens INTEGER,
        temperature NUMERIC(3, 2),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_models_model_id ON app.ai_models(model_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_models_provider_id ON app.ai_models(provider_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_models_is_active ON app.ai_models(is_active)');
    console.log('  ✅ ai_models 表创建成功');

    // AI服务商表
    console.log('  ⏳ 创建 ai_providers 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.ai_providers (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id VARCHAR(255) UNIQUE NOT NULL,
        provider_name VARCHAR(255) NOT NULL,
        provider_type VARCHAR(50),
        api_endpoint VARCHAR(500),
        api_key VARCHAR(500),
        rate_limit INTEGER,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_providers_provider_id ON app.ai_providers(provider_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON app.ai_providers(is_active)');
    console.log('  ✅ ai_providers 表创建成功');

    // AI角色表
    console.log('  ⏳ 创建 ai_roles 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.ai_roles (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id VARCHAR(255) UNIQUE NOT NULL,
        role_name VARCHAR(255) NOT NULL,
        role_description TEXT,
        role_type VARCHAR(50),
        system_prompt TEXT,
        model_id VARCHAR(255),
        temperature NUMERIC(3, 2),
        max_tokens INTEGER,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_by VARCHAR(36),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_roles_role_id ON app.ai_roles(role_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_roles_model_id ON app.ai_roles(model_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_roles_is_active ON app.ai_roles(is_active)');
    console.log('  ✅ ai_roles 表创建成功');

    // AI交互日志表
    console.log('  ⏳ 创建 ai_io_logs 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.ai_io_logs (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        session_id VARCHAR(255),
        message_id VARCHAR(255),
        robot_id VARCHAR(255),
        role VARCHAR(50),
        model_id VARCHAR(255),
        prompt TEXT,
        response TEXT,
        tokens_used INTEGER,
        cost NUMERIC(10, 6),
        latency_ms INTEGER,
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_io_logs_session_id ON app.ai_io_logs(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_io_logs_message_id ON app.ai_io_logs(message_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_io_logs_robot_id ON app.ai_io_logs(robot_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_io_logs_model_id ON app.ai_io_logs(model_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_io_logs_created_at ON app.ai_io_logs(created_at DESC)');
    console.log('  ✅ ai_io_logs 表创建成功\n');

    // ============ 机器人管理表（3张） ============
    console.log('🤖 创建机器人管理表...\n');

    // 机器人命令表
    console.log('  ⏳ 创建 robot_commands 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.robot_commands (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        command_id VARCHAR(255) UNIQUE NOT NULL,
        robot_id VARCHAR(255) NOT NULL,
        command_type VARCHAR(50),
        command_data JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        result JSONB,
        error_message TEXT,
        executed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_commands_command_id ON app.robot_commands(command_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_commands_robot_id ON app.robot_commands(robot_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_commands_status ON app.robot_commands(status)');
    console.log('  ✅ robot_commands 表创建成功');

    // 机器人命令队列表
    console.log('  ⏳ 创建 robot_command_queue 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.robot_command_queue (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        queue_id VARCHAR(255) UNIQUE NOT NULL,
        robot_id VARCHAR(255) NOT NULL,
        command_type VARCHAR(50),
        command_data JSONB,
        priority INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        scheduled_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_command_queue_queue_id ON app.robot_command_queue(queue_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_command_queue_robot_id ON app.robot_command_queue(robot_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_command_queue_status ON app.robot_command_queue(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_command_queue_priority ON app.robot_command_queue(priority)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_command_queue_scheduled_at ON app.robot_command_queue(scheduled_at)');
    console.log('  ✅ robot_command_queue 表创建成功');

    // 机器人权限表
    console.log('  ⏳ 创建 robot_permissions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.robot_permissions (
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
        assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_permissions_user_id ON app.robot_permissions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_permissions_robot_id ON app.robot_permissions(robot_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_permissions_permission_type ON app.robot_permissions(permission_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_permissions_is_active ON app.robot_permissions(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robot_permissions_user_robot ON app.robot_permissions(user_id, robot_id)');
    console.log('  ✅ robot_permissions 表创建成功\n');

    // ============ 协同分析表（2张） ============
    console.log('📊 创建协同分析表...\n');

    // 工作人员消息表
    console.log('  ⏳ 创建 staff_messages 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.staff_messages (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id VARCHAR(255) UNIQUE NOT NULL,
        staff_id VARCHAR(255),
        session_id VARCHAR(255),
        content TEXT,
        message_type VARCHAR(20),
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_messages_message_id ON app.staff_messages(message_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_messages_staff_id ON app.staff_messages(staff_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_messages_session_id ON app.staff_messages(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_messages_timestamp ON app.staff_messages(timestamp DESC)');
    console.log('  ✅ staff_messages 表创建成功');

    // 协同决策日志表
    console.log('  ⏳ 创建 collaboration_decision_logs 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.collaboration_decision_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        log_id VARCHAR(255) UNIQUE NOT NULL,
        task_id VARCHAR(255),
        decision_type VARCHAR(50),
        decision_content TEXT,
        decision_by VARCHAR(255),
        decision_by_name VARCHAR(255),
        decision_at TIMESTAMPTZ DEFAULT NOW(),
        related_data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_collaboration_decision_logs_log_id ON app.collaboration_decision_logs(log_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_collaboration_decision_logs_task_id ON app.collaboration_decision_logs(task_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_collaboration_decision_logs_decision_by ON app.collaboration_decision_logs(decision_by)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_collaboration_decision_logs_decision_at ON app.collaboration_decision_logs(decision_at DESC)');
    console.log('  ✅ collaboration_decision_logs 表创建成功\n');

    // ============ 文档管理表（1张） ============
    console.log('📝 创建文档管理表...\n');

    // 文档表
    console.log('  ⏳ 创建 documents 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.documents (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id VARCHAR(255) UNIQUE NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(50),
        document_url VARCHAR(500),
        document_size INTEGER,
        category VARCHAR(50),
        tags JSONB DEFAULT '[]',
        description TEXT,
        uploaded_by VARCHAR(36),
        uploaded_by_name VARCHAR(255),
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_document_id ON app.documents(document_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_category ON app.documents(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON app.documents(uploaded_by)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_is_public ON app.documents(is_public)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_created_at ON app.documents(created_at DESC)');
    console.log('  ✅ documents 表创建成功\n');

    // ============ 用户登录表（1张） ============
    console.log('👤 创建用户登录表...\n');

    // 用户登录会话表
    console.log('  ⏳ 创建 user_login_sessions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.user_login_sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        login_ip VARCHAR(45),
        user_agent VARCHAR(500),
        device_info JSONB,
        location VARCHAR(255),
        is_active BOOLEAN DEFAULT true NOT NULL,
        last_activity_at TIMESTAMPTZ DEFAULT NOW(),
        logged_in_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        logged_out_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_login_sessions_session_id ON app.user_login_sessions(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_login_sessions_user_id ON app.user_login_sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_login_sessions_is_active ON app.user_login_sessions(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_login_sessions_last_activity_at ON app.user_login_sessions(last_activity_at DESC)');
    console.log('  ✅ user_login_sessions 表创建成功\n');

    // ============ 汇总统计 ============
    console.log('='.repeat(50));
    console.log('📊 P1优先级表迁移完成！\n');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
      ORDER BY table_name
    `);

    const p1Tables = [
      'ai_models',
      'ai_providers',
      'ai_roles',
      'ai_io_logs',
      'robot_commands',
      'robot_command_queue',
      'robot_permissions',
      'staff_messages',
      'collaboration_decision_logs',
      'documents',
      'user_login_sessions'
    ];

    const createdP1Tables = tables.rows.filter(row => p1Tables.includes(row.table_name));

    console.log('✅ P1优先级表：');
    p1Tables.forEach(tableName => {
      const exists = tables.rows.some(row => row.table_name === tableName);
      if (exists) {
        console.log(`  ✅ app.${tableName}`);
      } else {
        console.log(`  ❌ app.${tableName} (创建失败)`);
      }
    });

    console.log(`\n总计：${createdP1Tables.length}/${p1Tables.length} 张P1表创建成功\n`);

    console.log('='.repeat(50));
    console.log('🎉 P1优先级表迁移完成！\n');
    console.log('✅ 所有P1重要表已创建成功');
    console.log('✅ AI功能已就绪');
    console.log('✅ 机器人管理功能已就绪');
    console.log('✅ 协同分析功能已就绪\n');
    console.log('📝 下一步：');
    console.log('  1. 验证表结构');
    console.log('  2. 测试AI功能');
    console.log('  3. 测试机器人功能');
    console.log('  4. 开始P2优先级表迁移\n');

  } catch (error) {
    console.error('\n❌ P1表迁移失败！');
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
migrateP1Tables();
