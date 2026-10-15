import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { createAccessTokenCodec } from '../src/security/access-token.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { createOriginGuard } from '../src/middleware/csrf.js';
import { createAuthRateLimit } from '../src/middleware/rate-limit.js';
import { AppError } from '../src/errors/app-error.js';
import { hashPassword } from '../src/security/password.js';

const settings = { jwtSecret: 'test-jwt-secret-'.repeat(4), csrfSecret: 'test-csrf-secret-'.repeat(4),
 jwtIssuer: 'test-api', jwtAudience: 'test-web', accessTokenTtl: 900, refreshTokenTtl: 604800,
 appOrigin: 'http://127.0.0.1:5173', production: false };

function fixture() {
 let time = 100000;
 let databaseError = false;
 const account = { id: randomUUID(), email: 'admin@example.com', password_hash: 'test-hash',
  role: 'admin', is_active: true, is_primary_admin: true, auth_version: 0 };
 const families = new Map();
 const sessions = {
  async createFamily(id, value) { families.set(id, { ...value }); },
  async findFamily(id) { const value = families.get(id); return value ? { ...value } : null; },
  async revokeFamily(id) { families.delete(id); },
  async rotateRefreshToken(id, oldHash, nextHash, now) {
   const value = families.get(id);
   if (!value) return null;
   if (value.refreshHash !== oldHash || value.expiresAt <= now) { families.delete(id); return null; }
   value.refreshHash = nextHash;
   return { ...value };
  }
 };
 const users = {
  async findByEmail(email) { return email === account.email ? { ...account } : null; },
  async findById(id) {
   if (databaseError) throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Database unavailable');
   return id === account.id ? { ...account } : null;
  },
  async create({ email, passwordHash }) { return { ...account, email, password_hash: passwordHash, role: 'user', is_primary_admin: false }; }
 };
 const codec = createAccessTokenCodec(settings, () => time);
 const service = createAuthService({ users, sessions, codec, settings, now: () => time,
  verify: async (password, stored) => password === 'correct-password' && stored === 'test-hash', hash: async () => 'new-hash' });
 return { service, codec, users, sessions, account, families, advance: seconds => { time += seconds; },
  failDatabase: value => { databaseError = value; } };
}

test('login verifies credentials, returns safe account and stores only refresh hashes', async () => {
 const f = fixture();
 for (const input of [{ email: f.account.email, password: 'wrong' }, { email: 'missing@example.com', password: 'correct-password' }]) {
  await assert.rejects(f.service.login(input), { status: 401, code: 'INVALID_LOGIN' });
 }
 assert.equal(f.families.size, 0);
 const login = await f.service.login({ email: f.account.email.toUpperCase(), password: 'correct-password' });
 assert.equal(login.user.role, 'admin');
 assert.equal(login.user.password_hash, undefined);
 assert.equal(login.user.auth_version, undefined);
 assert.equal(JSON.stringify([...f.families.values()]).includes(login.refreshToken), false);
 assert.deepEqual(await f.service.verifyIdentity(login.accessToken), login.user);
});

test('current role, disabled state, auth version, logout and session expiry are enforced', async () => {
 for (const change of ['role', 'disabled', 'version', 'logout', 'expired']) {
  const f = fixture();
  const login = await f.service.login({ email: f.account.email, password: 'correct-password' });
  if (change === 'role') {
   f.account.role = 'user';
   assert.equal((await f.service.verifyIdentity(login.accessToken)).role, 'user');
   continue;
  }
  if (change === 'disabled') f.account.is_active = false;
  if (change === 'version') f.account.auth_version++;
  if (change === 'logout') await f.service.logout({ shorturl_refresh: login.refreshToken });
  if (change === 'expired') f.advance(settings.refreshTokenTtl + 1);
  await assert.rejects(f.service.verifyIdentity(login.accessToken), { status: 401 });
 }
});

test('refresh rotates atomically and reuse of old token revokes access and refresh', async () => {
 const f = fixture();
 const login = await f.service.login({ email: f.account.email, password: 'correct-password' });
 f.advance(settings.accessTokenTtl + 1);
 await assert.rejects(f.service.verifyIdentity(login.accessToken), { status: 401 });
 const refreshed = await f.service.refresh({ shorturl_refresh: login.refreshToken });
 assert.notEqual(refreshed.refreshToken, login.refreshToken);
 assert.equal(refreshed.refreshExpiresAt, login.refreshExpiresAt);
 assert.equal((await f.service.verifyIdentity(refreshed.accessToken)).id, f.account.id);
 await assert.rejects(f.service.refresh({ shorturl_refresh: login.refreshToken }), { status: 401 });
 await assert.rejects(f.service.verifyIdentity(refreshed.accessToken), { status: 401 });
 await assert.rejects(f.service.refresh({ shorturl_refresh: refreshed.refreshToken }), { status: 401 });
});

