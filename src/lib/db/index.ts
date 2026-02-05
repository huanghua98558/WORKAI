import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/storage/database/shared/schema';
import * as newSchemas from '@/storage/database/new-schemas';

// 从环境变量获取数据库URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// 创建PostgreSQL连接
const connectionString = DATABASE_URL;
const client = postgres(connectionString, { max: 10 });

// 创建Drizzle实例
export const db = drizzle(client, {
  schema: {
    ...schema,
    ...newSchemas,
  },
});

// 导出所有schema
export * from '@/storage/database/shared/schema';
export * from '@/storage/database/new-schemas';
