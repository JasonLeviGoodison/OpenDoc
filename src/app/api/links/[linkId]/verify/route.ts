import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentLinks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPasswordRecord } from '@/lib/security';

export async function POST(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;
  const { password } = await req.json();

  const [link] = await db
    .select({ id: documentLinks.id, passwordHash: documentLinks.passwordHash })
    .from(documentLinks)
    .where(eq(documentLinks.linkId, linkId));

  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  if (link.passwordHash) {
    const passwordCheck = verifyPasswordRecord(password, link.passwordHash);

    if (!passwordCheck.isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (passwordCheck.needsRehash && passwordCheck.upgradedHash) {
      await db
        .update(documentLinks)
        .set({
          passwordHash: passwordCheck.upgradedHash,
          updatedAt: new Date(),
        })
        .where(eq(documentLinks.id, link.id));
    }
  }

  return NextResponse.json({ success: true });
}
