import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseCheckoutBody,
  ValidationError,
  parseDocumentCreateBody,
  parsePageViewBody,
  parseShareLinkBody,
  parseUploadRequestBody,
  parseVisitPatchBody,
} from '@/lib/validators';

test('parseDocumentCreateBody rejects absolute file URLs', () => {
  assert.throws(
    () =>
      parseDocumentCreateBody({
        file_size: 10,
        file_type: 'pdf',
        file_url: 'https://169.254.169.254/latest/meta-data',
        name: 'Deck',
        original_filename: 'deck.pdf',
        page_count: 1,
      }),
    ValidationError,
  );
});

test('parseUploadRequestBody requires a filename and preserves metadata', () => {
  const parsed = parseUploadRequestBody({
    content_type: 'application/pdf',
    file_name: 'deck.pdf',
    file_size: 12345,
  });

  assert.deepEqual(parsed, {
    contentType: 'application/pdf',
    fileName: 'deck.pdf',
    fileSize: 12345,
  });
});

test('parseCheckoutBody requires a priceId string', () => {
  const parsed = parseCheckoutBody({
    priceId: 'price_123',
  });

  assert.deepEqual(parsed, {
    priceId: 'price_123',
  });

  assert.throws(
    () =>
      parseCheckoutBody({
        priceId: '',
      }),
    ValidationError,
  );
});

test('parseShareLinkBody normalizes access lists and accepts document links', () => {
  const parsed = parseShareLinkBody({
    allowed_domains: ['Investor.com', '  DILIGENCE.IO '],
    allowed_emails: ['Founder@Fund.com'],
    document_id: 'doc_123',
    require_email: true,
  });

  assert.equal(parsed.documentId, 'doc_123');
  assert.deepEqual(parsed.allowedDomains, ['investor.com', 'diligence.io']);
  assert.deepEqual(parsed.allowedEmails, ['founder@fund.com']);
});

test('parseShareLinkBody rejects conflicting targets', () => {
  assert.throws(
    () =>
      parseShareLinkBody({
        document_id: 'doc_123',
        space_id: 'space_123',
      }),
    ValidationError,
  );
});

test('parseShareLinkBody enforces password requirements', () => {
  assert.throws(
    () =>
      parseShareLinkBody({
        document_id: 'doc_123',
        password: 'short',
        require_password: true,
      }),
    ValidationError,
  );
});

test('parseVisitPatchBody preserves omitted fields', () => {
  const parsed = parseVisitPatchBody({
    completion_rate: 88,
  });

  assert.deepEqual(parsed, {
    completionRate: 88,
  });
});

test('parsePageViewBody accepts valid page timing payloads', () => {
  const parsed = parsePageViewBody({
    document_id: 'doc_123',
    duration: 4.25,
    page_number: 3,
    visit_id: 'visit_123',
  });

  assert.deepEqual(parsed, {
    documentId: 'doc_123',
    duration: 4.25,
    pageNumber: 3,
    visitId: 'visit_123',
  });
});

test('parsePageViewBody rejects negative durations', () => {
  assert.throws(
    () =>
      parsePageViewBody({
        document_id: 'doc_123',
        duration: -1,
        page_number: 1,
        visit_id: 'visit_123',
      }),
    ValidationError,
  );
});
