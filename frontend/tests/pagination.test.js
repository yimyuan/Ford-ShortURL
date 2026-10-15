import test from 'node:test';
import assert from 'node:assert/strict';
import { listAdminUsers, listAdminLinks, listAdminHistory } from '../src/features/admin/api.js';
import { readPage } from '../src/shared/api/pagination.js';
test('page changes request only the selected page and preserve database search filters', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (path) => {
    const url = new URL(path, 'https://example.com');
    calls.push(url);
    return new Response(
      JSON.stringify({
        items: [],
        total: 23,
        page: Number(url.searchParams.get('page')),
        pageSize: 10,
      }),
      { status: 200 },
    );
  });
  await listAdminUsers({ page: 1, query: 'abc+tag@example.com', filter: 'admin' });
  assert.equal(calls.length, 1);
  await listAdminUsers({ page: 2, query: 'abc+tag@example.com', filter: 'admin' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].searchParams.get('page'), '2');
  assert.equal(calls[1].searchParams.get('query'), 'abc+tag@example.com');
  assert.equal(calls[1].searchParams.get('filter'), 'admin');
  await listAdminLinks({ page: 3, query: 'https://example.com/?a=1&b=2', filter: 'active' });
  assert.equal(calls[2].searchParams.get('query'), 'https://example.com/?a=1&b=2');
  await listAdminHistory({ page: 2, action: 'delete_user' });
  assert.equal(calls[3].searchParams.get('action'), 'delete_user');
});
test('paged response validation rejects overfetching and invalid pagination metadata', () => {
  for (const data of [
    { items: Array(11).fill({}), total: 11, page: 1, pageSize: 10 },
    { items: [], total: 10, page: 1, pageSize: 1000 },
    { items: [], total: -1, page: 1, pageSize: 10 },
    { items: [], total: 1, page: 0, pageSize: 10 },
  ])
    assert.throws(() => readPage(data), { code: 'INVALID_RESPONSE' });
  for (const total of [0, 9, 10, 11, 23])
    assert.equal(readPage({ items: [], total, page: 1, pageSize: 10 }).total, total);
});