test('transient database failure does not consume a valid refresh token', async () => {
 const f = fixture();
 const login = await f.service.login({ email: f.account.email, password: 'correct-password' });
 f.failDatabase(true);
 await assert.rejects(f.service.refresh({ shorturl_refresh: login.refreshToken }), { status: 503 });
 f.failDatabase(false);
 const refreshed = await f.service.refresh({ shorturl_refresh: login.refreshToken });
 assert.equal(refreshed.user.id, f.account.id);
});

test('JWT rejects tampering, wrong issuer/audience, expired and unsupported claims', () => {
 const f = fixture();
 const token = f.codec.sign({ userId: f.account.id, sessionId: randomUUID() });
 const [header, payload, signature] = token.split('.');
 assert.throws(() => f.codec.verify(`${header}.${payload}.${signature.slice(0, -1)}A!`), { status: 401 });
 function resign(partial, headerValue = { alg: 'HS256', typ: 'JWT' }) {
  const head = Buffer.from(JSON.stringify(headerValue)).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), ...partial })).toString('base64url');
  return `${head}.${body}.${createHmac('sha256', settings.jwtSecret).update(`${head}.${body}`).digest('base64url')}`;
 }
 for (const claims of [{ iss: 'other' }, { aud: 'other' }, { exp: 99999 }, { iat: 100100 }, { sid: 'invalid' }, { exp: 102000 }]) {
  assert.throws(() => f.codec.verify(resign(claims)), { status: 401 });
 }
 assert.throws(() => f.codec.verify(resign({}, { alg: 'none', typ: 'JWT' })), { status: 401 });
});

test('real scrypt bootstrap hash is accepted by login without rehashing or hardcoded credentials', async () => {
 const user = { id: randomUUID(), email: 'existing@example.com', role: 'admin', is_active: true,
  password_hash: await hashPassword('Existing-password-2026'), auth_version: 0 };
 const f = fixture();
 const service = createAuthService({ users: { findByEmail: async () => user }, sessions: f.sessions, codec: f.codec, settings, now: () => 100000 });
 assert.equal((await service.login({ email: user.email, password: 'Existing-password-2026' })).user.role, 'admin');
 await assert.rejects(service.login({ email: user.email, password: 'not-the-password' }), { code: 'INVALID_LOGIN' });
});

test('registration rejects short passwords and privilege injection, persisting only a password hash', async () => {
 const f = fixture();
 let saved;
 const service = createAuthService({ users: { async create(input) {
  saved = input;
  return { ...f.account, email: input.email, password_hash: input.passwordHash, role: 'user', is_primary_admin: false };
 } }, sessions: f.sessions, codec: f.codec, settings, now: () => 100000 });
 await assert.rejects(service.register({ email: 'new@example.com', password: 'Long-password-2026', role: 'admin' }), { status: 422 });
 await assert.rejects(service.register({ email: 'new@example.com', password: 'short' }), { status: 422, code: 'INVALID_PASSWORD' });
 assert.equal(saved, undefined);
 const result = await service.register({ email: 'NEW@example.com', password: 'Long-password-2026' });
 assert.equal(saved.email, 'new@example.com');
 assert.match(saved.passwordHash, /^scrypt\$/);
 assert.equal(saved.password, undefined);
 assert.equal(result.user.role, 'user');
 assert.equal(result.user.isPrimaryAdmin, false);
 assert.equal(result.user.password_hash, undefined);
});

async function middlewareError(middleware, req) {
 let error;
 await middleware(req, {}, value => { error = value; });
 return error;
}

test('cookie writes reject foreign/missing Origin, form submissions and invalid production origin', async () => {
 const guard = createOriginGuard(settings);
 const req = (origin, contentType = 'application/json') => ({ method: 'POST', get: name => name === 'origin' ? origin : contentType });
 assert.equal(await middlewareError(guard, req(settings.appOrigin)), undefined);
 assert.equal(await middlewareError(guard, req('http://localhost:5173')), undefined);
 for (const request of [req('https://evil.example'), req(undefined), req('null'), req(settings.appOrigin, 'text/plain')]) {
  assert.equal((await middlewareError(guard, request)).status, 403);
 }
 const production = createOriginGuard({ ...settings, production: true, appOrigin: 'https://short.example' });
 assert.equal(await middlewareError(production, req('https://short.example')), undefined);
 assert.equal((await middlewareError(production, req('http://127.0.0.1:5173'))).status, 403);
});

test('Redis rate limiter hashes identifiers and fails closed on storage errors', async () => {
 let query;
 const limit = createAuthRateLimit('login', { settings, connect: async () => ({ eval: async (script, args) => { query = { script, ...args }; return 0; } }) });
 const req = { ip: '192.0.2.1', body: { email: 'private@example.com' } };
 assert.equal((await middlewareError(limit, req)).status, 429);
 assert.equal(JSON.stringify(query).includes(req.ip), false);
 assert.equal(JSON.stringify(query).includes(req.body.email), false);
 assert.ok(query.script.includes("redis.call('EXPIRE'"));
 const unavailable = createAuthRateLimit('login', { settings, connect: async () => { throw new Error('private connection details'); } });
 assert.equal((await middlewareError(unavailable, req)).code, 'RATE_LIMIT_UNAVAILABLE');
});
