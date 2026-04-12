import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentLinks, documents, brandSettings } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Public endpoint — no auth required (for viewers)
export async function GET(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;

  const [link] = await db
    .select()
    .from(documentLinks)
    .where(eq(documentLinks.linkId, linkId));

  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  // Fetch the associated document
  let document = null;
  if (link.documentId) {
    const [doc] = await db
      .select({
        id: documents.id,
        name: documents.name,
        fileUrl: documents.fileUrl,
        pageCount: documents.pageCount,
        fileType: documents.fileType,
      })
      .from(documents)
      .where(eq(documents.id, link.documentId));
    document = doc || null;
  }

  // Fetch brand settings for the link owner
  const [brand] = await db
    .select({
      logoUrl: brandSettings.logoUrl,
      accentColor: brandSettings.accentColor,
      companyName: brandSettings.companyName,
    })
    .from(brandSettings)
    .where(eq(brandSettings.userId, link.userId));

  // Increment visit count
  await db
    .update(documentLinks)
    .set({
      visitCount: sql`${documentLinks.visitCount} + 1`,
      lastVisitedAt: new Date(),
    })
    .where(eq(documentLinks.id, link.id));

  return NextResponse.json({
    ...link,
    passwordHash: undefined,
    document: document
      ? {
          id: document.id,
          name: document.name,
          file_url: document.fileUrl,
          page_count: document.pageCount,
          file_type: document.fileType,
        }
      : null,
    brand: brand || null,
  });
}
