import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentLinks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;
  const { password } = await req.json();

  const [link] = await db
    .select({ passwordHash: documentLinks.passwordHash })
    .from(documentLinks)
    .where(eq(documentLinks.linkId, linkId));

  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  // Simple comparison — in production, use bcrypt
  if (link.passwordHash !== password) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
