#!/usr/bin/env node

/**
 * WorkTool AI 数据库完整初始化脚本
 * 根据优化方案创建所有需要的表
 */

import pg from 'pg';
const { Client } = pg;

// 检查数据库环境变量
const databaseUrl = process.env.DATABASE_URL || process.env.PGDATABASE_URL;
if (!databaseUrl) {
  console.log('⚠️  数据库未配置，跳过数据库初始化');
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

// 数据库配置
const dbConfig = parseDatabaseUrl(databaseUrl);

async function initDatabase() {
  const client = new Client(dbConfig);

  try {
    console.log('🚀 WorkTool AI 数据库初始化\n');
    console.log('='.repeat(50));

    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // ============ Schema 创建 ============
    console.log('📦 创建 Schema...');
    await client.query('CREATE SCHEMA IF NOT EXISTS app');
    console.log('  ✅ Schema "app" 创建成功\n');

    // ============ 会话管理层 ============
    console.log('🗂️  创建会话管理表...');

    // 1. 用户会话表（新增）
    console.log('  ⏳ 创建 user_sessions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.user_sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        enterprise_name VARCHAR(255),
        satisfaction_score INTEGER DEFAULT 50 CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
        problem_resolution_rate NUMERIC(5, 2) DEFAULT 0 CHECK (problem_resolution_rate >= 0 AND problem_resolution_rate <= 100),
        message_count INTEGER DEFAULT 0 CHECK (message_count >= 0),
        last_message_time TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'idle', 'inactive', 'archived')),
        joined_at TIMESTAMPTZ,
        context JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ user_sessions 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON app.user_sessions(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON app.user_sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON app.user_sessions(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_satisfaction_score ON app.user_sessions(satisfaction_score)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_last_message_time ON app.user_sessions(last_message_time DESC)');

    // 2. 社群会话表（新增）
    console.log('  ⏳ 创建 group_sessions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.group_sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        group_id VARCHAR(255),
        group_name VARCHAR(255),
        member_count INTEGER DEFAULT 0 CHECK (member_count >= 0),
        message_count INTEGER DEFAULT 0 CHECK (message_count >= 0),
        last_message_time TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'idle', 'inactive', 'archived')),
        context JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ group_sessions 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_group_sessions_session_id ON app.group_sessions(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_group_sessions_group_id ON app.group_sessions(group_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_group_sessions_status ON app.group_sessions(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_group_sessions_last_message_time ON app.group_sessions(last_message_time DESC)');

    // 3. 会话消息明细表
    console.log('  ⏳ 创建 session_messages 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.session_messages (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id VARCHAR(255) UNIQUE NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        group_id VARCHAR(255),
        message_type VARCHAR(20) DEFAULT 'text',
        content TEXT,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'assistant', 'system', 'robot')),
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        ai_analysis JSONB DEFAULT '{}',
        satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ session_messages 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_messages_message_id ON app.session_messages(message_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON app.session_messages(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_messages_user_id ON app.session_messages(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_messages_group_id ON app.session_messages(group_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_messages_timestamp ON app.session_messages(timestamp DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_messages_role ON app.session_messages(role)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_messages_satisfaction_score ON app.session_messages(satisfaction_score)');

    console.log('  ✅ 会话管理表创建完成\n');

    // ============ 机器人管理 ============
    console.log('🤖 创建机器人管理表...');

    // 4. 机器人表
    console.log('  ⏳ 创建 robots 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.robots (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        robot_id VARCHAR(255) UNIQUE NOT NULL,
        robot_name VARCHAR(255) NOT NULL,
        robot_type VARCHAR(50) DEFAULT 'chatbot',
        description TEXT,
        config JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ robots 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_robots_robot_id ON app.robots(robot_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_robots_status ON app.robots(status)');

    // 5. 意图配置表
    console.log('  ⏳ 创建 intent_configs 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.intent_configs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_id VARCHAR(255) UNIQUE NOT NULL,
        intent_name VARCHAR(255) NOT NULL,
        description TEXT,
        keywords TEXT[],
        priority INTEGER DEFAULT 0,
        response_template TEXT,
        alert_required BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ intent_configs 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_intent_configs_intent_id ON app.intent_configs(intent_id)');

    console.log('  ✅ 机器人管理表创建完成\n');

    // ============ 告警系统 ============
    console.log('🚨 创建告警系统表...');

    // 6. 告警规则表
    console.log('  ⏳ 创建 alert_rules 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.alert_rules (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id VARCHAR(255) UNIQUE NOT NULL,
        rule_name VARCHAR(255) NOT NULL,
        description TEXT,
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ alert_rules 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_rules_rule_id ON app.alert_rules(rule_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_rules_status ON app.alert_rules(status)');

    // 7. 告警历史表
    console.log('  ⏳ 创建 alert_history 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.alert_history (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_id VARCHAR(255) UNIQUE NOT NULL,
        rule_id VARCHAR(255),
        session_id VARCHAR(255),
        user_id VARCHAR(255),
        group_id VARCHAR(255),
        alert_level VARCHAR(20) DEFAULT 'info',
        alert_message TEXT,
        status VARCHAR(20) DEFAULT 'open',
        triggered_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ alert_history 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON app.alert_history(alert_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_history_rule_id ON app.alert_history(rule_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_history_session_id ON app.alert_history(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON app.alert_history(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_history_group_id ON app.alert_history(group_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_history_status ON app.alert_history(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON app.alert_history(triggered_at DESC)');

    // 8. 通知方式表
    console.log('  ⏳ 创建 notification_methods 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.notification_methods (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        method_id VARCHAR(255) UNIQUE NOT NULL,
        method_name VARCHAR(255) NOT NULL,
        method_type VARCHAR(50) NOT NULL,
        config JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ notification_methods 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_notification_methods_method_id ON app.notification_methods(method_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notification_methods_status ON app.notification_methods(status)');

    console.log('  ✅ 告警系统表创建完成\n');

    // ============ 协同分析 ============
    console.log('📊 创建协同分析表...');

    // 9. 满意度分析表（新增）
    console.log('  ⏳ 创建 satisfaction_analysis 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.satisfaction_analysis (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id VARCHAR(100) UNIQUE NOT NULL,
        user_id VARCHAR(255),
        satisfaction_score INTEGER NOT NULL CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
        sentiment VARCHAR(20),
        problem_resolution_count INTEGER DEFAULT 0,
        problem_in_progress_count INTEGER DEFAULT 0,
        problem_unresolved_count INTEGER DEFAULT 0,
        problem_resolution_rate NUMERIC(5, 2) DEFAULT 0,
        complaint_count INTEGER DEFAULT 0,
        dissatisfaction_count INTEGER DEFAULT 0,
        analyzed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ satisfaction_analysis 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_satisfaction_analysis_analysis_id ON app.satisfaction_analysis(analysis_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_satisfaction_analysis_user_id ON app.satisfaction_analysis(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_satisfaction_analysis_satisfaction_score ON app.satisfaction_analysis(satisfaction_score)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_satisfaction_analysis_analyzed_at ON app.satisfaction_analysis(analyzed_at DESC)');

    // 10. 工作人员活跃度表（新增）
    console.log('  ⏳ 创建 staff_activities 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.staff_activities (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        staff_id VARCHAR(255) UNIQUE NOT NULL,
        staff_name VARCHAR(255),
        staff_role VARCHAR(50),
        status VARCHAR(20) DEFAULT 'offline',
        message_count_per_hour INTEGER DEFAULT 0,
        message_count_per_day INTEGER DEFAULT 0,
        message_count_per_week INTEGER DEFAULT 0,
        average_response_time INTEGER,
        max_response_time INTEGER,
        min_response_time INTEGER,
        last_active_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ staff_activities 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_activities_staff_id ON app.staff_activities(staff_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_activities_status ON app.staff_activities(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_activities_role ON app.staff_activities(staff_role)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_activities_last_active_time ON app.staff_activities(last_active_time DESC)');

    // 11. 任务管理表（新增）
    console.log('  ⏳ 创建 tasks 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.tasks (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id VARCHAR(255) UNIQUE NOT NULL,
        alert_id VARCHAR(255),
        task_title VARCHAR(255) NOT NULL,
        task_description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        assigned_staff VARCHAR(255),
        created_by VARCHAR(255),
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        tencent_doc_id VARCHAR(255),
        tencent_doc_url VARCHAR(500),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ tasks 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON app.tasks(task_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_alert_id ON app.tasks(alert_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON app.tasks(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_staff ON app.tasks(assigned_staff)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON app.tasks(due_date)');

    console.log('  ✅ 协同分析表创建完成\n');

    // ============ AI分析 ============
    console.log('🧠 创建AI分析表...');

    // 12. AI介入记录表（新增）
    console.log('  ⏳ 创建 ai_interventions 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.ai_interventions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        intervention_id VARCHAR(100) UNIQUE NOT NULL,
        message_id VARCHAR(255),
        user_id VARCHAR(255),
        group_id VARCHAR(255),
        scenario VARCHAR(50),
        description TEXT,
        ai_response JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    console.log('  ✅ ai_interventions 表创建成功');

    // 索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_interventions_intervention_id ON app.ai_interventions(intervention_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_interventions_message_id ON app.ai_interventions(message_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_interventions_user_id ON app.ai_interventions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_interventions_scenario ON app.ai_interventions(scenario)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_interventions_created_at ON app.ai_interventions(created_at DESC)');

    console.log('  ✅ AI分析表创建完成\n');

    // ============ 汇总统计 ============
    console.log('='.repeat(50));
    console.log('📊 数据库表汇总：\n');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
      ORDER BY table_name
    `);

    const categories = {
      '会话管理': ['user_sessions', 'group_sessions', 'session_messages'],
      '机器人管理': ['robots', 'intent_configs'],
      '告警系统': ['alert_rules', 'alert_history', 'notification_methods'],
      '协同分析': ['satisfaction_analysis', 'staff_activities', 'tasks'],
      'AI分析': ['ai_interventions']
    };

    let totalTables = 0;
    for (const [category, tableList] of Object.entries(categories)) {
      const categoryTables = tables.rows.filter(row => tableList.includes(row.table_name));
      if (categoryTables.length > 0) {
        console.log(`  ${category}：`);
        categoryTables.forEach(row => {
          console.log(`    ✅ ${row.table_name}`);
          totalTables++;
        });
      }
    }

    console.log(`\n总计：${totalTables} 张表\n`);
    console.log('='.repeat(50));
    console.log('🎉 数据库初始化完成！\n');
    console.log('✅ 所有表和索引已创建成功');
    console.log('✅ 数据库已准备就绪，可以开始开发\n');

  } catch (error) {
    console.error('\n❌ 数据库初始化失败！');
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

// 运行初始化
initDatabase();
