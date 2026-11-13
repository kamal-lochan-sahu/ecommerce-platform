// Round 5 Group 8C-2: simple text of Store Pages -> safe blocks, and the image fallback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePolicyText } from '../src/utils/policyText.js';
import { PLACEHOLDER_IMAGE, onImageError } from '../src/utils/imageFallback.js';

test('policy text: headings, paragraphs, bullet lists, blank lines', () => {
  const blocks = parsePolicyText('## Orders\nWe confirm orders.\nPlease wait.\n\nSecond paragraph\n\n- one\n- two\nafter list\n\n\n## Last');
  assert.deepEqual(blocks, [
    { type: 'h', text: 'Orders' },
    { type: 'p', text: 'We confirm orders.\nPlease wait.' },
    { type: 'p', text: 'Second paragraph' },
    { type: 'ul', items: ['one', 'two'] },
    { type: 'p', text: 'after list' },
    { type: 'h', text: 'Last' },
  ]);
});

test('policy text: empty input, Windows line endings, and html stays plain text', () => {
  assert.deepEqual(parsePolicyText(''), []);
  assert.deepEqual(parsePolicyText(undefined), []);
  assert.deepEqual(parsePolicyText('## A\r\nB\r\n'), [{ type: 'h', text: 'A' }, { type: 'p', text: 'B' }]);
  assert.deepEqual(parsePolicyText('<script>alert(1)</script>'), [{ type: 'p', text: '<script>alert(1)</script>' }]);
});

test('image fallback: replaces a broken image once, no error loop', () => {
  const img = { src: 'https://dead.example/x.jpg', onerror: () => {}, removed: [], removeAttribute(n) { this.removed.push(n); } };
  onImageError({ currentTarget: img });
  assert.equal(img.src, PLACEHOLDER_IMAGE);
  assert.equal(img.onerror, null);
  assert.deepEqual(img.removed, ['srcset']);
  assert.ok(PLACEHOLDER_IMAGE.startsWith('data:image/svg+xml'));
});
