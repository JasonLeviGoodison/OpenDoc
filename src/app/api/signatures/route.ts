import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { documentLinks, signatures } from '@/db/schema';
import { serializeSignature } from '@/lib/serializers';
import { requireUserId, toErrorResponse } from '@/lib/server/auth';

export async function GET() {
  try {
    const userId = await requireUserId();
    const rows = await db
      .select({ signature: signatures })
      .from(signatures)
      .innerJoin(documentLinks, eq(signatures.linkId, documentLinks.id))
      .where(eq(documentLinks.userId, userId))
      .orderBy(desc(signatures.signedAt));

    return NextResponse.json(rows.map(({ signature }) => serializeSignature(signature)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
