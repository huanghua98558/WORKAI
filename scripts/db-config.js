/**
 * 数据库配置模块
 * 从环境变量读取数据库连接信息
 */

import pg from 'pg';
const { Client } = pg;

/**
 * 检查数据库是否配置
 */
export function isDatabaseConfigured() {
  return !!(process.env.DATABASE_URL || process.env.PGDATABASE_URL);
}

/**
 * 从连接字符串解析配置
 */
export function parseDatabaseConfig() {
  const url = process.env.DATABASE_URL || process.env.PGDATABASE_URL;
  
  if (!url) {
    return null;
  }
  
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
    console.error('❌ 解析数据库连接字符串失败:', e.message);
    return null;
  }
}

/**
 * 创建数据库客户端
 */
export function createDbClient() {
  const config = parseDatabaseConfig();
  if (!config) {
    throw new Error('数据库未配置。请设置 DATABASE_URL 或 PGDATABASE_URL 环境变量。');
  }
  return new Client(config);
}

/**
 * 连接数据库并返回客户端
 */
export async function connectDb() {
  const client = createDbClient();
  await client.connect();
  return client;
}

export default {
  isDatabaseConfigured,
  parseDatabaseConfig,
  createDbClient,
  connectDb
};
