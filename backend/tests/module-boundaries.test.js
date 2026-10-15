import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthenticate } from '../src/middleware/authenticate.js';
import { authorize } from '../src/middleware/authorize.js';
import { createCsrfMiddleware } from '../src/middleware/csrf.js';
import { createRateLimitMiddleware } from '../src/middleware/rate-limit.js';
import { parseCredentials } from '../src/modules/auth/auth.dto.js';
import { parseCreateLink } from '../src/modules/links/links.dto.js';
import { toUserDto } from '../src/modules/users/users.dto.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { createAccessTokenCodec } from '../src/security/access-token.js';

async function errorFrom(middleware, req) {
 let result;
 await middleware(req, {}, error => { result = error; });
 return result;
}

test('authentication scaffold fails closed and never trusts an unverified bearer token', async () => {
 assert.equal((await errorFrom(createAuthenticate(), { get: () => '' })).status, 401);
 assert.equal((await errorFrom(createAuthenticate(), { get: () => 'Bearer arbitrary-token' })).status, 503);
 const req = { get: () => 'Bearer verified-token' };
 assert.equal(await errorFrom(createAuthenticate(async () => ({ id: 'id', role: 'user' })), req), undefined);
 assert.deepEqual(req.user, { id: 'id', role: 'user' });
 assert.equal((await errorFrom(authorize('admin'), req)).status, 403);
});

test('credential and link DTOs reject role/ownership injection and unsafe URLs', () => {
 assert.throws(() => parseCredentials({ email: 'a@example.com', password: 'pass', role: 'admin' }), { status: 422 });
 assert.throws(() => parseCreateLink({ originalUrl: 'https://example.com', userId: 'other-user' }), { status: 422 });
 for (const originalUrl of ['javascript:alert(1)', 'file:///secret', 'https://user:pass@example.com']) {
  assert.throws(() => parseCreateLink({ originalUrl }), { status: 422 });
 }
 assert.equal(parseCreateLink({ originalUrl: ' https://example.com ' }).originalUrl, 'https://example.com/');
});

test('user response DTO strips password hashes', () => {
 assert.deepEqual(toUserDto({ id: 'id', email: 'a@example.com', role: 'user', is_active: true, is_primary_admin: false, password_hash: 'hidden' }),
  { id: 'id', email: 'a@example.com', role: 'user', isActive: true, isPrimaryAdmin: false });
});

test('authentication without signing configuration fails closed', async () => {
 const service = createAuthService({ codec: createAccessTokenCodec({ jwtSecret: '' }),
  users: { findByEmail: () => assert.fail('Must reject before reading users') } });
 await assert.rejects(service.login({ email: 'a@example.com', password: 'anything' }), { status: 503, code: 'AUTH_NOT_READY' });
});

test('unconfigured CSRF and rate limits never silently allow writes', async () => {
 assert.equal((await errorFrom(createCsrfMiddleware(), { method: 'POST' })).status, 503);
 assert.equal((await errorFrom(createRateLimitMiddleware(), {})).status, 503);
});
