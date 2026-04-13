import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

// Lazy singleton — only connects when the first query runs,
// so the build doesn't crash on a placeholder DATABASE_URL.
let _db: DbInstance | null = null;

export function getDb() {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: 'require' });
    _db = drizzle(client, { schema });
  }
  return _db;
}

// Convenience alias — use `db` everywhere in route handlers.
export const db = new Proxy({} as DbInstance, {
  get(_target, prop) {
    return getDb()[prop as keyof DbInstance];
  },
});
