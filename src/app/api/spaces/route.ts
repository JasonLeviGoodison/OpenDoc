import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { spaces } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(spaces)
    .where(eq(spaces.userId, userId))
    .orderBy(desc(spaces.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const [row] = await db
    .insert(spaces)
    .values({
      userId,
      name: body.name,
      description: body.description || null,
      headline: body.headline || null,
      logoUrl: body.logo_url || null,
      bannerUrl: body.banner_url || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
