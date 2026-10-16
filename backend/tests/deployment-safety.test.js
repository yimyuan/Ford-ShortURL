import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createProxyClient } from '../src/middleware/proxy-client.js';
import { createLinksCache } from '../src/modules/links/links.cache.js';
import { createLinksService } from '../src/modules/links/links.service.js';
import { createLinksRepository } from '../src/modules/links/links.repository.js';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';
import { createAuthRateLimit } from '../src/middleware/rate-limit.js';
import { proxyRequest } from '../../netlify/edge-functions/backend-proxy.js';
import { withRedisDeadline } from '../src/infrastructure/deadline.js';

const secret = 'test-proxy-secret-'.repeat(3);
const settings = { proxyMode: 'netlify', proxySecret: secret };
const guard = createProxyClient(settings);
const request = (headers = {}, path = '/api/auth/login') => ({
  method: 'POST',
  path,
  get: (name) => headers[name],
});
function check(req, middleware = guard) {
  let failure;
  middleware(req, {}, (error) => {
    failure = error;
  });
  return failure;
}
test('only an authenticated proxy can supply client IP; forwarded-header forgery cannot bypass it', () => {
  assert.equal(check(request({ 'x-forwarded-for': '192.0.2.1' })).code, 'PROXY_REQUIRED');
  assert.equal(
    check(request({ 'x-shorturl-proxy-secret': secret, 'x-shorturl-client-ip': 'bad' })).status,
    403,
  );
  const req = request({ 'x-shorturl-proxy-secret': secret, 'x-shorturl-client-ip': '2001:db8::1' });
  assert.equal(check(req), undefined);
  assert.equal(req.clientIp, '2001:db8::1');
  assert.equal(check({ ...request({}, '/api/health'), method: 'GET' }), undefined);
  assert.equal(check(request(), createProxyClient({ ...settings, proxySecret: '' })).status, 503);
});
test('rate limit separates verified proxy visitors and ignores forged forwarded IPs', async () => {
  const keys = [];
  const limit = createAuthRateLimit('register', {
    settings: { csrfSecret: secret },
    connect: async () => ({
      withCommandOptions() {
        return this;
      },
      eval: async (_script, args) => {
        keys.push(args.keys[0]);
        return 1;
      },
    }),
  });
  for (const ip of ['192.0.2.1', '192.0.2.2', '192.0.2.1']) {
    const req = {
      ...request({ 'x-shorturl-proxy-secret': secret, 'x-shorturl-client-ip': ip }),
      ip: 'proxy-shared',
    };
    assert.equal(check(req), undefined);
    await limit(req, {}, (error) => assert.equal(error, undefined));
  }
  assert.notEqual(keys[0], keys[1]);
  assert.equal(keys[0], keys[2]);
});
test('edge proxy overwrites identity headers, preserves API body/cookies and returns redirects without following them', async () => {
  const req = new Request('https://site.netlify.app/api/links?q=x', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: 'shorturl_access=example',
      'x-shorturl-client-ip': 'evil',
      'x-shorturl-proxy-secret': 'evil',
      'x-forwarded-for': 'evil',
    },
    body: '{"originalUrl":"https://example.com"}',
  });
  const response = await proxyRequest(
    req,
    { ip: '192.0.2.1' },
    {
      backendOrigin: 'https://backend.onrender.com',
      secret,
      fetcher: async (url, options) => {
        assert.equal(url.href, 'https://backend.onrender.com/api/links?q=x');
        assert.equal(options.redirect, 'manual');
        assert.equal(options.headers.get('x-shorturl-client-ip'), '192.0.2.1');
        assert.equal(options.headers.get('x-shorturl-proxy-secret'), secret);
        assert.equal(options.headers.get('x-forwarded-for'), null);
        assert.equal(options.headers.get('cookie'), 'shorturl_access=example');
        assert.equal(
          await new Response(options.body).text(),
          '{"originalUrl":"https://example.com"}',
        );
        return new Response(null, {
          status: 302,
          headers: {
            Location: 'https://example.com/',
            'Set-Cookie': 'shorturl_refresh=test; HttpOnly; Secure; Path=/api/auth',
          },
        });
      },
    },
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.com/');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const failed = await proxyRequest(
    new Request('https://site.netlify.app/r/abc'),
    { ip: '192.0.2.1' },
    {
      backendOrigin: 'https://backend.onrender.com',
      secret,
      fetcher: async () => {
        throw Error('private');
      },
    },
  );
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes('private'));
});
test('nonresponding cache has a bounded fallback; session storage fails closed', async () => {
  const pending = () => new Promise(() => {});
  const cache = createLinksCache(pending, 15);
  const service = createLinksService(
    {
      incrementAndResolve: async () => ({ id: randomUUID(), original_url: 'https://example.com/' }),
    },
    { cache },
  );
  const start = Date.now();
  assert.equal(await service.redirect('abc'), 'https://example.com/');
  assert.ok(Date.now() - start < 1000);
  await assert.rejects(createAuthRepository(pending, 15).findFamily(randomUUID()), {
    status: 503,
    code: 'SESSION_UNAVAILABLE',
  });
  let options;
  const client = {
    withCommandOptions(value) {
      options = value;
      return this;
    },
    get: pending,
  };
  assert.equal(await createLinksCache(async () => client, 15).get('abc'), null);
  assert.ok(options.abortSignal instanceof AbortSignal);
});

