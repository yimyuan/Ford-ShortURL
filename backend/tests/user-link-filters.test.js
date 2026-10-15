import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLinkPage } from '../src/modules/links/links.dto.js';
import { createLinksRepository } from '../src/modules/links/links.repository.js';
test('user history accepts only bounded page/search and supported filters without owner or page-size injection', () => {
  assert.deepEqual(
    parseLinkPage({ page: '2', query: ' sale ', clicks: 'opened', period: '7d', sort: 'clicks' }),
    { page: 2, pageSize: 10, query: 'sale', clicks: 'opened', period: '7d', sort: 'clicks' },
  );
  for (const query of [
    { userId: 'other' },
    { pageSize: '1000' },
    { clicks: ['opened'] },
    { period: '365d' },
    { sort: 'password_hash' },
    { query: 'a'.repeat(8193) },
    { query: ['url'] },
    { page: '0' },
  ])
    assert.throws(() => parseLinkPage(query), { status: 422 });
});
test('history filtering is one scoped aggregate RPC, not filtering a previously fetched page', async () => {
  let captured;
  const repo = createLinksRepository({
    rpc(name, args) {
      captured = { name, args };
      return {
        abortSignal: async () => ({
          data: { items: [], total: 0, page: 2, pageSize: 10 },
          error: null,
        }),
      };
    },
  });
  const result = await repo.listByUser('verified-user', {
    page: 2,
    pageSize: 10,
    query: '_%',
    clicks: 'unopened',
    period: '30d',
    sort: 'oldest',
  });
  assert.equal(result.pageSize, 10);
  assert.deepEqual(captured, {
    name: 'user_link_history',
    args: {
      p_actor: 'verified-user',
      p_page: 2,
      p_query: '_%',
      p_clicks: 'unopened',
      p_period: '30d',
      p_sort: 'oldest',
    },
  });
});
