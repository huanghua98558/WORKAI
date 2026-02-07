import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/storage/database/shared/schema.ts',
    './src/storage/database/new-schemas/messages.ts',
    './src/storage/database/new-schemas/sessions.ts',
    './src/storage/database/new-schemas/robots.ts',
    './src/storage/database/new-schemas/staff.ts',
    './src/storage/database/new-schemas/intents.ts',
    './src/storage/database/new-schemas/business-roles.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: false,
  casing: 'snake_case',
});
