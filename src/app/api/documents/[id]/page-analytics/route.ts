import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { documentLinks, documents, pageViews, visits } from '@/db/schema';
import { requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';
import { getResolvedDocumentPreviewState } from '@/lib/viewer';

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const [document] = await db
      .select({
        fileType: documents.fileType,
        id: documents.id,
        pageCount: documents.pageCount,
        previewFileType: documents.previewFileType,
        previewStatus: documents.previewStatus,
      })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));

    if (!document) {
      throw new RouteError('Document not found.', 404);
    }

    const pageAnalyticsRows = await db
      .select({
        lastViewedAt: sql<Date | string | null>`max(coalesce(${pageViews.leftAt}, ${pageViews.enteredAt}))`,
        pageNumber: pageViews.pageNumber,
        totalDuration: sql<number>`coalesce(sum(${pageViews.duration}), 0)`,
        totalViews: sql<number>`count(*)`,
        uniqueVisits: sql<number>`count(distinct ${pageViews.visitId})`,
      })
      .from(pageViews)
      .innerJoin(visits, eq(pageViews.visitId, visits.id))
      .innerJoin(documentLinks, eq(visits.linkId, documentLinks.id))
      .where(and(eq(pageViews.documentId, id), eq(documentLinks.userId, userId)))
      .groupBy(pageViews.pageNumber)
      .orderBy(pageViews.pageNumber);

    const recentActivityRows = await db
      .select({
        duration: pageViews.duration,
        enteredAt: pageViews.enteredAt,
        id: pageViews.id,
        leftAt: pageViews.leftAt,
        pageNumber: pageViews.pageNumber,
        visitId: pageViews.visitId,
        visitorEmail: visits.visitorEmail,
        visitorName: visits.visitorName,
      })
      .from(pageViews)
      .innerJoin(visits, eq(pageViews.visitId, visits.id))
      .innerJoin(documentLinks, eq(visits.linkId, documentLinks.id))
      .where(and(eq(pageViews.documentId, id), eq(documentLinks.userId, userId)))
      .orderBy(desc(sql`coalesce(${pageViews.leftAt}, ${pageViews.enteredAt})`))
      .limit(40);

    const resolvedPreview = getResolvedDocumentPreviewState({
      fileType: document.fileType,
      previewFileType: document.previewFileType,
      previewStatus: document.previewStatus,
    });

    return NextResponse.json({
      file_type: document.fileType,
      page_analytics: pageAnalyticsRows.map((row) => ({
        last_viewed_at: toIsoString(row.lastViewedAt),
        page_number: row.pageNumber,
        total_duration: Number(row.totalDuration ?? 0),
        total_views: Number(row.totalViews ?? 0),
        unique_visits: Number(row.uniqueVisits ?? 0),
      })),
      page_count: document.pageCount,
      preview_status: resolvedPreview.previewStatus,
      recent_activity: recentActivityRows.map((row) => ({
        duration: Number(row.duration ?? 0),
        entered_at: toIsoString(row.enteredAt),
        id: row.id,
        left_at: toIsoString(row.leftAt),
        page_number: row.pageNumber,
        visit_id: row.visitId,
        visitor_email: row.visitorEmail,
        visitor_name: row.visitorName,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
