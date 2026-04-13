import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { documentLinks } from '@/db/schema';
import { serializeDocumentLink } from '@/lib/serializers';
import { requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await req.json();

    if (typeof body.is_active !== 'boolean') {
      throw new RouteError('is_active must be a boolean.', 400);
    }

    const [row] = await db
      .update(documentLinks)
      .set({
        isActive: body.is_active,
        updatedAt: new Date(),
      })
      .where(and(eq(documentLinks.id, id), eq(documentLinks.userId, userId)))
      .returning();

    if (!row) {
      throw new RouteError('Not found', 404);
    }

    return NextResponse.json(serializeDocumentLink(row));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const [row] = await db
      .delete(documentLinks)
      .where(and(eq(documentLinks.id, id), eq(documentLinks.userId, userId)))
      .returning({ id: documentLinks.id });

    if (!row) {
      throw new RouteError('Not found', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
