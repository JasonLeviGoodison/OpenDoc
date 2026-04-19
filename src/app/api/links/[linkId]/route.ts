import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { brandSettings, documentLinks, documents, spaceDocuments, spaces } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { getLinkAvailability } from '@/lib/link-access';
import { serializeDocumentSummary, serializeSpace } from '@/lib/serializers';
import { RouteError, toErrorResponse } from '@/lib/server/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params;
    const [link] = await db.select().from(documentLinks).where(eq(documentLinks.linkId, linkId));

    if (!link) {
      throw new RouteError('Link not found', 404);
    }

    let document = null;

    if (link.documentId) {
      const [row] = await db.select().from(documents).where(
        eq(documents.id, link.documentId),
      );
      document = row ? serializeDocumentSummary(row) : null;
    }

    let space = null;

    if (link.spaceId) {
      const [spaceRow] = await db.select().from(spaces).where(eq(spaces.id, link.spaceId));

      if (spaceRow) {
        const spaceDocumentRows = await db
          .select({ document: documents })
          .from(spaceDocuments)
          .innerJoin(documents, eq(spaceDocuments.documentId, documents.id))
          .where(eq(spaceDocuments.spaceId, link.spaceId))
          .orderBy(asc(spaceDocuments.orderIndex));

        space = {
          ...serializeSpace(spaceRow),
          documents: spaceDocumentRows.map(({ document: linkedDocument }) =>
            serializeDocumentSummary(linkedDocument),
          ),
        };
      }
    }

    const [brandRow] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.userId, link.userId));

    return NextResponse.json({
      allow_download: link.allowDownload ?? false,
      allowed_domains: link.allowedDomains ?? [],
      allowed_emails: link.allowedEmails ?? [],
      blocked_domains: link.blockedDomains ?? [],
      blocked_emails: link.blockedEmails ?? [],
      brand: brandRow
        ? {
            accent_color: brandRow.accentColor,
            company_name: brandRow.companyName,
            logo_url: brandRow.logoUrl,
          }
        : null,
      document,
      enable_watermark: link.enableWatermark ?? false,
      expires_at: link.expiresAt?.toISOString() ?? null,
      is_active: link.isActive ?? true,
      link_id: link.linkId,
      link_state: getLinkAvailability(link),
      name: link.name,
      require_email: link.requireEmail ?? true,
      require_password: link.requirePassword ?? false,
      space,
      watermark_text: link.watermarkText,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
