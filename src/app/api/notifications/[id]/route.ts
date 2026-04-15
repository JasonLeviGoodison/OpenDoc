import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { serializeNotification } from '@/lib/serializers';
import { requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const [row] = await db
      .update(notifications)
      .set({
        read: true,
      })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    if (!row) {
      throw new RouteError('Notification not found.', 404);
    }

    return NextResponse.json(serializeNotification(row));
  } catch (error) {
    return toErrorResponse(error);
  }
}
