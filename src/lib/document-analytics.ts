import type { DocumentPageSessionAnalytics } from '@/lib/types';

export interface DocumentPageSessionAnalyticsRow {
  completionRate: number | null;
  createdAt: Date | string | null;
  lastActivityAt: Date | string | null;
  lastViewedAt: Date | string | null;
  pageCountViewed: number | null;
  pageNumber: number;
  totalDuration: number | null;
  totalViews: number | null;
  visitDuration: number | null;
  visitId: string;
  visitorEmail: string | null;
  visitorName: string | null;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function buildDocumentPageSessionAnalytics(
  rows: DocumentPageSessionAnalyticsRow[],
): DocumentPageSessionAnalytics[] {
  const sessions = new Map<string, DocumentPageSessionAnalytics>();

  for (const row of rows) {
    let session = sessions.get(row.visitId);

    if (!session) {
      session = {
        completion_rate: Number(row.completionRate ?? 0),
        created_at: toIsoString(row.createdAt),
        last_activity_at: toIsoString(row.lastActivityAt),
        page_analytics: [],
        page_count_viewed: Number(row.pageCountViewed ?? 0),
        tracked_duration: 0,
        visit_duration: Number(row.visitDuration ?? 0),
        visit_id: row.visitId,
        visitor_email: row.visitorEmail,
        visitor_name: row.visitorName,
      };
      sessions.set(row.visitId, session);
    }

    const totalDuration = Number(row.totalDuration ?? 0);

    session.tracked_duration += totalDuration;
    session.page_analytics.push({
      last_viewed_at: toIsoString(row.lastViewedAt),
      page_number: row.pageNumber,
      total_duration: totalDuration,
      total_views: Number(row.totalViews ?? 0),
    });
  }

  return Array.from(sessions.values()).map((session) => ({
    ...session,
    page_analytics: session.page_analytics.sort((left, right) => left.page_number - right.page_number),
  }));
}