test('a late Redis connection cannot execute a write after its deadline', async () => {
  let release;
  let writes = 0;
  const connect = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  await assert.rejects(
    withRedisDeadline(
      connect,
      () => {
        writes++;
      },
      15,
    ),
    /deadline/,
  );
  release({
    withCommandOptions() {
      return this;
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(writes, 0);
});

test('edge proxy preserves both authentication cookie headers', async () => {
  const headers = new Headers();
  headers.append('Set-Cookie', 'shorturl_access=a; HttpOnly; Secure; Path=/api');
  headers.append('Set-Cookie', 'shorturl_refresh=b; HttpOnly; Secure; Path=/api/auth');
  const result = await proxyRequest(
    new Request('https://site.netlify.app/api/auth/login'),
    { ip: '192.0.2.1' },
    {
      backendOrigin: 'https://backend.onrender.com',
      secret,
      fetcher: async () => new Response('{}', { headers }),
    },
  );
  assert.equal(result.headers.getSetCookie().length, 2);
});
test('creation keeps one intent fingerprint across random collision retries and requires a valid HTTP key', async () => {
  const calls = [];
  const requestId = randomUUID();
  const service = createLinksService(
    {
      create: async (input) => {
        calls.push(input);
        if (calls.length === 1) throw { code: 'SHORT_CODE_COLLISION' };
        return { short_code: input.shortCode, click_count: '0' };
      },
    },
    { settings: { publicBaseUrl: 'https://site.example' } },
  );
  await service.create({ id: 'owner' }, { originalUrl: 'https://example.com' }, requestId);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].requestId, requestId);
  assert.equal(calls[0].requestHash, calls[1].requestHash);
  await assert.rejects(
    service.create({ id: 'owner' }, { originalUrl: 'https://example.com' }, ''),
    { code: 'INVALID_IDEMPOTENCY_KEY' },
  );
});
test('creation repository uses atomic RPC and preserves collision, replay, and account errors', async () => {
  const input = {
    userId: 'owner',
    shortCode: 'abc',
    originalUrl: 'https://example.com/',
    requestId: randomUUID(),
    requestHash: 'a'.repeat(64),
  };
  let call;
  const repo = createLinksRepository({
    rpc: (name, args) => {
      call = { name, args };
      return { abortSignal: async () => ({ data: { id: 'link' }, error: null }) };
    },
  });
  assert.deepEqual(await repo.create(input), { id: 'link' });
  assert.equal(call.name, 'create_short_link');
  assert.equal(call.args.p_request_id, input.requestId);
  for (const [error, code] of [
    [{ code: '23505' }, 'SHORT_CODE_COLLISION'],
    [{ message: 'IDEMPOTENCY_CONFLICT' }, 'IDEMPOTENCY_CONFLICT'],
    [{ message: 'REQUEST_LINK_DELETED' }, 'REQUEST_LINK_DELETED'],
    [{ message: 'LINK_CREATE_FORBIDDEN' }, 'LINK_CREATE_FORBIDDEN'],
    [{ message: 'private' }, 'DATABASE_UNAVAILABLE'],
  ]) {
    const broken = createLinksRepository({ rpc: () => ({ abortSignal: async () => ({ error }) }) });
    await assert.rejects(broken.create(input), { code });
  }
});
