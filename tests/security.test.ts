import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSignedToken,
  hashPassword,
  MissingTokenSecretError,
  verifyPassword,
  verifyPasswordRecord,
  verifySignedToken,
} from '@/lib/security';

const originalTokenSecret = process.env.OPENDOC_TOKEN_SECRET;
const originalClerkSecret = process.env.CLERK_SECRET_KEY;

process.env.OPENDOC_TOKEN_SECRET = 'test-opendoc-token-secret';

test.after(() => {
  if (originalTokenSecret === undefined) {
    delete process.env.OPENDOC_TOKEN_SECRET;
  } else {
    process.env.OPENDOC_TOKEN_SECRET = originalTokenSecret;
  }

  if (originalClerkSecret === undefined) {
    delete process.env.CLERK_SECRET_KEY;
  } else {
    process.env.CLERK_SECRET_KEY = originalClerkSecret;
  }
});

test('hashPassword stores a derived hash and verifies it', () => {
  const password = 'correct horse battery staple';
  const hashedPassword = hashPassword(password);

  assert.notEqual(hashedPassword, password);
  assert.ok(verifyPassword(password, hashedPassword));
  assert.equal(verifyPassword('wrong-password', hashedPassword), false);
});

test('verifyPassword upgrades legacy plaintext values during migration', () => {
  const result = verifyPasswordRecord('legacy-secret', 'legacy-secret');

  assert.equal(result.isValid, true);
  assert.equal(result.needsRehash, true);
  assert.ok(result.upgradedHash);
  assert.equal(verifyPassword('legacy-secret', result.upgradedHash), true);
  assert.equal(verifyPassword('different-secret', 'legacy-secret'), false);
});

test('signed tokens round-trip and reject tampering', () => {
  const token = createSignedToken({
    linkId: 'public-link-123',
    scope: 'viewer',
  });

  const payload = verifySignedToken(token);

  assert.ok(payload);
  assert.equal(payload?.linkId, 'public-link-123');
  assert.equal(payload?.scope, 'viewer');

  const [body, signature] = token.split('.');
  const tamperedToken = `${body}.tampered${signature}`;

  assert.equal(verifySignedToken(tamperedToken), null);
});

test('signed tokens expire', async () => {
  const token = createSignedToken(
    {
      linkId: 'short-lived-link',
      scope: 'visit',
      visitId: 'visit-123',
    },
    5,
  );

  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.equal(verifySignedToken(token), null);
});

test('signed tokens fail closed without a configured secret', () => {
  delete process.env.OPENDOC_TOKEN_SECRET;
  delete process.env.CLERK_SECRET_KEY;

  assert.throws(
    () =>
      createSignedToken({
        linkId: 'missing-secret',
        scope: 'viewer',
      }),
    MissingTokenSecretError,
  );

  process.env.OPENDOC_TOKEN_SECRET = 'test-opendoc-token-secret';
});
