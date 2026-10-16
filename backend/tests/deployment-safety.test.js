import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLinksCache } from '../src/modules/links/links.cache.js';
import { createLinksService } from '../src/modules/links/links.service.js';
import { createLinksRepository } from '../src/modules/links/links.repository.js';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';
import { createAuthRateLimit } from '../src/middleware/rate-limit.js';
import { withRedisDeadline } from '../src/infrastructure/deadline.js';

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
  await assert.rejects(createAuthRepository(pending, 15).findSession(randomUUID()), {
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
