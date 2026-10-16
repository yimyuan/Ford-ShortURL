import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreationIntent } from '../src/features/links/creation-intent.js';
import { createLink } from '../src/features/links/api.js';
test('corrupted or unavailable session storage still produces a valid retry key', () => {
  const corrupted = { getItem: () => '{bad-json', setItem() {}, removeItem() {} };
  assert.match(createCreationIntent(corrupted).key('u', 'https://example.com', ''), /^[a-f0-9-]{36}$/);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const intent = createCreationIntent(blocked);
  assert.equal(intent.key('u', 'url', ''), intent.key('u', 'url', ''));
});
test('lost response and tab reload keep the key; success, changed payload and different owner start a new intent', () => {
  const entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key),
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
  const first = createCreationIntent(storage);
  const key = first.key('user-a', 'https://example.com', 'abc');
  assert.equal(first.key('user-a', 'https://example.com', 'abc'), key);
  const reloaded = createCreationIntent(storage);
  assert.equal(reloaded.key('user-a', 'https://example.com', 'abc'), key);
  assert.notEqual(reloaded.key('user-b', 'https://example.com', 'abc'), key);
  assert.notEqual(first.key('user-a', 'https://example.com', 'def'), key);
  first.clear();
  assert.notEqual(first.key('user-a', 'https://example.com', 'abc'), key);
});
test('creation API sends caller key unchanged on a network retry', async (t) => {
  const headers = [];
  t.mock.method(globalThis, 'fetch', async (_path, options) => {
    headers.push(options.headers['Idempotency-Key']);
    throw new TypeError('network lost');
  });
  const key = crypto.randomUUID();
  await assert.rejects(createLink('https://example.com', '', key));
  await assert.rejects(createLink('https://example.com', '', key));
  assert.deepEqual(headers, [key, key]);
});
