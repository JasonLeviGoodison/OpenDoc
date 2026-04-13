import { inArray } from 'drizzle-orm';

import { db } from '@/db';
import { documents } from '@/db/schema';
import { ensureDocumentPreview } from '@/lib/server/document-preview';

async function main() {
  const ids = process.argv.slice(2).filter(Boolean);
  const rows =
    ids.length > 0
      ? await db.select({ id: documents.id }).from(documents).where(inArray(documents.id, ids))
      : await db.select({ id: documents.id }).from(documents);

  for (const row of rows) {
    console.log(`Generating preview for ${row.id}`);
    await ensureDocumentPreview(row.id);
  }

  console.log(`Processed ${rows.length} document preview job${rows.length === 1 ? '' : 's'}.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
