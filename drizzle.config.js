import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/database/schema.js',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com',
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER || 'worktoolAI',
    password: process.env.DATABASE_PASSWORD || 'YourSecurePassword123',
    database: process.env.DATABASE_NAME || 'worktool_ai',
    ssl: false,
  },
  verbose: true,
  strict: true,
});
