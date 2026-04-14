import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDocumentPageSessionAnalytics } from '@/lib/document-analytics';

test('buildDocumentPageSessionAnalytics groups page timing by visit and sums tracked duration', () => {
  const sessions = buildDocumentPageSessionAnalytics([
    {
      completionRate: 100,
      createdAt: '2026-04-13T10:00:00.000Z',
      lastActivityAt: '2026-04-13T10:03:00.000Z',
      lastViewedAt: '2026-04-13T10:01:00.000Z',
      pageCountViewed: 2,
      pageNumber: 2,
      totalDuration: 18,
      totalViews: 1,
      visitDuration: 24,
      visitId: 'visit-1',
      visitorEmail: 'investor@example.com',
      visitorName: null,
    },
    {
      completionRate: 100,
      createdAt: '2026-04-13T10:00:00.000Z',
      lastActivityAt: '2026-04-13T10:03:00.000Z',
      lastViewedAt: '2026-04-13T10:00:30.000Z',
      pageCountViewed: 2,
      pageNumber: 1,
      totalDuration: 6,
      totalViews: 2,
      visitDuration: 24,
      visitId: 'visit-1',
      visitorEmail: 'investor@example.com',
      visitorName: null,
    },
    {
      completionRate: 50,
      createdAt: '2026-04-13T11:00:00.000Z',
      lastActivityAt: '2026-04-13T11:02:00.000Z',
      lastViewedAt: '2026-04-13T11:01:00.000Z',
      pageCountViewed: 1,
      pageNumber: 1,
      totalDuration: 12,
      totalViews: 1,
      visitDuration: 20,
      visitId: 'visit-2',
      visitorEmail: null,
      visitorName: 'Anonymous viewer',
    },
  ]);

  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].visit_id, 'visit-1');
  assert.equal(sessions[0].tracked_duration, 24);
  assert.deepEqual(
    sessions[0].page_analytics.map((entry) => ({
      page_number: entry.page_number,
      total_duration: entry.total_duration,
      total_views: entry.total_views,
    })),
    [
      { page_number: 1, total_duration: 6, total_views: 2 },
      { page_number: 2, total_duration: 18, total_views: 1 },
    ],
  );
  assert.equal(sessions[1].visit_id, 'visit-2');
  assert.equal(sessions[1].tracked_duration, 12);
  assert.equal(sessions[1].visitor_name, 'Anonymous viewer');
});
