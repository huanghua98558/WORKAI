/**
 * 告警系统数据库迁移脚本
 * 创建所有告警相关的表和索引
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'worktool_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runMigration() {
  const pool = new Pool(dbConfig);

  try {
    await pool.connect();
    log('✅ 数据库连接成功', colors.green);
    log('🚀 开始执行告警系统迁移...\n', colors.cyan);

    // ============================================
    // 1. 意图配置表
    // ============================================
    log('创建 intent_configs 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intent_configs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_type VARCHAR(50) NOT NULL UNIQUE,
        intent_name VARCHAR(100) NOT NULL,
        intent_description TEXT,
        system_prompt TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ intent_configs 表创建成功', colors.green);

    // ============================================
    // 2. 告警分组表
    // ============================================
    log('创建 alert_groups 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_groups (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        group_name VARCHAR(255) NOT NULL UNIQUE,
        group_code VARCHAR(50) NOT NULL UNIQUE,
        group_color VARCHAR(7),
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ alert_groups 表创建成功', colors.green);

    // 插入默认分组
    log('  插入默认告警分组...', colors.cyan);
    await pool.query(`
      INSERT INTO alert_groups (group_name, group_code, group_color, description, sort_order)
      VALUES
        ('客户群', 'customer_group', '#3b82f6', '客户相关群组', 1),
        ('内部群', 'internal_group', '#10b981', '公司内部群组', 2),
        ('供应商群', 'supplier_group', '#f59e0b', '供应商相关群组', 3),
        ('合作伙伴群', 'partner_group', '#8b5cf6', '合作伙伴相关群组', 4)
      ON CONFLICT (group_name) DO NOTHING
    `);
    log('  ✅ 默认分组插入完成', colors.green);

    // ============================================
    // 3. 告警规则表
    // ============================================
    log('创建 alert_rules 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_type VARCHAR(50) NOT NULL,
        rule_name VARCHAR(255) NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        alert_level VARCHAR(20) NOT NULL,
        threshold INTEGER DEFAULT 1,
        cooldown_period INTEGER DEFAULT 300,
        message_template TEXT,
        keywords TEXT,
        group_id VARCHAR(36),
        enable_escalation BOOLEAN DEFAULT false,
        escalation_level INTEGER DEFAULT 0,
        escalation_threshold INTEGER DEFAULT 3,
        escalation_interval INTEGER DEFAULT 1800,
        escalation_config JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ alert_rules 表创建成功', colors.green);

    // ============================================
    // 4. 通知方式配置表
    // ============================================
    log('创建 notification_methods 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_methods (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_rule_id VARCHAR(36) NOT NULL,
        method_type VARCHAR(50) NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        recipient_config JSONB,
        message_template TEXT,
        priority INTEGER NOT NULL DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ notification_methods 表创建成功', colors.green);

    // ============================================
    // 5. 告警历史表
    // ============================================
    log('创建 alert_history 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255),
        alert_rule_id VARCHAR(36) NOT NULL,
        intent_type VARCHAR(50) NOT NULL,
        alert_level VARCHAR(20) NOT NULL,
        group_id VARCHAR(255),
        group_name VARCHAR(255),
        alert_group_id VARCHAR(36),
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        group_chat_id VARCHAR(255),
        message_content TEXT,
        alert_message TEXT NOT NULL,
        notification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        notification_result JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        is_handled BOOLEAN NOT NULL DEFAULT false,
        handled_by VARCHAR(36),
        handled_at TIMESTAMP WITH TIME ZONE,
        handled_note TEXT,
        escalation_level INTEGER DEFAULT 0,
        escalation_count INTEGER DEFAULT 0,
        escalation_history JSONB DEFAULT '[]',
        parent_alert_id VARCHAR(36),
        batch_id VARCHAR(36),
        batch_size INTEGER DEFAULT 1,
        robot_id VARCHAR(64),
        assignee VARCHAR(36),
        confidence INTEGER,
        need_reply BOOLEAN,
        need_human BOOLEAN,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ alert_history 表创建成功', colors.green);

    // ============================================
    // 6. 告警去重记录表
    // ============================================
    log('创建 alert_dedup_records 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_dedup_records (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_hash VARCHAR(64) NOT NULL UNIQUE,
        alert_level VARCHAR(20) NOT NULL,
        intent_type VARCHAR(50),
        user_id VARCHAR(255),
        group_chat_id VARCHAR(255),
        first_alert_id VARCHAR(36),
        last_alert_id VARCHAR(36),
        count INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ alert_dedup_records 表创建成功', colors.green);

    // ============================================
    // 7. 告警升级表
    // ============================================
    log('创建 alert_upgrades 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_upgrades (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        original_alert_id VARCHAR(36) NOT NULL,
        escalation_level INTEGER NOT NULL,
        escalated_alert_id VARCHAR(36) NOT NULL,
        escalation_rule_id VARCHAR(36),
        escalation_reason TEXT,
        escalated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ alert_upgrades 表创建成功', colors.green);

    // ============================================
    // 8. 告警通知表
    // ============================================
    log('创建 alert_notifications 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_notifications (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_id VARCHAR(36) NOT NULL,
        notification_method_id VARCHAR(36),
        method_type VARCHAR(50) NOT NULL,
        recipient_config JSONB,
        message TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ alert_notifications 表创建成功', colors.green);

    // ============================================
    // 9. 告警接收人表
    // ============================================
    log('创建 alert_recipients 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_recipients (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_id VARCHAR(36) NOT NULL,
        recipient_type VARCHAR(50) NOT NULL,
        recipient_id VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        notification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ alert_recipients 表创建成功', colors.green);

    // ============================================
    // 10. 告警批量操作表
    // ============================================
    log('创建 alert_batch_operations 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_batch_operations (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        operation_type VARCHAR(50) NOT NULL,
        batch_id VARCHAR(36) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_by VARCHAR(36),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    log('✅ alert_batch_operations 表创建成功', colors.green);

    // ============================================
    // 11. 告警统计快照表
    // ============================================
    log('创建 alert_stats_snapshots 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_stats_snapshots (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_date DATE NOT NULL UNIQUE,
        total_count INTEGER DEFAULT 0,
        pending_count INTEGER DEFAULT 0,
        handled_count INTEGER DEFAULT 0,
        ignored_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        critical_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        info_count INTEGER DEFAULT 0,
        escalated_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    log('✅ alert_stats_snapshots 表创建成功', colors.green);

    // ============================================
    // 创建索引
    // ============================================
    log('\n创建索引...', colors.yellow);

    // intent_configs 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_intent_configs_intent_type ON intent_configs(intent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_intent_configs_is_enabled ON intent_configs(is_enabled)`);

    // alert_groups 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_groups_group_code ON alert_groups(group_code)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_groups_is_active ON alert_groups(is_active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_groups_sort_order ON alert_groups(sort_order)`);

    // alert_rules 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_rules_intent_type ON alert_rules(intent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_rules_alert_level ON alert_rules(alert_level)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_rules_is_enabled ON alert_rules(is_enabled)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_rules_group_id ON alert_rules(group_id)`);

    // notification_methods 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_methods_alert_rule_id ON notification_methods(alert_rule_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_methods_method_type ON notification_methods(method_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_methods_is_enabled ON notification_methods(is_enabled)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_methods_priority ON notification_methods(priority)`);

    // alert_history 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_session_id ON alert_history(session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_alert_rule_id ON alert_history(alert_rule_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_intent_type ON alert_history(intent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_alert_level ON alert_history(alert_level)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_notification_status ON alert_history(notification_status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON alert_history(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_alert_group_id ON alert_history(alert_group_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_batch_id ON alert_history(batch_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_parent_alert_id ON alert_history(parent_alert_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_escalation_level ON alert_history(escalation_level)`);

    // alert_dedup_records 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_dedup_hash ON alert_dedup_records(alert_hash)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_dedup_intent_type ON alert_dedup_records(intent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_dedup_user_id ON alert_dedup_records(user_id)`);

    // alert_upgrades 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_upgrades_original_alert_id ON alert_upgrades(original_alert_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_upgrades_escalated_alert_id ON alert_upgrades(escalated_alert_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_upgrades_escalation_level ON alert_upgrades(escalation_level)`);

    // alert_notifications 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON alert_notifications(alert_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_notifications_method_type ON alert_notifications(method_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_notifications_created_at ON alert_notifications(created_at)`);

    // alert_recipients 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_recipients_alert_id ON alert_recipients(alert_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_recipients_recipient_id ON alert_recipients(recipient_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_recipients_notification_status ON alert_recipients(notification_status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_recipients_created_at ON alert_recipients(created_at)`);

    // alert_batch_operations 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_batch_operations_batch_id ON alert_batch_operations(batch_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_batch_operations_status ON alert_batch_operations(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_batch_operations_created_at ON alert_batch_operations(created_at)`);

    // alert_stats_snapshots 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_stats_snapshot_date ON alert_stats_snapshots(snapshot_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_stats_created_at ON alert_stats_snapshots(created_at)`);

    log('✅ 索引创建完成', colors.green);

    // ============================================
    // 验证结果
    // ============================================
    log('\n验证迁移结果...', colors.cyan);

    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'alert_%'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    const expectedTables = [
      'alert_dedup_records',
      'alert_groups',
      'alert_history',
      'alert_notifications',
      'alert_recipients',
      'alert_rules',
      'alert_stats_snapshots',
      'alert_upgrades',
      'alert_batch_operations',
      'notification_methods',
      'intent_configs'
    ];

    log(`\n📊 创建的表 (${tables.length}/${expectedTables.length}):`, colors.blue);
    tables.forEach((table, index) => {
      const isExpected = expectedTables.includes(table);
      log(`  ${index + 1}. ${table} ${isExpected ? '✅' : '⚠️'}`, isExpected ? colors.green : colors.yellow);
    });

    const indexResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE tablename IN (
        'intent_configs', 'alert_groups', 'alert_rules', 'notification_methods',
        'alert_history', 'alert_dedup_records', 'alert_upgrades',
        'alert_notifications', 'alert_recipients', 'alert_batch_operations',
        'alert_stats_snapshots'
      )
      AND schemaname = 'public'
    `);

    log(`\n📊 创建的索引: ${indexResult.rows[0].count}`, colors.blue);

    log('\n🎉 告警系统数据库迁移完成！', colors.green);
    log(`📦 已创建 ${tables.length} 个表和 ${indexResult.rows[0].count} 个索引`, colors.cyan);
    process.exit(0);

  } catch (error) {
    log('\n❌ 迁移失败:', colors.red);
    log(error.message, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行迁移
runMigration();
