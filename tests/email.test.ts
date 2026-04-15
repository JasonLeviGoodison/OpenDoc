import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDocumentViewedEmailContent } from '@/lib/server/email';

test('buildDocumentViewedEmailContent includes the viewer, document, and analytics link', () => {
  const content = buildDocumentViewedEmailContent({
    analyticsUrl: 'https://opendoc.app/documents/doc_123',
    documentName: 'Series A Deck',
    linkName: 'Investor Link',
    ownerName: 'Morgan',
    viewedAt: new Date('2026-04-14T18:30:00.000Z'),
    viewerEmail: 'investor@example.com',
  });

  assert.equal(content.subject, 'Someone viewed your document "Series A Deck"');
  assert.match(content.text, /Hi Morgan,/);
  assert.match(content.text, /investor@example.com viewed your document "Series A Deck"\./);
  assert.match(content.text, /Link: Investor Link/);
  assert.match(content.text, /Analytics: https:\/\/opendoc\.app\/documents\/doc_123/);
  assert.match(content.html, /View Document Analytics/);
});

test('buildDocumentViewedEmailContent escapes HTML and falls back to anonymous viewers', () => {
  const content = buildDocumentViewedEmailContent({
    analyticsUrl: 'https://opendoc.app/documents/doc_999',
    documentName: '<Confidential & Co>',
    linkName: null,
    ownerName: null,
    viewedAt: new Date('2026-04-14T18:30:00.000Z'),
    viewerEmail: null,
  });

  assert.match(content.text, /Anonymous viewed your document "<Confidential & Co>"/);
  assert.match(content.html, /&lt;Confidential &amp; Co&gt;/);
  assert.doesNotMatch(content.html, /<Confidential & Co>/);
});
