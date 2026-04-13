import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ValidationError,
  parseDocumentCreateBody,
  parseShareLinkBody,
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

test('parseShareLinkBody enforces password and NDA requirements', () => {
  assert.throws(
    () =>
      parseShareLinkBody({
        document_id: 'doc_123',
        password: 'short',
        require_password: true,
      }),
    ValidationError,
  );

  assert.throws(
    () =>
      parseShareLinkBody({
        document_id: 'doc_123',
        require_nda: true,
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
