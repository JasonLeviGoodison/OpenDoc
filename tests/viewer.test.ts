import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildViewerDocumentPath,
  getViewerDocumentKind,
  isDocumentViewerFile,
  isPresentationViewerFile,
  isPdfViewerFile,
  isRenderableDocumentViewerFile,
  isRenderablePresentationViewerFile,
  isSpreadsheetViewerFile,
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
  assert.equal(isRenderablePresentationViewerFile('pptx'), true);
  assert.equal(isRenderablePresentationViewerFile('ppt'), false);

  assert.equal(isDocumentViewerFile('docx'), true);
  assert.equal(isDocumentViewerFile('DOC'), true);
  assert.equal(isRenderableDocumentViewerFile('docx'), true);
  assert.equal(isRenderableDocumentViewerFile('doc'), false);

  assert.equal(getViewerDocumentKind('pdf'), 'pdf');
  assert.equal(getViewerDocumentKind('xlsx'), 'spreadsheet');
  assert.equal(getViewerDocumentKind('pptx'), 'presentation');
  assert.equal(getViewerDocumentKind('docx'), 'document');
  assert.equal(getViewerDocumentKind('zip'), 'unsupported');
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
