import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateUser, getCurrentUser } from '../src/features/auth/api.js';
import { createLink, listLinks, getLinkQr } from '../src/features/links/api.js';
import { listAdminUsers, getAdminSummary } from '../src/features/admin/api.js';
import { validateOriginalUrl, validateCustomCode } from '../src/features/links/validation.js';
import { linkErrorMessage } from '../src/features/links/link-errors.js';
import { getAdminMetrics } from '../src/features/admin/metrics.js';

const link = {
  id: 'link-id',
  shortCode: 'Abc12345',
  shortUrl: 'https://short.example/r/Abc12345',
  originalUrl: 'https://example.com/',
  clickCount: '9007199254740993',
  createdAt: '2026-10-15T00:00:00Z',
};
const json = (body) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

test('custom names preserve case, reach the create API and keep duplicate-name errors actionable', async (t) => {
  assert.equal(validateCustomCode(' Summer-sale '), 'Summer-sale');
  assert.equal(validateCustomCode(' '), '');
  for (const name of ['ab', '-sale', 'sale-', 'ไทย', 'a b', 'a'.repeat(41)]) {
    assert.throws(() => validateCustomCode(name));
  }
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, '/api/links');
    assert.deepEqual(JSON.parse(options.body), { originalUrl: link.originalUrl, customCode: 'Summer-sale' });
    return json({ ...link, shortCode: 'Summer-sale', shortUrl: 'https://short.example/r/Summer-sale' });
  });
  assert.equal((await createLink(link.originalUrl, validateCustomCode(' Summer-sale '))).shortCode, 'Summer-sale');
  assert.match(linkErrorMessage({ status: 409, code: 'CUSTOM_CODE_TAKEN' }), /เลือกชื่ออื่น/);
});

test('feature APIs share cookie transport and retain link, history and QR response contracts', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    calls.push({ path, options });
    if (path.endsWith('/qr'))
      return new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } });
    return json(
      options.method === 'POST' ? link : { items: [link], total: 21, page: 2, pageSize: 10 },
    );
  });
  assert.equal((await createLink('https://example.com/')).shortUrl, link.shortUrl);
  assert.deepEqual(JSON.parse(calls[0].options.body), { originalUrl: 'https://example.com/' });
  assert.equal((await listLinks(2)).items[0].clickCount, '9007199254740993');
  assert.equal(calls[1].path, '/api/links?page=2');
  assert.equal(await (await getLinkQr('link-id')).text(), '<svg/>');
  assert.ok(calls.every((call) => call.options.credentials === 'include'));
});

test('invalid service responses fail before reaching UI components', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    json({ items: [{}], total: 1, page: 1, pageSize: 10 }),
  );
  await assert.rejects(listLinks(1), { code: 'INVALID_RESPONSE' });
  await assert.rejects(createLink('https://example.com'), { code: 'INVALID_RESPONSE' });
  t.mock.method(globalThis, 'fetch', async () =>
    json({ user: { id: 'u', email: 'u@example.com', role: 'owner' } }),
  );
  await assert.rejects(getCurrentUser(), { code: 'INVALID_RESPONSE' });
});

test('auth API normalizes HTTP shape while preserving account role from the verified response', async (t) => {
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, '/api/auth/login');
    assert.deepEqual(JSON.parse(options.body), {
      email: 'admin@example.com',
      password: 'test-password',
    });
    return json({ user: { id: 'a', email: 'admin@example.com', role: 'admin', isActive: true } });
  });
  assert.equal(
    (await authenticateUser('login', { email: 'admin@example.com', password: 'test-password' }))
      .role,
    'admin',
  );
});

test('admin API validates its envelope; metrics never present partial totals as complete', async (t) => {
  t.mock.method(globalThis, 'fetch', async (path) => {
    if (path === '/api/admin/summary')
      return json({
        users: '1001',
        admins: '7',
        links: '123',
        clicks: '9007199254740993',
        usersActive: '1000',
        usersSuspended: '1',
        linksActive: '100',
        linksDisabled: '20',
        linksOwnerSuspended: '3',
        usersToday: '2',
        linksToday: '5',
        today: '2026-10-16',
        timezone: 'Asia/Bangkok',
      });
    assert.equal(path, '/api/admin/users?page=1');
    return json({ items: [{ id: 'a', role: 'admin' }], total: 1001, page: 1, pageSize: 10 });
  });
  const users = await listAdminUsers();
  assert.equal(users.total, 1001);
  assert.equal(users.items.length, 1);
  const metrics = getAdminMetrics({ status: 'ready', data: await getAdminSummary() });
  assert.equal(metrics[3].value, 7n);
  assert.equal(metrics[2].value, 9007199254740993n);
  assert.equal(getAdminMetrics({ status: 'loading', data: null })[2].value, null);
});

test('shared URL validation rejects unsafe schemes and embedded credentials', () => {
  assert.equal(validateOriginalUrl(' https://example.com/ '), 'https://example.com/');
  for (const url of ['javascript:alert(1)', 'https://user:pass@example.com/', 'not a URL']) {
    assert.throws(() => validateOriginalUrl(url));
  }
});
