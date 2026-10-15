import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
test('pagination controls are absent through ten records and render accurate first and last pages', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  try {
    const { default: Pagination } = await server.ssrLoadModule('/src/shared/ui/Pagination.jsx');
    const render = (page, total) =>
      renderToStaticMarkup(createElement(Pagination, { page, total, onPageChange() {} }));
    for (const total of [0, 1, 9, 10]) assert.equal(render(1, total), '');
    const first = render(1, 23);
    const last = render(3, 23);
    assert.ok(first.includes('หน้า 1 / 3'));
    assert.ok(first.includes('1–10 จาก 23'));
    assert.ok(last.includes('หน้า 3 / 3'));
    assert.ok(last.includes('21–23 จาก 23'));
    assert.equal((first.match(/<button\b[^>]*\sdisabled=""/g) || []).length, 1);
    assert.equal((last.match(/<button\b[^>]*\sdisabled=""/g) || []).length, 1);
    const eleven = render(1, 11);
    assert.ok(eleven.includes('หน้า 1 / 2'));
  } finally {
    await server.close();
  }
});
