import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { brandSettings } from '@/db/schema';
import { serializeBrandSettings } from '@/lib/serializers';
import {
  ensureCurrentUserRecord,
  requireUserId,
  toErrorResponse,
} from '@/lib/server/auth';
import { parseBrandSettingsBody } from '@/lib/validators';

export async function GET() {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.userId, userId));

    return NextResponse.json(row ? serializeBrandSettings(row) : null);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await ensureCurrentUserRecord(userId);
    const body = parseBrandSettingsBody(await req.json());

    const [row] = await db
      .insert(brandSettings)
      .values({
        accentColor: body.accentColor,
        companyName: body.companyName,
        logoUrl: body.logoUrl,
        userId,
        websiteUrl: body.websiteUrl,
      })
      .onConflictDoUpdate({
        target: brandSettings.userId,
        set: {
          accentColor: body.accentColor,
          companyName: body.companyName,
          logoUrl: body.logoUrl,
          updatedAt: new Date(),
          websiteUrl: body.websiteUrl,
        },
      })
      .returning();

    return NextResponse.json(serializeBrandSettings(row));
  } catch (error) {
    return toErrorResponse(error);
  }
}
