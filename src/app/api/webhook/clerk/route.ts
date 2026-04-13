import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhook } from '@clerk/nextjs/webhooks';

export async function POST(req: NextRequest) {
  try {
    const event = await verifyWebhook(req);
    const eventType = event.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = event.data;
      const email = email_addresses?.[0]?.email_address;
      const fullName = [first_name, last_name].filter(Boolean).join(' ');

      await db
        .insert(users)
        .values({
          avatarUrl: image_url || null,
          email: email || '',
          fullName: fullName || null,
          id,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            avatarUrl: image_url || null,
            email: email || '',
            fullName: fullName || null,
            updatedAt: new Date(),
          },
        });
    }

    if (eventType === 'user.deleted') {
      const { id } = event.data;

      if (id) {
        await db.delete(users).where(eq(users.id, id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to verify Clerk webhook', error);
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }
}
