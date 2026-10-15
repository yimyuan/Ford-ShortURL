import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getAdminMetrics } from '../src/features/admin/metrics.js';
import { getAdminSummary } from '../src/features/admin/api.js';
const sample = {
  users: '12',
  admins: '1',
  links: '20',
  clicks: '9007199254740993',
  usersActive: '10',
  usersSuspended: '2',
  linksActive: '12',
  linksDisabled: '5',
  linksOwnerSuspended: '3',
  usersToday: '2',
  linksToday: '4',
  today: '2026-10-16',
  timezone: 'Asia/Bangkok',
};
test('overview renders status and Thai-day summaries without tables and handles loading/empty totals', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  try {
    const { default: Overview } = await server.ssrLoadModule(
      '/src/features/admin/components/AdminOverview.jsx',
    );
    const render = (summary) =>
      renderToStaticMarkup(
        createElement(Overview, { model: { summary, metrics: getAdminMetrics(summary) } }),
      );
    const html = render({ status: 'ready', data: sample });
    assert.ok(!html.includes('<table'));
    assert.ok(!html.includes('รายการล่าสุด'));
    for (const label of [
      'สถานะบัญชี',
      'สถานะลิงก์',
      'บัญชีถูกระงับ',
      'หยุดเพราะเจ้าของถูกระงับ',
      'ข้อมูลวันนี้',
      '16 ตุลาคม 2569',
    ])
      assert.ok(html.includes(label), label);
    const loading = render({ status: 'loading', data: null });
    assert.ok(loading.includes('—'));
    assert.ok(!loading.includes('NaN'));
    const zeros = { ...sample };
    for (const key of Object.keys(zeros))
      if (!['today', 'timezone'].includes(key)) zeros[key] = '0';
    const empty = render({ status: 'ready', data: zeros });
    assert.ok(empty.includes('ยังไม่มีข้อมูลในระบบ'));
    assert.ok(!empty.includes('NaN'));
  } finally {
    await server.close();
  }
});
test('overview API rejects missing status counts and incorrect day metadata', async (t) => {
  let response = { ...sample };
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify(response), { status: 200 }),
  );
  assert.equal((await getAdminSummary()).linksOwnerSuspended, '3');
  response = { ...sample, timezone: 'UTC' };
  await assert.rejects(getAdminSummary(), { code: 'INVALID_RESPONSE' });
  response = { ...sample, usersToday: undefined };
  await assert.rejects(getAdminSummary(), { code: 'INVALID_RESPONSE' });
  response = { ...sample, linksDisabled: '-1' };
  await assert.rejects(getAdminSummary(), { code: 'INVALID_RESPONSE' });
});
