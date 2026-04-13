import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { spaceDocuments, spaces } from '@/db/schema';
import { requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; spaceDocumentId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id, spaceDocumentId } = await params;
    const [space] = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(and(eq(spaces.id, id), eq(spaces.userId, userId)));

    if (!space) {
      throw new RouteError('Space not found.', 404);
    }

    const [row] = await db
      .delete(spaceDocuments)
      .where(and(eq(spaceDocuments.id, spaceDocumentId), eq(spaceDocuments.spaceId, id)))
      .returning({ id: spaceDocuments.id });

    if (!row) {
      throw new RouteError('Document is not part of this space.', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
