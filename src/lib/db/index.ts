import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/storage/database/shared/schema';
import * as newSchemas from '@/storage/database/new-schemas';

// 延迟初始化数据库连接，避免构建时依赖环境变量
let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getDatabaseUrl(): string {
  const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return DATABASE_URL;
}

function initializeDb() {
  if (!_db) {
    const connectionString = getDatabaseUrl();
    _client = postgres(connectionString, { max: 10 });
    _db = drizzle(_client, {
      schema: {
        ...schema,
        ...newSchemas,
      },
    });
  }
  return _db;
}

// 导出数据库实例（懒加载）
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const db = initializeDb();
    return db[prop as keyof typeof db];
  },
});

// 导出shared schema
export * from '@/storage/database/shared/schema';
// 导出new-schemas，但排除冲突的表
export {
  staff,
  sessions,
  userSessions,
  messages,
  robots,
  interventions
} from '@/storage/database/new-schemas';
