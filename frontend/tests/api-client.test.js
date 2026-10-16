import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, apiOrigin, ApiError } from '../src/shared/api/client.js';
import {
  setAccessToken,
  getAccessToken,
  clearAccessToken,
  onSessionExpired,
} from '../src/shared/api/session.js';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
test('API sends bearer token from memory and never includes browser cookies', async (t) => {
  setAccessToken('memory-token', Math.floor(Date.now() / 1000) + 60);
  t.after(clearAccessToken);
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, '/api/links');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.Authorization, 'Bearer memory-token');
    return json({ items: [] });
  });
  assert.deepEqual(await apiRequest('/api/links'), { items: [] });
});
test('401 clears this session and never refreshes or retries the request', async (t) => {
  let calls = 0,
    expired = 0;
  setAccessToken('expired-token', Math.floor(Date.now() / 1000) + 60);
  const stop = onSessionExpired(() => expired++);
  t.after(stop);
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return json({ error: { code: 'UNAUTHENTICATED' } }, 401);
  });
  await assert.rejects(
    apiRequest('/api/auth/me'),
    (error) => error instanceof ApiError && error.status === 401,
  );
  assert.equal(calls, 1);
  assert.equal(expired, 1);
  assert.equal(getAccessToken(), null);
});
test('token expiry and fresh module start are anonymous; login request omits previous bearer', async (t) => {
  const fresh = await import('../src/shared/api/session.js?fresh-page');
  assert.equal(fresh.getAccessToken(), null);
  setAccessToken('old', Math.floor(Date.now() / 1000) - 1);
  assert.equal(getAccessToken(), null);
  setAccessToken('current', Math.floor(Date.now() / 1000) + 60);
  t.after(clearAccessToken);
  t.mock.method(globalThis, 'fetch', async (_path, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return json({ error: { code: 'INVALID_LOGIN' } }, 401);
  });
  await assert.rejects(apiRequest('/api/auth/login', { auth: false, method: 'POST', body: {} }), {
    code: 'INVALID_LOGIN',
  });
});
test('QR stays binary, 204 is accepted, malformed responses and unsafe origins fail', async (t) => {
  t.mock.method(globalThis, 'fetch', async (path) =>
    path.includes('/qr')
      ? new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } })
      : path.endsWith('/logout')
        ? new Response(null, { status: 204 })
        : new Response('bad'),
  );
  assert.equal(
    await (await apiRequest('/api/links/id/qr', { responseType: 'blob' })).text(),
    '<svg/>',
  );
  assert.equal(await apiRequest('/api/auth/logout', { method: 'POST', body: {} }), null);
  await assert.rejects(apiRequest('/api/malformed'), { code: 'INVALID_RESPONSE' });
  for (const origin of [
    'http://evil.example',
    'https://user:pass@example.com',
    'https://example.com/api',
  ])
    assert.throws(() => apiOrigin(origin));
  assert.equal(apiOrigin('https://backend.onrender.com'), 'https://backend.onrender.com');
});
