import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { spaces } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { serializeSpace } from '@/lib/serializers';
import { ensureCurrentUserRecord, requireUserId, toErrorResponse } from '@/lib/server/auth';
import { parseSpaceCreateBody } from '@/lib/validators';

export async function GET() {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select()
      .from(spaces)
      .where(eq(spaces.userId, userId))
      .orderBy(desc(spaces.createdAt));

    return NextResponse.json(rows.map(serializeSpace));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await ensureCurrentUserRecord(userId);

    const body = parseSpaceCreateBody(await req.json());

    const [row] = await db
      .insert(spaces)
      .values({
        bannerUrl: body.bannerUrl,
        description: body.description,
        headline: body.headline,
        logoUrl: body.logoUrl,
        name: body.name,
        userId,
      })
      .returning();

    return NextResponse.json(serializeSpace(row), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
