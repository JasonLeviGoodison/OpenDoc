import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

import postgres from 'postgres';
import { readMigrationFiles } from 'drizzle-orm/migrator';

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
    throw new Error('Set MIGRATION_DATABASE_URL or DATABASE_URL before running the baseline script.');
  }

  const parsedUrl = new URL(migrationDatabaseUrl);

  if (parsedUrl.port === '6543') {
    throw new Error(
      'The baseline script must use your direct Postgres connection, not the pooled Supabase URL on port 6543.',
    );
  }

  return migrationDatabaseUrl;
}

async function main() {
  const journalPath = resolve(process.cwd(), 'drizzle/meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: { idx: number; tag: string; when: number }[];
  };
  const baselineEntry = journal.entries[0];

  if (!baselineEntry) {
    throw new Error('No Drizzle migrations were found to baseline.');
  }

  const baselineMigration = readMigrationFiles({ migrationsFolder: './drizzle' })[0];

  if (!baselineMigration) {
    throw new Error(`Unable to read migration ${baselineEntry.tag}.`);
  }

  const sql = postgres(resolveMigrationDatabaseUrl(), {
    prepare: false,
    ssl: 'require',
  });

  try {
    const [sentinelCheck] = await sql.unsafe<[{ table_count: string }]>(`
      select count(*)::text as table_count
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('users', 'documents', 'document_links', 'visits')
    `);

    if (Number(sentinelCheck?.table_count ?? 0) < 4) {
      throw new Error(
        'This database does not look like a pre-migration OpenDoc schema. Run `npm run db:migrate` instead of baselining.',
      );
    }

    await sql.unsafe('create schema if not exists drizzle');
    await sql.unsafe(`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `);

    const [existingMigration] = await sql.unsafe<[{ id: number }]>(
      `
        select id
        from drizzle.__drizzle_migrations
        where created_at = ${baselineMigration.folderMillis}
        limit 1
      `,
    );

    if (existingMigration) {
      console.log(`Baseline migration ${baselineEntry.tag} is already recorded.`);
      return;
    }

    await sql.unsafe(
      `
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values ('${baselineMigration.hash}', ${baselineMigration.folderMillis})
      `,
    );

    console.log(`Recorded baseline migration ${baselineEntry.tag}.`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
