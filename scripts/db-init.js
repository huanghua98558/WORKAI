#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 创建必要的schema和基础表
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

const dbConfig = parseDatabaseUrl(databaseUrl);

async function initDatabase() {
  const client = new Client(dbConfig);

  try {
    console.log('🚀 正在初始化数据库...\n');

    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 创建schema
    console.log('⏳ 创建 schema...');
    await client.query('CREATE SCHEMA IF NOT EXISTS app');
    console.log('✅ Schema "app" 创建成功\n');

    // 创建基础表（示例）
    console.log('⏳ 创建基础表...');

    // 用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        wechat_id VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ users 表创建成功');

    // 会话表
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES app.users(id),
        wechat_user_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        context JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ sessions 表创建成功');

    // 消息表
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES app.sessions(id),
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ messages 表创建成功');

    // 创建索引
    console.log('⏳ 创建索引...');

    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON app.sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_wechat_user_id ON app.sessions(wechat_user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_session_id ON app.messages(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON app.messages(created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_role ON app.messages(role)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_wechat_id ON app.users(wechat_id)');

    console.log('  ✅ 索引创建成功\n');

    // 插入测试数据
    console.log('⏳ 插入测试数据...');

    const testUser = await client.query(`
      INSERT INTO app.users (name, email, wechat_id)
      VALUES ('测试用户', 'test@example.com', 'test_wechat_id')
      ON CONFLICT (wechat_id) DO NOTHING
      RETURNING id
    `);

    if (testUser.rows.length > 0) {
      console.log(`  ✅ 测试用户创建成功 (ID: ${testUser.rows[0].id})`);
    } else {
      console.log('  ✅ 测试用户已存在');
    }

    console.log('\n✅ 数据库初始化完成！');
    console.log('\n📊 创建的表：');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
      ORDER BY table_name
    `);

    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n🎉 数据库已准备就绪，可以开始使用！\n');

  } catch (error) {
    console.error('❌ 数据库初始化失败！');
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
