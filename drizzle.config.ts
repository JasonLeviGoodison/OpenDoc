import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

import { defineConfig } from 'drizzle-kit';

function applyLocalEnvOverrides() {
  const envLocalPath = resolve(process.cwd(), '.env.local');

  if (!existsSync(envLocalPath)) {
    return;
  }

  const overrides = parseEnv(readFileSync(envLocalPath, 'utf8'));

  for (const [key, value] of Object.entries(overrides)) {
    if (key === 'DATABASE_URL' || key === 'MIGRATION_DATABASE_URL') {
      process.env[key] = value;
    }
  }
}

function resolveMigrationDatabaseUrl() {
  applyLocalEnvOverrides();

  const migrationDatabaseUrl =
    process.env.MIGRATION_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (!migrationDatabaseUrl) {
    throw new Error('Set MIGRATION_DATABASE_URL or DATABASE_URL before running Drizzle migrations.');
  }

  const parsedUrl = new URL(migrationDatabaseUrl);

  if (parsedUrl.port === '6543') {
    throw new Error(
      'Drizzle migrations must use your direct Postgres connection, not the pooled Supabase URL on port 6543. Set MIGRATION_DATABASE_URL to the direct 5432 connection, or put the direct DATABASE_URL in .env.local for local development.',
    );
  }

  return migrationDatabaseUrl;
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveMigrationDatabaseUrl(),
    ssl: 'require',
  },
});
