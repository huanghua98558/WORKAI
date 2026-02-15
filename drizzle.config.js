import { defineConfig } from 'drizzle-kit';

// 从 DATABASE_URL 或 PGDATABASE_URL 解析连接信息
function parseDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.PGDATABASE_URL;
  if (!url) {
    return {
      host: 'pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com',
      port: 5432,
      user: 'worktoolAI2',
      password: 'Worktool2025!',
      database: 'worktool_ai',
    };
  }
  
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      user: parsed.username,
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.slice(1),
    };
  } catch (e) {
    console.error('Failed to parse DATABASE_URL:', e.message);
    return {
      host: 'pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com',
      port: 5432,
      user: 'worktoolAI2',
      password: 'Worktool2025!',
      database: 'worktool_ai',
    };
  }
}

const dbConfig = parseDatabaseUrl();

export default defineConfig({
  schema: './server/database/schema.js',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: false,
  },
  verbose: true,
  strict: true,
});
