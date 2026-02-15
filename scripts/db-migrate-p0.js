#!/usr/bin/env node

/**
 * WorkTool AI P0优先级表迁移脚本
 * 迁移核心功能表到云数据库
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

async function migrateP0Tables() {
  const client = new Client(dbConfig);

  try {
    console.log('🚀 WorkTool AI P0优先级表迁移\n');
    console.log('='.repeat(50));

    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // ============ P0-1: 用户表 ============
    console.log('📦 P0-1: 创建 users 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.users (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(64) NOT NULL UNIQUE,
        email VARCHAR(255) UNIQUE,
        password TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true NOT NULL,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

        -- 扩展字段
        avatar_url VARCHAR(500),
        phone VARCHAR(20),
        full_name VARCHAR(255),

        -- 两步验证字段
        mfa_enabled BOOLEAN DEFAULT false,
        mfa_secret VARCHAR(32),
        mfa_backup_codes JSONB DEFAULT '[]',

        -- 账户锁定字段
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ,

        -- 密码过期字段
        password_changed_at TIMESTAMPTZ,
        password_expires_at TIMESTAMPTZ,

        -- 邮箱验证字段
        email_verified BOOLEAN DEFAULT false,
        email_verified_at TIMESTAMPTZ,
        email_verification_token VARCHAR(255),

        -- 最后活跃字段
        last_activity_at TIMESTAMPTZ,
        last_login_ip VARCHAR(45),

        -- 元数据字段
        metadata JSONB DEFAULT '{}'
      )
    `);

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON app.users(username)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON app.users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON app.users(role)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_is_active ON app.users(is_active)');
    console.log('  ✅ users 表创建成功\n');

    // ============ P0-2: 会话表 ============
    console.log('📦 P0-2: 创建 sessions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255),
        wechat_user_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        context JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON app.sessions(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON app.sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_wechat_user_id ON app.sessions(wechat_user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_status ON app.sessions(status)');
    console.log('  ✅ sessions 表创建成功\n');

    // ============ P0-3: 流程定义表 ============
    console.log('📦 P0-3: 创建 flow_definitions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.flow_definitions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        flow_id VARCHAR(255) UNIQUE NOT NULL,
        flow_name VARCHAR(255) NOT NULL,
        flow_description TEXT,
        flow_type VARCHAR(50) DEFAULT 'workflow',
        definition JSONB NOT NULL,
        version VARCHAR(20) DEFAULT '1.0',
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_by VARCHAR(36),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_definitions_flow_id ON app.flow_definitions(flow_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_definitions_flow_type ON app.flow_definitions(flow_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_definitions_is_active ON app.flow_definitions(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_definitions_created_by ON app.flow_definitions(created_by)');
    console.log('  ✅ flow_definitions 表创建成功\n');

    // ============ P0-4: 流程实例表 ============
    console.log('📦 P0-4: 创建 flow_instances 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.flow_instances (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id VARCHAR(255) UNIQUE NOT NULL,
        flow_id VARCHAR(255) NOT NULL,
        flow_name VARCHAR(255),
        session_id VARCHAR(255),
        user_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'running',
        current_node VARCHAR(255),
        instance_data JSONB DEFAULT '{}',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_instances_instance_id ON app.flow_instances(instance_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_instances_flow_id ON app.flow_instances(flow_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_instances_session_id ON app.flow_instances(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_instances_user_id ON app.flow_instances(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_instances_status ON app.flow_instances(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_instances_started_at ON app.flow_instances(started_at DESC)');
    console.log('  ✅ flow_instances 表创建成功\n');

    // ============ P0-5: 流程执行日志表 ============
    console.log('📦 P0-5: 创建 flow_execution_logs 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.flow_execution_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        log_id VARCHAR(255) UNIQUE NOT NULL,
        instance_id VARCHAR(255) NOT NULL,
        flow_id VARCHAR(255),
        node_id VARCHAR(255),
        node_name VARCHAR(255),
        action VARCHAR(50),
        status VARCHAR(20) DEFAULT 'success',
        input_data JSONB,
        output_data JSONB,
        error_message TEXT,
        execution_time INTEGER,
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_log_id ON app.flow_execution_logs(log_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_instance_id ON app.flow_execution_logs(instance_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_flow_id ON app.flow_execution_logs(flow_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_node_id ON app.flow_execution_logs(node_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_status ON app.flow_execution_logs(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_executed_at ON app.flow_execution_logs(executed_at DESC)');
    console.log('  ✅ flow_execution_logs 表创建成功\n');

    // ============ P0-6: Prompt模板表 ============
    console.log('📦 P0-6: 创建 prompt_templates 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.prompt_templates (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id VARCHAR(255) UNIQUE NOT NULL,
        template_name VARCHAR(255) NOT NULL,
        template_description TEXT,
        category VARCHAR(50),
        template_content TEXT NOT NULL,
        variables JSONB DEFAULT '{}',
        version VARCHAR(20) DEFAULT '1.0',
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_by VARCHAR(36),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_templates_template_id ON app.prompt_templates(template_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON app.prompt_templates(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_active ON app.prompt_templates(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_by ON app.prompt_templates(created_by)');
    console.log('  ✅ prompt_templates 表创建成功\n');

    // ============ P0-7: 系统设置表 ============
    console.log('📦 P0-7: 创建 system_settings 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.system_settings (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) DEFAULT 'string',
        description TEXT,
        category VARCHAR(50),
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_system_settings_setting_key ON app.system_settings(setting_key)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_system_settings_category ON app.system_settings(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON app.system_settings(is_public)');
    console.log('  ✅ system_settings 表创建成功\n');

    // ============ 汇总统计 ============
    console.log('='.repeat(50));
    console.log('📊 P0优先级表迁移完成！\n');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
      ORDER BY table_name
    `);

    const p0Tables = [
      'users',
      'sessions',
      'flow_definitions',
      'flow_instances',
      'flow_execution_logs',
      'prompt_templates',
      'system_settings'
    ];

    const createdP0Tables = tables.rows.filter(row => p0Tables.includes(row.table_name));

    console.log('✅ P0优先级表：');
    p0Tables.forEach(tableName => {
      const exists = tables.rows.some(row => row.table_name === tableName);
      if (exists) {
        console.log(`  ✅ app.${tableName}`);
      } else {
        console.log(`  ❌ app.${tableName} (创建失败)`);
      }
    });

    console.log(`\n总计：${createdP0Tables.length}/${p0Tables.length} 张P0表创建成功\n`);

    console.log('='.repeat(50));
    console.log('🎉 P0优先级表迁移完成！\n');
    console.log('✅ 所有P0核心表已创建成功');
    console.log('✅ 系统核心功能已就绪\n');
    console.log('📝 下一步：');
    console.log('  1. 验证表结构');
    console.log('  2. 测试基本功能');
    console.log('  3. 开始P1优先级表迁移\n');

  } catch (error) {
    console.error('\n❌ P0表迁移失败！');
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
migrateP0Tables();
