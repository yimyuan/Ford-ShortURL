import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAdminUsers,
  parseAdminLinks,
  searchPattern,
} from '../src/modules/admin/admin-query.js';
import { parseLinkPage } from '../src/modules/links/links.dto.js';
import { parseAuditQuery } from '../src/modules/admin/admin.dto.js';
import { createUsersRepository } from '../src/modules/users/users.repository.js';
import { createLinksRepository } from '../src/modules/links/links.repository.js';
import { createAdminRepository } from '../src/modules/admin/admin.repository.js';
import { createAdminService } from '../src/modules/admin/admin.service.js';

function database(rows = []) {
  const calls = [];
  const query = {};
  for (const method of ['select', 'order', 'eq', 'ilike', 'or', 'gte', 'lt', 'range'])
    query[method] = (...args) => {
      calls.push([method, ...args]);
      return query;
    };
  query.abortSignal = async () => ({ data: rows, error: null, count: 43 });
  return {
    calls,
    from: () => query,
    rpc: (...args) => {
      calls.push(['rpc', ...args]);
      return query;
    },
  };
}
test('all table APIs fix their page size at ten and reject invalid or client-selected sizes', () => {
  for (const parse of [parseAdminUsers, parseAdminLinks, parseLinkPage]) {
    assert.equal(parse({}).pageSize, 10);
    assert.equal(parse({ page: '2' }).page, 2);
    for (const input of [
      { page: '0' },
      { page: '-1' },
      { page: '1.2' },
      { page: ['1', '2'] },
      { pageSize: '1000' },
      { page: '9999999' },
    ])
      assert.throws(() => parse(input), { status: 422 });
  }
  assert.equal(
    parseAdminUsers({ filter: 'admin', query: ' root@example.com ' }).query,
    'root@example.com',
  );
  assert.throws(() => parseAdminLinks({ filter: 'admin' }), { status: 422 });
  assert.throws(() => parseAdminUsers({ query: { value: 'x' } }), { status: 422 });
  for (const input of [{ page: ['2'] }, { page: '0' }, { page: '1.2' }, { pageSize: '1000' }])
    assert.throws(() => parseAuditQuery(input), { status: 422 });
});
test('user pages request only ten rows, exact filtered totals and primary-admin order before the range', async () => {
  const db = database();
  const repo = createUsersRepository(db);
  const a = await repo.list({ page: 1, query: 'user@example.com', filter: 'active' });
  assert.deepEqual(
    db.calls.find((call) => call[0] === 'range'),
    ['range', 0, 9],
  );
  assert.deepEqual(
    db.calls.filter((call) => call[0] === 'order').map((call) => call[1]),
    ['is_primary_admin', 'created_at', 'id'],
  );
  assert.ok(
    db.calls.some((call) => call[0] === 'eq' && call[1] === 'is_active' && call[2] === true),
  );
  assert.ok(
    db.calls.some(
      (call) => call[0] === 'ilike' && call[1] === 'email' && call[2] === '%user@example.com%',
    ),
  );
  assert.deepEqual(
    { total: a.total, page: a.page, pageSize: a.pageSize },
    { total: 43, page: 1, pageSize: 10 },
  );
  db.calls.length = 0;
  await repo.list({ page: 2, filter: 'user' });
  assert.deepEqual(
    db.calls.find((call) => call[0] === 'range'),
    ['range', 10, 19],
  );
  assert.ok(db.calls.some((call) => call[0] === 'eq' && call[1] === 'role' && call[2] === 'user'));
});
test('link search is performed in the database across URL and code, including safely quoted URL punctuation', async () => {
  const db = database();
  const search = 'https://example.com/a,b?x="z"&n=100%_';
  const result = await createLinksRepository(db).list({
    page: 3,
    query: search,
    filter: 'inactive',
  });
  assert.deepEqual(
    db.calls.find((call) => call[0] === 'range'),
    ['range', 20, 29],
  );
  const expression = db.calls.find((call) => call[0] === 'or')[1];
  const pattern = JSON.stringify(searchPattern(search));
  assert.equal(expression, `original_url.ilike.${pattern},short_code.ilike.${pattern}`);
  assert.ok(
    db.calls.some((call) => call[0] === 'eq' && call[1] === 'is_active' && call[2] === false),
  );
  assert.equal(result.total, 43);
  assert.equal(result.pageSize, 10);
});
test('audit history fetches ten rows per page with dates, action and search applied before pagination', async () => {
  const db = database();
  const data = await createAdminRepository(db).history({
    page: 2,
    action: 'suspend',
    query: 'admin@example.com',
    from: '2026-10-01',
    to: '2026-10-16',
  });
  assert.deepEqual(
    db.calls.find((call) => call[0] === 'range'),
    ['range', 10, 19],
  );
  assert.ok(
    db.calls.some((call) => call[0] === 'eq' && call[1] === 'action' && call[2] === 'suspend'),
  );
  assert.equal(data.pageSize, 10);
  assert.equal(data.total, 43);
  assert.ok(
    db.calls.findIndex((call) => call[0] === 'gte') <
      db.calls.findIndex((call) => call[0] === 'range'),
  );
});
test('summary checks admin authorization without loading every user or link row', async () => {
  let actor;
  const service = createAdminService(
    { list: () => assert.fail('must not load users') },
    { list: () => assert.fail('must not load links') },
    {
      summary: async (id) => {
        actor = id;
        return { users: '43', admins: '2', links: '200', clicks: '9007199254740993' };
      },
    },
  );
  await assert.rejects(service.summary({ id: 'user', role: 'user' }), { status: 403 });
  assert.equal(actor, undefined);
  const data = await service.summary({ id: 'admin', role: 'admin' });
  assert.equal(actor, 'admin');
  assert.equal(data.clicks, '9007199254740993');
});
