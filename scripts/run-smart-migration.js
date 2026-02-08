/**
 * 智能数据库迁移脚本
 * 只执行不存在的表和字段
 */

require('dotenv').config();

async function runSmartMigration() {
  const { getDb } = require('coze-coding-dev-sdk');
  const { getLogger } = require('../server/lib/logger');
  const { v4: uuidv4 } = require('uuid');

  const logger = getLogger('MIGRATION');

  try {
    logger.info('开始执行智能数据库迁移...');
    const db = await getDb();

    // ========================================
    // 1. 检查并创建表
    // ========================================
    const existingTables = new Set();
    const tableResult = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    tableResult.rows.forEach(row => existingTables.add(row.table_name));

    const tablesToCreate = [
      {
        name: 'api_keys',
        sql: `CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(36) NOT NULL,
          name VARCHAR(255) NOT NULL,
          hashed_key VARCHAR(255) NOT NULL,
          prefix VARCHAR(20) NOT NULL,
          last_used_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true NOT NULL,
          usage_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
      },
      {
        name: 'password_reset_tokens',
        sql: `CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(36) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used_at TIMESTAMP WITH TIME ZONE,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
      },
      {
        name: 'user_audit_logs',
        sql: `CREATE TABLE IF NOT EXISTS user_audit_logs (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(36),
          action VARCHAR(50) NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          resource_type VARCHAR(50),
          resource_id VARCHAR(36),
          resource_name VARCHAR(255),
          details JSONB DEFAULT '{}'::jsonb,
          status VARCHAR(20) DEFAULT 'success',
          error_message TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          session_id VARCHAR(36),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'robot_permissions',
        sql: `CREATE TABLE IF NOT EXISTS robot_permissions (
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
          assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          is_active BOOLEAN DEFAULT true NOT NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (robot_id) REFERENCES robots(id) ON DELETE CASCADE
        )`
      }
    ];

    console.log('\n📦 创建表...');
    for (const table of tablesToCreate) {
      if (!existingTables.has(table.name)) {
        try {
          await db.execute(table.sql);
          console.log(`✅ 创建表: ${table.name}`);
        } catch (error) {
          console.log(`❌ 创建表失败: ${table.name} - ${error.message}`);
        }
      } else {
        console.log(`⏭️  跳过表（已存在）: ${table.name}`);
      }
    }

    // ========================================
    // 2. 检查并添加字段
    // ========================================
    const columnsToAdd = {
      users: [
        { name: 'avatar_url', type: 'VARCHAR(500)' },
        { name: 'phone', type: 'VARCHAR(20)' },
        { name: 'full_name', type: 'VARCHAR(255)' },
        { name: 'mfa_enabled', type: 'BOOLEAN DEFAULT false' },
        { name: 'mfa_secret', type: 'VARCHAR(32)' },
        { name: 'mfa_backup_codes', type: 'TEXT[]' },
        { name: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
        { name: 'locked_until', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'password_changed_at', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'password_expires_at', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'email_verified', type: 'BOOLEAN DEFAULT false' },
        { name: 'email_verified_at', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'email_verification_token', type: 'VARCHAR(255)' },
        { name: 'last_activity_at', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'last_login_ip', type: 'VARCHAR(45)' },
        { name: 'metadata', type: 'JSONB DEFAULT \'{}\'::jsonb' }
      ],
      robots: [
        { name: 'owner_id', type: 'VARCHAR(36)' },
        { name: 'owner_name', type: 'VARCHAR(255)' },
        { name: 'is_system', type: 'BOOLEAN DEFAULT false' }
      ]
    };

    console.log('\n📝 添加字段...');
    for (const [tableName, columns] of Object.entries(columnsToAdd)) {
      if (!existingTables.has(tableName)) {
        console.log(`⏭️  跳过表（不存在）: ${tableName}`);
        continue;
      }

      // 获取现有列
      const existingColumns = new Set();
      try {
        const columnResult = await db.execute(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        `);
        columnResult.rows.forEach(row => existingColumns.add(row.column_name));
      } catch (error) {
        console.log(`⚠️  无法获取 ${tableName} 的列信息`);
        continue;
      }

      // 添加缺失的列
      for (const column of columns) {
        if (!existingColumns.has(column.name)) {
          try {
            await db.execute(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
            console.log(`✅ 添加字段: ${tableName}.${column.name}`);
          } catch (error) {
            console.log(`❌ 添加字段失败: ${tableName}.${column.name} - ${error.message}`);
          }
        } else {
          console.log(`⏭️  跳过字段（已存在）: ${tableName}.${column.name}`);
        }
      }
    }

    // ========================================
    // 3. 创建索引
    // ========================================
    const indexesToCreate = [
      { table: 'api_keys', columns: ['user_id'] },
      { table: 'api_keys', columns: ['hashed_key'] },
      { table: 'api_keys', columns: ['prefix'] },
      { table: 'api_keys', columns: ['is_active'] },
      { table: 'api_keys', columns: ['expires_at'] },
      { table: 'password_reset_tokens', columns: ['user_id'] },
      { table: 'password_reset_tokens', columns: ['token'] },
      { table: 'password_reset_tokens', columns: ['email'] },
      { table: 'password_reset_tokens', columns: ['expires_at'] },
      { table: 'user_audit_logs', columns: ['user_id'] },
      { table: 'user_audit_logs', columns: ['action'] },
      { table: 'user_audit_logs', columns: ['action_type'] },
      { table: 'user_audit_logs', columns: ['resource_type'] },
      { table: 'user_audit_logs', columns: ['resource_id'] },
      { table: 'user_audit_logs', columns: ['status'] },
      { table: 'user_audit_logs', columns: ['created_at'] },
      { table: 'robot_permissions', columns: ['user_id'] },
      { table: 'robot_permissions', columns: ['robot_id'] },
      { table: 'robot_permissions', columns: ['permission_type'] },
      { table: 'robot_permissions', columns: ['is_active'] },
      { table: 'robot_permissions', columns: ['assigned_by'] },
      { table: 'robots', columns: ['owner_id'] },
      { table: 'robots', columns: ['is_system'] }
    ];

    console.log('\n🔑 创建索引...');
    for (const index of indexesToCreate) {
      if (!existingTables.has(index.table)) {
        continue;
      }
      const indexName = `${index.table}_${index.columns.join('_')}_idx`;
      try {
        await db.execute(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${index.table}(${index.columns.join(', ')})`);
        console.log(`✅ 创建索引: ${indexName}`);
      } catch (error) {
        console.log(`❌ 创建索引失败: ${indexName} - ${error.message}`);
      }
    }

    // ========================================
    // 4. 创建复合索引
    // ========================================
    const compositeIndexes = [
      { name: 'robot_permissions_user_robot_idx', table: 'robot_permissions', columns: ['user_id', 'robot_id'] },
      { name: 'user_sessions_token_idx', table: 'user_sessions', columns: ['token'] },
      { name: 'user_sessions_refresh_token_idx', table: 'user_sessions', columns: ['refresh_token'] }
    ];

    console.log('\n🔗 创建复合索引...');
    for (const index of compositeIndexes) {
      if (!existingTables.has(index.table)) {
        continue;
      }
      try {
        await db.execute(`CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.columns.join(', ')})`);
        console.log(`✅ 创建复合索引: ${index.name}`);
      } catch (error) {
        console.log(`❌ 创建复合索引失败: ${index.name} - ${error.message}`);
      }
    }

    console.log('\n✅ 智能数据库迁移完成！');
    logger.info('智能数据库迁移完成');

    // 最终验证
    const finalResult = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN (
        'api_keys',
        'user_sessions',
        'password_reset_tokens',
        'user_audit_logs',
        'robot_permissions'
      )
      ORDER BY table_name
    `);

    console.log('\n📊 迁移后的表:');
    finalResult.rows.forEach(row => console.log(`  - ${row.table_name}`));

    process.exit(0);
  } catch (error) {
    logger.error('智能数据库迁移失败', { error: error.message, stack: error.stack });
    console.error('\n❌ 智能数据库迁移失败:', error.message);
    process.exit(1);
  }
}

runSmartMigration();
