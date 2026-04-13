import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPreviewFilename,
  buildViewerDocumentPath,
  getInitialDocumentPreviewState,
  getInlineViewerFileType,
  getResolvedDocumentPreviewState,
  getViewerDocumentKind,
  isInlinePreviewFailed,
  isInlinePreviewPending,
  isDocumentViewerFile,
  isPresentationViewerFile,
  isPdfViewerFile,
  isSpreadsheetViewerFile,
  isTrackablePreviewSourceFile,
  resolveViewerToken,
} from '@/lib/viewer';

test('viewer helper detects supported preview kinds', () => {
  assert.equal(isPdfViewerFile('pdf'), true);
  assert.equal(isPdfViewerFile('PDF'), true);
  assert.equal(isPdfViewerFile('pptx'), false);

  assert.equal(isSpreadsheetViewerFile('xlsx'), true);
  assert.equal(isSpreadsheetViewerFile('XLS'), true);
  assert.equal(isSpreadsheetViewerFile('pdf'), false);

  assert.equal(isPresentationViewerFile('pptx'), true);
  assert.equal(isPresentationViewerFile('PPT'), true);

  assert.equal(isDocumentViewerFile('docx'), true);
  assert.equal(isDocumentViewerFile('DOC'), true);
  assert.equal(isTrackablePreviewSourceFile('docx'), true);
  assert.equal(isTrackablePreviewSourceFile('ppt'), true);
  assert.equal(isTrackablePreviewSourceFile('pdf'), false);

  assert.equal(getViewerDocumentKind('pdf'), 'pdf');
  assert.equal(getViewerDocumentKind('xlsx'), 'spreadsheet');
  assert.equal(getViewerDocumentKind('pptx'), 'presentation');
  assert.equal(getViewerDocumentKind('docx'), 'document');
  assert.equal(getViewerDocumentKind('zip'), 'unsupported');
});

test('viewer helper derives trackable preview state and inline file types', () => {
  const recentPreviewUpdate = new Date();
  const stalePreviewUpdate = new Date(Date.now() - 5 * 60_000);

  assert.deepEqual(getInitialDocumentPreviewState('pdf'), {
    previewFileType: 'pdf',
    previewStatus: 'ready',
  });

  assert.deepEqual(getInitialDocumentPreviewState('pptx'), {
    previewFileType: 'pdf',
    previewStatus: 'pending',
  });

  assert.deepEqual(getInitialDocumentPreviewState('zip'), {
    previewFileType: null,
    previewStatus: 'none',
  });

  assert.deepEqual(
    getResolvedDocumentPreviewState({
      fileType: 'pptx',
      previewFileType: null,
      previewStatus: 'none',
    }),
    {
      previewFileType: 'pdf',
      previewStatus: 'pending',
    },
  );

  assert.deepEqual(
    getResolvedDocumentPreviewState({
      fileType: 'pptx',
      previewFileType: 'pdf',
      previewStatus: 'pending',
      previewUpdatedAt: recentPreviewUpdate,
    }),
    {
      previewFileType: 'pdf',
      previewStatus: 'pending',
    },
  );

  assert.deepEqual(
    getResolvedDocumentPreviewState({
      fileType: 'pptx',
      previewFileType: 'pdf',
      previewStatus: 'pending',
      previewUpdatedAt: stalePreviewUpdate,
    }),
    {
      previewFileType: 'pdf',
      previewStatus: 'failed',
    },
  );

  assert.deepEqual(
    getResolvedDocumentPreviewState({
      fileType: 'pptx',
      previewFileType: 'pdf',
      previewStatus: 'pending',
      previewUpdatedAt: null,
    }),
    {
      previewFileType: 'pdf',
      previewStatus: 'failed',
    },
  );

  assert.equal(
    getInlineViewerFileType({
      fileType: 'pptx',
      previewFileType: 'pdf',
      previewStatus: 'ready',
    }),
    'pdf',
  );

  assert.equal(
    getInlineViewerFileType({
      fileType: 'pptx',
      previewFileType: 'pdf',
      previewStatus: 'pending',
    }),
    null,
  );

  assert.equal(
    isInlinePreviewPending({
      fileType: 'pptx',
      previewStatus: 'pending',
      previewUpdatedAt: recentPreviewUpdate,
    }),
    true,
  );

  assert.equal(
    isInlinePreviewFailed({
      fileType: 'pptx',
      previewStatus: 'pending',
      previewUpdatedAt: stalePreviewUpdate,
    }),
    true,
  );

  assert.equal(buildPreviewFilename('Board Deck.pptx'), 'Board Deck.pdf');
  assert.equal(buildPreviewFilename('Deal Room'), 'Deal Room.pdf');
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
