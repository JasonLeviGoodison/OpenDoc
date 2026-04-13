import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLinkAvailability,
  isEmailAuthorized,
  normalizeEmail,
  splitList,
} from '@/lib/link-access';

test('splitList normalizes comma-separated values', () => {
  assert.deepEqual(splitList(' Alpha@Example.com, beta@example.com ,, GAMMA.io '), [
    'alpha@example.com',
    'beta@example.com',
    'gamma.io',
  ]);
});

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Founder@Fund.com '), 'founder@fund.com');
});

test('blocked emails and domains take precedence over allow lists', () => {
  const link = {
    allowedDomains: ['fund.com'],
    allowedEmails: ['vip@fund.com'],
    blockedDomains: ['blocked.fund.com'],
    blockedEmails: ['vip@fund.com'],
  };

  assert.equal(isEmailAuthorized(link, 'associate@fund.com'), true);
  assert.equal(isEmailAuthorized(link, 'vip@fund.com'), false);
  assert.equal(isEmailAuthorized(link, 'user@blocked.fund.com'), false);
});

test('email authorization requires an allow-list match when configured', () => {
  const link = {
    allowedDomains: ['fund.com'],
    allowedEmails: [],
    blockedDomains: [],
    blockedEmails: [],
  };

  assert.equal(isEmailAuthorized(link, 'partner@fund.com'), true);
  assert.equal(isEmailAuthorized(link, 'partner@other.com'), false);
});

test('link availability reflects active and expiration state', () => {
  assert.equal(getLinkAvailability({ isActive: false }), 'disabled');
  assert.equal(
    getLinkAvailability({ expiresAt: new Date(Date.now() - 60_000).toISOString() }),
    'expired',
  );
  assert.equal(
    getLinkAvailability({ expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    'available',
  );
});
