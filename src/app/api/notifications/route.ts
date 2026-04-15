import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { serializeNotification } from '@/lib/serializers';
import { requireUserId, toErrorResponse } from '@/lib/server/auth';

export async function GET() {
  try {
    const userId = await requireUserId();

    const [rows, unreadRows] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(20),
      db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
    ]);

    return NextResponse.json({
      notifications: rows.map(serializeNotification),
      unread_count: Number(unreadRows[0]?.count ?? 0),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
