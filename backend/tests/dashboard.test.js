import test from 'node:test';
import assert from 'node:assert/strict';
import { createDashboardService } from '../src/modules/dashboard/dashboard.service.js';
import { createDashboardRepository } from '../src/modules/dashboard/dashboard.repository.js';

test('user dashboard requests only the authenticated identity and returns safe precise fields', async () => {
  let actor;
  const service = createDashboardService(
    {
      summary: async (id) => {
        actor = id;
        return {
          totalLinks: '7',
          totalClicks: '9007199254740993',
          clickedLinks: '1',
          today: '2026-10-16',
          timezone: 'Asia/Bangkok',
          trackingSince: '2026-10-16T01:00:00Z',
          daily: [{ day: '2026-10-16', clicks: '2', private: 'hidden' }],
          password_hash: 'hidden',
          topLinks: [
            {
              id: 'link',
              shortCode: 'sale-code',
              originalUrl: 'https://example.com',
              clickCount: '9007199254740993',
              lastClickedAt: null,
              user_id: 'private',
            },
          ],
        };
      },
    },
    { publicBaseUrl: 'https://short.example', production: true },
  );
  const result = await service.summary({ id: 'verified-user' });
  assert.equal(actor, 'verified-user');
  assert.equal(result.totalClicks, '9007199254740993');
  assert.equal(result.topLinks[0].shortUrl, 'https://short.example/r/sale-code');
  assert.equal(result.topLinks[0].user_id, undefined);
  assert.equal(result.password_hash, undefined);
  assert.equal(result.daily[0].private, undefined);
  await assert.rejects(service.summary(null), { status: 401 });
});

test('dashboard repository uses the scoped aggregate RPC and sanitizes database errors', async () => {
  let captured;
  const repo = createDashboardRepository({
    rpc(name, args) {
      captured = { name, args };
      return { abortSignal: async () => ({ data: { totalLinks: '0' }, error: null }) };
    },
  });
  assert.deepEqual(await repo.summary('verified-user'), { totalLinks: '0' });
  assert.deepEqual(captured, { name: 'user_dashboard', args: { p_actor: 'verified-user' } });
  for (const [message, status, code] of [
    ['DASHBOARD_FORBIDDEN', 403, 'DASHBOARD_FORBIDDEN'],
    ['private credentials', 503, 'DATABASE_UNAVAILABLE'],
  ]) {
    const failing = createDashboardRepository({
      rpc: () => ({ abortSignal: async () => ({ error: { message } }) }),
    });
    await assert.rejects(failing.summary('user'), { status, code });
  }
});
