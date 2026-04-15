import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { requireUserId, toErrorResponse } from '@/lib/server/auth';

export async function POST() {
  try {
    const userId = await requireUserId();

    await db
      .update(notifications)
      .set({
        read: true,
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
