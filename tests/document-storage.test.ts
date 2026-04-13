import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAcceptedStoredFileUrl,
  isAllowedLegacyPublicStorageUrl,
  isStorageObjectPath,
} from '@/lib/document-storage';

test('isStorageObjectPath accepts opaque bucket object keys', () => {
  assert.equal(isStorageObjectPath('user_123/550e8400-e29b-41d4-a716-446655440000.pdf'), true);
});

test('isStorageObjectPath rejects absolute URLs and traversal-like values', () => {
  assert.equal(isStorageObjectPath('https://169.254.169.254/latest/meta-data'), false);
  assert.equal(isStorageObjectPath('/documents/file.pdf'), false);
  assert.equal(isStorageObjectPath('../secrets.txt'), false);
  assert.equal(isStorageObjectPath('user_123/../../secrets.txt'), false);
});

test('isAllowedLegacyPublicStorageUrl only allows Supabase public document URLs', () => {
  const supabaseOrigin = 'https://project-ref.supabase.co';

  assert.equal(
    isAllowedLegacyPublicStorageUrl(
      'https://project-ref.supabase.co/storage/v1/object/public/documents/user_123/file.pdf',
      supabaseOrigin,
    ),
    true,
  );

  assert.equal(
    isAllowedLegacyPublicStorageUrl(
      'https://evil.example.com/storage/v1/object/public/documents/user_123/file.pdf',
      supabaseOrigin,
    ),
    false,
  );

  assert.equal(
    isAllowedLegacyPublicStorageUrl(
      'https://project-ref.supabase.co/storage/v1/object/public/avatars/user_123/file.pdf',
      supabaseOrigin,
    ),
    false,
  );
});

test('isAcceptedStoredFileUrl rejects arbitrary external URLs', () => {
  assert.equal(
    isAcceptedStoredFileUrl(
      'https://169.254.169.254/latest/meta-data',
      'https://project-ref.supabase.co',
    ),
    false,
  );
});
