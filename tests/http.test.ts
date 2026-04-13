import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContentDisposition } from '@/lib/http';

test('buildContentDisposition strips unsafe characters and keeps a UTF-8 filename', () => {
  const header = buildContentDisposition('attachment', ' pitch";deck\r\n2026.pdf ');

  assert.equal(header.includes('\r'), false);
  assert.equal(header.includes('\n'), false);
  assert.match(header, /^attachment; filename="pitchdeck2026\.pdf"; filename\*=UTF-8''pitchdeck2026\.pdf$/);
});

test('buildContentDisposition preserves non-ascii names through filename*', () => {
  const header = buildContentDisposition('inline', 'München investor deck.pdf');

  assert.match(header, /^inline; filename="Munchen investor deck\.pdf"; filename\*=UTF-8''M%C3%BCnchen%20investor%20deck\.pdf$/);
});
