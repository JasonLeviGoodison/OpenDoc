import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { spaces } from '@/db/schema';
import { serializeSpace } from '@/lib/serializers';
import { requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const [row] = await db
      .select()
      .from(spaces)
      .where(and(eq(spaces.id, id), eq(spaces.userId, userId)));

    if (!row) {
      throw new RouteError('Space not found.', 404);
    }

    return NextResponse.json(serializeSpace(row));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const [row] = await db
      .delete(spaces)
      .where(and(eq(spaces.id, id), eq(spaces.userId, userId)))
      .returning({ id: spaces.id });

    if (!row) {
      throw new RouteError('Space not found.', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
