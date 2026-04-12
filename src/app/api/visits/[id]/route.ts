import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { visits } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const [row] = await db
    .update(visits)
    .set({
      ...body,
      lastActivityAt: new Date(),
    })
    .where(eq(visits.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}
