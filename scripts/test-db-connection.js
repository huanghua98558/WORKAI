#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 * 使用方法：node scripts/test-db-connection.js
 */

import pg from 'pg';
const { Client } = pg;

// 数据库配置
const dbConfig = {
  host: 'pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com',
  port: 5432,
  database: 'worktool_ai',
  user: 'worktoolAI',
  password: 'YourSecurePassword123',
  ssl: false // 如果需要SSL，设置为 { rejectUnauthorized: false }
};

async function testConnection() {
  const client = new Client(dbConfig);

  console.log('🔍 正在测试数据库连接...\n');
  console.log('配置信息：');
  console.log(`  - 主机: ${dbConfig.host}`);
  console.log(`  - 端口: ${dbConfig.port}`);
  console.log(`  - 数据库: ${dbConfig.database}`);
  console.log(`  - 用户: ${dbConfig.user}`);
  console.log('');

  try {
    // 连接数据库
    console.log('⏳ 正在连接数据库...');
    await client.connect();
    console.log('✅ 数据库连接成功！\n');

    // 测试查询
    console.log('⏳ 正在执行测试查询...');
    const result = await client.query('SELECT NOW() as current_time, current_database() as current_db, current_user as current_user, version() as version');
    const row = result.rows[0];

    console.log('📊 查询结果：');
    console.log(`  - 当前时间: ${row.current_time}`);
    console.log(`  - 当前数据库: ${row.current_db}`);
    console.log(`  - 当前用户: ${row.current_user}`);
    console.log(`  - PostgreSQL版本: ${row.version.substring(0, 50)}...`);
    console.log('');

    // 测试schema
    console.log('⏳ 正在检查schema...');
    const schemaResult = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema') ORDER BY schema_name");
    console.log(`📋 找到 ${schemaResult.rows.length} 个自定义schema：`);
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.schema_name}`);
    });
    console.log('');

    // 测试创建schema（如果不存在）
    console.log('⏳ 正在确保schema存在...');
    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS app');
      console.log('✅ Schema "app" 已确保存在\n');
    } catch (err) {
      console.log('⚠️  创建schema失败:', err.message, '\n');
    }

    // 检查表数量
    console.log('⏳ 正在检查数据表...');
    const tablesResult = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
      ORDER BY table_schema, table_name
    `);
    console.log(`📋 找到 ${tablesResult.rows.length} 张表在 "app" schema中：`);
    if (tablesResult.rows.length === 0) {
      console.log('  (暂无表，需要运行数据库迁移)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_schema}.${row.table_name}`);
      });
    }
    console.log('');

    console.log('✅ 所有测试通过！数据库配置正确！');
    console.log('');

  } catch (error) {
    console.error('❌ 数据库连接失败！');
    console.error('');
    console.error('错误详情：');
    console.error(error.message);
    console.error('');
    console.error('可能的原因：');
    console.error('1. 数据库地址或端口错误');
    console.error('2. 用户名或密码错误');
    console.error('3. 数据库名称不存在');
    console.error('4. 白名单未配置（需要在阿里云控制台添加你的IP）');
    console.error('5. 网络连接问题');
    console.error('');
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 已断开数据库连接');
  }
}

// 运行测试
testConnection();
