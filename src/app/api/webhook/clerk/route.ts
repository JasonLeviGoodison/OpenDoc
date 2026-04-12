import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const eventType = body.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = body.data;
    const email = email_addresses?.[0]?.email_address;
    const fullName = [first_name, last_name].filter(Boolean).join(' ');

    await db
      .insert(users)
      .values({
        id,
        email: email || '',
        fullName: fullName || null,
        avatarUrl: image_url || null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: email || '',
          fullName: fullName || null,
          avatarUrl: image_url || null,
          updatedAt: new Date(),
        },
      });
  }

  if (eventType === 'user.deleted') {
    const { id } = body.data;
    await db.delete(users).where(eq(users.id, id));
  }

  return NextResponse.json({ success: true });
}
