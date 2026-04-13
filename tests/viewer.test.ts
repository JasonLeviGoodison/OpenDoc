import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOfficeEmbedUrl,
  buildViewerDocumentPath,
  isOfficeEmbedViewerFile,
  isPdfViewerFile,
  resolveViewerToken,
} from '@/lib/viewer';

test('viewer helper detects pdf and office preview types', () => {
  assert.equal(isPdfViewerFile('pdf'), true);
  assert.equal(isPdfViewerFile('PDF'), true);
  assert.equal(isPdfViewerFile('pptx'), false);

  assert.equal(isOfficeEmbedViewerFile('pptx'), true);
  assert.equal(isOfficeEmbedViewerFile('DOC'), true);
  assert.equal(isOfficeEmbedViewerFile('pdf'), false);
});

test('viewer helper builds gated document paths with optional flags', () => {
  assert.equal(
    buildViewerDocumentPath({
      documentId: 'doc-123',
      linkId: 'link-456',
    }),
    '/api/links/link-456/document?documentId=doc-123',
  );

  assert.equal(
    buildViewerDocumentPath({
      documentId: 'doc-123',
      download: true,
      linkId: 'link-456',
      token: 'viewer.token',
    }),
    '/api/links/link-456/document?documentId=doc-123&download=1&token=viewer.token',
  );
});

test('viewer helper encodes office embed source urls', () => {
  const sourceUrl = 'https://example.com/api/links/link-456/document?documentId=doc-123&token=viewer.token';

  assert.equal(
    buildOfficeEmbedUrl(sourceUrl),
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(sourceUrl)}`,
  );
});

test('viewer token resolution prefers cookie, then header, then query', () => {
  assert.equal(
    resolveViewerToken({
      cookieToken: 'cookie-token',
      headerToken: 'header-token',
      queryToken: 'query-token',
    }),
    'cookie-token',
  );

  assert.equal(
    resolveViewerToken({
      headerToken: 'header-token',
      queryToken: 'query-token',
    }),
    'header-token',
  );

  assert.equal(
    resolveViewerToken({
      queryToken: 'query-token',
    }),
    'query-token',
  );
});
