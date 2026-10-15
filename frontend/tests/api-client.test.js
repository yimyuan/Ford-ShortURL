import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, ApiError } from '../src/shared/api/client.js';

const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const expired = () => json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, 401);

test('login sends credentials as JSON with cookie transport and preserves real API errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, '/api/auth/login');
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), {
      email: 'test@example.com',
      password: 'test-password',
    });
    return json({ error: { code: 'INVALID_LOGIN', message: 'Invalid login' } }, 401);
  });
  await assert.rejects(
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'test-password' },
      skipRefresh: true,
    }),
    (error) => error instanceof ApiError && error.code === 'INVALID_LOGIN' && error.status === 401,
  );
});

test('simultaneous protected requests share one refresh and retry with current cookies', async (t) => {
  let authenticated = false;
  let refreshCount = 0;
  t.mock.method(globalThis, 'fetch', async (path) => {
    if (path === '/api/auth/refresh') {
      refreshCount++;
      authenticated = true;
      return json({ user: { id: 'u', role: 'admin' } });
    }
    return authenticated ? json({ items: [] }) : expired();
  });
  const results = await Promise.all([
    apiRequest('/api/admin/users'),
    apiRequest('/api/admin/links'),
  ]);
  assert.deepEqual(results, [{ items: [] }, { items: [] }]);
  assert.equal(refreshCount, 1);
});

test('cross-tab refresh lock rechecks shared session before rotating again', async (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let locks = 0;
  let refreshCount = 0;
  let firstRequest = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      locks: {
        async request(name, work) {
          assert.equal(name, 'shorturl.session-refresh');
          locks++;
          return work();
        },
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete globalThis.navigator;
  });
  t.mock.method(globalThis, 'fetch', async (path) => {
    if (path === '/api/auth/refresh') refreshCount++;
    if (path === '/api/admin/users' && firstRequest) {
      firstRequest = false;
      return expired();
    }
    return json(path === '/api/auth/me' ? { user: { id: 'u' } } : { items: [] });
  });
  assert.deepEqual(await apiRequest('/api/admin/users'), { items: [] });
  assert.equal(locks, 1);
  assert.equal(refreshCount, 0);
});

test('expired refresh fails once, logout204 is accepted, malformed success is rejected', async (t) => {
  let refreshes = 0;
  t.mock.method(globalThis, 'fetch', async (path) => {
    if (path === '/api/auth/logout') return new Response(null, { status: 204 });
    if (path === '/malformed') return new Response('not-json');
    if (path === '/api/auth/refresh') refreshes++;
    return expired();
  });
  await assert.rejects(apiRequest('/api/admin/users'), { status: 401 });
  assert.equal(refreshes, 1);
  assert.equal(
    await apiRequest('/api/auth/logout', { method: 'POST', body: {}, skipRefresh: true }),
    null,
  );
  await assert.rejects(apiRequest('/malformed'), { status: 502, code: 'INVALID_RESPONSE' });
});

test('QR downloads retain blob response type after refreshing an expired session', async (t) => {
  let authenticated = false;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  t.mock.method(globalThis, 'fetch', async (path) => {
    if (path === '/api/auth/refresh') {
      authenticated = true;
      return json({ user: { id: 'u' } });
    }
    if (!authenticated) return expired();
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
  });
  const blob = await apiRequest('/api/links/example/qr', { responseType: 'blob' });
  assert.equal(blob.type, 'image/svg+xml');
  assert.equal(await blob.text(), svg);
});
