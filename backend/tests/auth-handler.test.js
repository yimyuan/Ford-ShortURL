import test from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/modules/auth/auth.service.js';
import * as handler from '../src/modules/auth/auth.handler.js';

function response() {
 return { locals: { input: { email: 'user@example.com', password: 'test-password' } }, cookies: [], cleared: [], headers: {},
  cookie(name, value, options) { this.cookies.push({ name, value, options }); return this; },
  clearCookie(name, options) { this.cleared.push({ name, options }); return this; },
  set(name, value) { this.headers[name] = value; return this; },
  status(value) { this.statusCode = value; return this; },
  json(value) { this.body = value; return this; },
  sendStatus(value) { this.statusCode = value; return this; } };
}

test('login handler sends HttpOnly scoped cookies and exposes only the safe user DTO', async t => {
 const user = { id: 'u', email: 'user@example.com', role: 'admin', isActive: true };
 t.mock.method(authService, 'login', async input => {
  assert.equal(input.email, 'user@example.com');
  return { user, accessToken: 'private-access', refreshToken: 'private-refresh', refreshExpiresAt: Math.floor(Date.now() / 1000) + 3600 };
 });
 const res = response();
 await handler.login({}, res);
 assert.equal(res.statusCode, 200);
 assert.deepEqual(res.body, { user });
 assert.equal(res.headers['Cache-Control'], 'no-store');
 assert.deepEqual(res.cookies.map(cookie => [cookie.name, cookie.options.path, cookie.options.httpOnly, cookie.options.sameSite]),
  [['shorturl_access', '/api', true, 'strict'], ['shorturl_refresh', '/api/auth', true, 'strict']]);
 assert.equal(JSON.stringify(res.body).includes('private-'), false);
});

test('logout revokes supplied session before clearing both cookie paths', async t => {
 const cookies = { shorturl_refresh: 'session-token' };
 t.mock.method(authService, 'logout', async input => { assert.equal(input, cookies); });
 const res = response();
 await handler.logout({ cookies }, res);
 assert.equal(res.statusCode, 204);
 assert.deepEqual(res.cleared.map(cookie => [cookie.name, cookie.options.path]),
  [['shorturl_access', '/api'], ['shorturl_refresh', '/api/auth']]);
});

test('unavailable session storage does not claim logout succeeded', async t => {
 t.mock.method(authService, 'logout', async () => { throw Object.assign(new Error('Storage unavailable'), { status: 503 }); });
 const res = response();
 await assert.rejects(handler.logout({ cookies: { shorturl_refresh: 'session-token' } }, res), { status: 503 });
 assert.equal(res.statusCode, undefined);
 assert.equal(res.cleared.length, 0);
});
