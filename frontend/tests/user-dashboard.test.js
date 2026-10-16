import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getUserDashboard, readDashboard } from '../src/features/dashboard/api.js';
import { getRoute, paths } from '../src/app/navigation.js';
const sample = {
  totalLinks: '10',
  totalClicks: '9007199254740993',
  clickedLinks: '1',
  today: '2026-10-16',
  timezone: 'Asia/Bangkok',
  trackingSince: '2026-10-16T01:00:00Z',
  daily: Array.from({ length: 7 }, (_, i) => ({
    day: `2026-10-${10 + i}`,
    clicks: i === 6 ? '2' : null,
  })),
  topLinks: [
    {
      id: 'link',
      shortCode: 'sale-code',
      shortUrl: 'https://short.example/r/sale-code',
      originalUrl: 'https://example.com',
      clickCount: '9007199254740993',
      lastClickedAt: null,
    },
  ],
};

test('user dashboard has a separate route and validates complete ordered Thai-day aggregates', async (t) => {
  assert.equal(paths.dashboard, '#/dashboard');
  assert.equal(getRoute('/dashboard/'), 'dashboard');
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, '/api/dashboard');
    assert.equal(options.credentials, 'omit');
    return new Response(JSON.stringify(sample), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  assert.equal((await getUserDashboard()).totalClicks, '9007199254740993');
  for (const invalid of [
    { ...sample, totalClicks: undefined },
    { ...sample, daily: sample.daily.slice(1) },
    { ...sample, timezone: 'UTC' },
    { ...sample, daily: [...sample.daily].reverse() },
    { ...sample, topLinks: Array(6).fill(sample.topLinks[0]) },
  ]) {
    assert.throws(() => readDashboard(invalid), { code: 'INVALID_RESPONSE' });
  }
});

test('user overview renders true totals, missing-history labels, top links and loading/error states', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  try {
    const { default: Overview } = await server.ssrLoadModule(
      '/src/features/dashboard/components/DashboardOverview.jsx',
    );
    const render = (state) =>
      renderToStaticMarkup(createElement(Overview, { model: { reload() {}, ...state } }));
    const ready = render({ data: sample, loading: false, error: '' });
    assert.match(ready, /ภาพรวมของฉัน/);
    assert.match(ready, /9,007,199,254,740,993/);
    assert.match(ready, /ยังไม่ได้เก็บข้อมูล/);
    assert.match(ready, /sale-code/);
    assert.match(ready, /href="#\/my-links"/);
    assert.match(ready, /ยอดเปิดลิงก์ย้อนหลัง 7 วัน/);
    assert.ok(!ready.includes('NaN'));
    const empty = render({
      data: { ...sample, totalLinks: '0', totalClicks: '0', clickedLinks: '0', topLinks: [] },
      loading: false,
      error: '',
    });
    assert.match(empty, /ยังไม่มีลิงก์ที่ถูกเปิด/);
    const loading = render({ data: null, loading: true, error: '' });
    assert.match(loading, /กำลังโหลดภาพรวม/);
    assert.match(loading, /—/);
    const failed = render({ data: null, loading: false, error: 'โหลดไม่สำเร็จ' });
    assert.match(failed, /role="alert"/);
  } finally {
    await server.close();
  }
});
