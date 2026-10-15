import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { listLinks } from '../src/features/links/api.js';

test('my links sends filters and selected page to the server with literal URL search encoded', async (t) => {
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    const url = new URL(path, 'https://example.com');
    assert.equal(url.searchParams.get('page'), '3');
    assert.equal(url.searchParams.get('query'), 'https://a.test/?x=a,b&y=_%');
    assert.equal(url.searchParams.get('clicks'), 'opened');
    assert.equal(url.searchParams.get('period'), '7d');
    assert.equal(url.searchParams.get('sort'), 'clicks');
    assert.equal(options.credentials, 'include');
    return new Response(JSON.stringify({ items: [], total: 21, page: 3, pageSize: 10 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  assert.equal(
    (
      await listLinks(3, {
        query: 'https://a.test/?x=a,b&y=_%',
        clicks: 'opened',
        period: '7d',
        sort: 'clicks',
      })
    ).page,
    3,
  );
});
test('compact desktop/mobile list keeps both link types clickable and precise clicks visible with a management action', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  try {
    const { default: Table } = await server.ssrLoadModule(
      '/src/features/links/components/MyLinksTable.jsx',
    );
    const link = {
      id: 'id',
      shortCode: 'sale',
      shortUrl: 'https://short.test/r/sale',
      originalUrl: 'https://example.com/very-long-url',
      createdAt: '2026-10-16T00:00:00Z',
      clickCount: '9007199254740993',
    };
    const html = renderToStaticMarkup(createElement(Table, { items: [link], onManage() {} }));
    assert.match(html, /<table/);
    assert.match(html, /href="https:\/\/short.test\/r\/sale"/);
    assert.match(html, /href="https:\/\/example.com\/very-long-url"/);
    assert.match(html, /9,007,199,254,740,993/);
    assert.match(html, /จัดการลิงก์ sale/);
    assert.match(html, /lg:hidden/);
    assert.ok(!html.includes('QR Code'));
  } finally {
    await server.close();
  }
});
