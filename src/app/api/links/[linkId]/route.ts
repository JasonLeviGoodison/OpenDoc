import { after, NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { brandSettings, documentLinks, documents, spaceDocuments, spaces } from '@/db/schema';
import { asc, eq, inArray } from 'drizzle-orm';
import { getLinkAvailability } from '@/lib/link-access';
import { serializeDocumentSummary, serializeSpace } from '@/lib/serializers';
import { RouteError, toErrorResponse } from '@/lib/server/auth';
import { getResolvedDocumentPreviewState, isTrackablePreviewSourceFile } from '@/lib/viewer';

const PREVIEW_RECOVERY_STALE_MS = 2 * 60_000;

function getDocumentIdsNeedingPreview(
  rows: Array<{
    fileType: string;
    id: string;
    previewFileType: string | null;
    previewUpdatedAt?: Date | null;
    previewStatus: string | null;
  }>,
) {
  return rows
    .filter((row) => {
      if (!isTrackablePreviewSourceFile(row.fileType)) {
        return false;
      }

      const resolvedPreview = getResolvedDocumentPreviewState({
        fileType: row.fileType,
        previewFileType: row.previewFileType,
        previewStatus: row.previewStatus,
      });

      if (resolvedPreview.previewStatus !== 'pending') {
        return false;
      }

      if ((row.previewStatus ?? 'none') === 'none') {
        return true;
      }

      if ((row.previewStatus ?? 'none') !== 'pending') {
        return false;
      }

      if (!row.previewUpdatedAt) {
        return true;
      }

      return Date.now() - row.previewUpdatedAt.getTime() >= PREVIEW_RECOVERY_STALE_MS;
    })
    .map((row) => row.id);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params;
    const [link] = await db.select().from(documentLinks).where(eq(documentLinks.linkId, linkId));

    if (!link) {
      throw new RouteError('Link not found', 404);
    }

    let document = null;
    const previewJobIds = new Set<string>();

    if (link.documentId) {
      const [row] = await db.select().from(documents).where(eq(documents.id, link.documentId));
      document = row ? serializeDocumentSummary(row) : null;

      for (const documentId of getDocumentIdsNeedingPreview(row ? [row] : [])) {
        previewJobIds.add(documentId);
      }
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

        for (const documentId of getDocumentIdsNeedingPreview(
          spaceDocumentRows.map(({ document: linkedDocument }) => linkedDocument),
        )) {
          previewJobIds.add(documentId);
        }
      }
    }

    const [brandRow] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.userId, link.userId));

    if (previewJobIds.size > 0) {
      const previewJobIdList = [...previewJobIds];
      const now = new Date();

      await db
        .update(documents)
        .set({
          previewError: null,
          previewFileType: 'pdf',
          previewStatus: 'pending',
          previewUpdatedAt: now,
          updatedAt: now,
        })
        .where(inArray(documents.id, previewJobIdList));

      after(async () => {
        try {
          const { ensureDocumentPreview } = await import('@/lib/server/document-preview');

          for (const documentId of previewJobIdList) {
            await ensureDocumentPreview(documentId);
          }
        } catch (previewError) {
          console.error('Failed to recover document preview generation', previewError);
        }
      });
    }

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
      nda_text: link.ndaText,
      require_email: link.requireEmail ?? true,
      require_nda: link.requireNda ?? false,
      require_password: link.requirePassword ?? false,
      space,
      watermark_text: link.watermarkText,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
